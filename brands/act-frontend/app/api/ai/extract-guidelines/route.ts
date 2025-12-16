import { extractGuidelines } from '@/lib/ai/agent';
import { saveGuidelinesAsDraft } from '@/lib/ai/guidelines-db';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/ai/extract-guidelines
 * 
 * Extract brand guidelines from an uploaded document
 * 
 * Request body:
 * {
 *   brandId: string;
 *   documentId: string;  // Reference to brand_documents table
 *   documentContent: string;  // Extracted text from PDF
 *   brandName: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { brandId, documentId, documentContent, brandName } = await request.json();

    if (!brandId || !documentContent || !brandName) {
      return NextResponse.json(
        { error: 'brandId, documentContent, and brandName are required' },
        { status: 400 }
      );
    }

    if (documentContent.length < 100) {
      return NextResponse.json(
        { error: 'Document content seems too short. Please ensure the PDF was extracted properly.' },
        { status: 400 }
      );
    }

    // Extract guidelines using AI
    console.log(`Extracting guidelines for brand: ${brandName}`);
    const extraction = await extractGuidelines(documentContent, brandName);

    if (extraction.confidence === 0) {
      return NextResponse.json(
        { error: 'Failed to extract guidelines from document. Please try again.' },
        { status: 500 }
      );
    }

    // Save as draft for user review
    const saved = await saveGuidelinesAsDraft(
      brandId,
      {
        voice: extraction.voice,
        copyGuidelines: extraction.copyGuidelines,
        visualGuidelines: extraction.visualGuidelines,
        messaging: extraction.messaging,
      },
      documentId
    );

    if (!saved) {
      return NextResponse.json(
        { error: 'Failed to save extracted guidelines' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      guidelinesId: saved.id,
      extraction: {
        voice: extraction.voice,
        copyGuidelines: extraction.copyGuidelines,
        visualGuidelines: extraction.visualGuidelines,
        messaging: extraction.messaging,
        suggestions: extraction.suggestions,
        confidence: extraction.confidence,
      },
      message: 'Guidelines extracted and saved as draft. Please review and approve.',
    });

  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract guidelines', details: String(error) },
      { status: 500 }
    );
  }
}
