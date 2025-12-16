import { extractTextFromPdfBuffer, chunkTextForAI } from '@/lib/ai/pdf-extractor';
import { extractGuidelines } from '@/lib/ai/agent';
import { saveGuidelinesAsDraft } from '@/lib/ai/guidelines-db';
import { extractLogosFromPdfWithVision } from '@/lib/ai/vision-extractor';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// For large file uploads, increase the body size limit
export const maxDuration = 60; // 60 seconds timeout for AI processing

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are missing');
  }
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * POST /api/brands/[brandId]/guidelines/upload
 * 
 * Upload a PDF brand guidelines document, extract text, and process with AI
 * 
 * This is a multi-step process:
 * 1. Upload PDF to Supabase Storage
 * 2. Extract text from PDF
 * 3. Use AI to extract structured guidelines
 * 4. Save as draft for user review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    
    if (!brandId) {
      return NextResponse.json(
        { error: 'brandId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verify brand exists
    const { data: brand, error: brandError } = await supabase
      .from('brands')
      .select('id, display_name')
      .eq('id', brandId)
      .single();

    if (brandError || !brand) {
      return NextResponse.json(
        { error: `Brand '${brandId}' not found` },
        { status: 404 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const documentName = formData.get('name') as string || 'Brand Guidelines';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const fileName = `${brandId}/${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('brand-documents')
      .upload(fileName, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('brand-documents')
      .getPublicUrl(fileName);

    // Create document record
    const { data: document, error: docError } = await supabase
      .from('brand_documents')
      .insert({
        brand_id: brandId,
        name: documentName,
        description: `Brand guidelines uploaded on ${new Date().toLocaleDateString()}`,
        file_url: urlData.publicUrl,
        file_type: 'pdf',
        file_size: buffer.length,
        status: 'processing',
      })
      .select('id')
      .single();

    if (docError || !document) {
      console.error('Document record error:', docError);
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      );
    }

    // Extract text from PDF
    console.log(`Extracting text from PDF for brand: ${brandId}`);
    let extractedText: string;
    let pageCount: number;

    try {
      const extraction = await extractTextFromPdfBuffer(buffer);
      extractedText = extraction.text;
      pageCount = extraction.pageCount;
      
      console.log(`Extracted ${extractedText.length} characters from ${pageCount} pages`);
    } catch (extractError) {
      // Update document status to failed
      await supabase
        .from('brand_documents')
        .update({ 
          status: 'failed', 
          processing_error: String(extractError) 
        })
        .eq('id', document.id);

      return NextResponse.json(
        { error: 'Failed to extract text from PDF', details: String(extractError) },
        { status: 500 }
      );
    }

    // Chunk text if too large for AI
    const chunks = chunkTextForAI(extractedText, 12000);
    console.log(`Split into ${chunks.length} chunks for processing`);

    // Extract guidelines using AI (use first chunk if multiple)
    // For very large documents, we process the main content
    const contentToProcess = chunks.length > 1 
      ? chunks.slice(0, 2).join('\n\n---\n\n')  // First 2 chunks
      : extractedText;

    console.log(`Processing ${contentToProcess.length} characters with AI`);
    
    // Extract guidelines and logos in parallel
    const [guidelines, extractedLogos] = await Promise.all([
      extractGuidelines(contentToProcess, brand.display_name),
      extractLogosFromPdfWithVision(buffer, 5).catch(err => {
        console.warn('Logo extraction failed:', err);
        return []; // Continue even if logo extraction fails
      }),
    ]);

    if (guidelines.confidence === 0) {
      await supabase
        .from('brand_documents')
        .update({ 
          status: 'failed', 
          processing_error: 'AI failed to extract guidelines from document' 
        })
        .eq('id', document.id);

      return NextResponse.json(
        { error: 'Failed to extract guidelines from document content' },
        { status: 500 }
      );
    }

    // Prepare logo assets from extracted logos
    const logoAssets = extractedLogos.length > 0 ? {
      primaryLogo: extractedLogos.find(l => l.isMainLogo) ? {
        description: extractedLogos.find(l => l.isMainLogo)?.description,
        colorVersions: extractedLogos
          .filter(l => l.isMainLogo && l.colorScheme)
          .map(l => l.colorScheme!),
      } : undefined,
      alternativeLogos: extractedLogos
        .filter(l => !l.isMainLogo)
        .map(l => ({
          name: `Logo from page ${l.pageNumber}`,
          description: l.description,
          usage: `Found at ${l.location}`,
        })),
      extractedImages: extractedLogos.map(l => ({
        pageNumber: l.pageNumber,
        description: l.description,
        location: l.location,
      })),
    } : undefined;

    console.log(`Extracted ${extractedLogos.length} logos from PDF`);

    // Save extracted guidelines as draft
    const saved = await saveGuidelinesAsDraft(
      brandId,
      {
        voice: guidelines.voice,
        copyGuidelines: guidelines.copyGuidelines,
        visualGuidelines: guidelines.visualGuidelines,
        messaging: guidelines.messaging,
        contentGuidelines: guidelines.contentGuidelines,
        socialMediaGuidelines: guidelines.socialMediaGuidelines,
        logoAssets: logoAssets || guidelines.logoAssets,
      },
      document.id
    );

    // Update document status
    await supabase
      .from('brand_documents')
      .update({
        status: 'processed',
        extracted_data: guidelines,
        processed_at: new Date().toISOString(),
      })
      .eq('id', document.id);

    return NextResponse.json({
      success: true,
      documentId: document.id,
      guidelinesId: saved?.id,
      extraction: {
        pageCount,
        textLength: extractedText.length,
        confidence: guidelines.confidence,
        voice: guidelines.voice,
        copyGuidelines: guidelines.copyGuidelines,
        visualGuidelines: guidelines.visualGuidelines,
        messaging: guidelines.messaging,
        suggestions: guidelines.suggestions,
      },
      message: 'Guidelines extracted successfully. Please review and approve.',
      nextStep: `/api/brands/${brandId}/guidelines/approve`,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process upload', details: String(error) },
      { status: 500 }
    );
  }
}
