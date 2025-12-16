import { createClient } from '@supabase/supabase-js';
import type { BrandGuidelines } from './types';

/**
 * Get Supabase client for server-side operations
 */
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are missing');
  }
  
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Fetch brand guidelines from database
 */
export async function getBrandGuidelines(brandId: string): Promise<BrandGuidelines | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('brand_guidelines')
    .select('*')
    .eq('brand_id', brandId)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) {
    console.error('Failed to fetch guidelines:', error);
    return null;
  }

  if (!data) {
    console.log(`No approved guidelines found for brand: ${brandId}`);
    return null;
  }

  // Transform database row to BrandGuidelines type
  return {
    id: data.id,
    brandId: data.brand_id,
    status: data.status,
    sourceDocumentId: data.source_document_id,
    voice: data.voice || {},
    copyGuidelines: data.copy_guidelines || {},
    visualGuidelines: data.visual_guidelines || {},
    messaging: data.messaging || {},
    contentGuidelines: data.content_guidelines || {},
    socialMediaGuidelines: data.social_media_guidelines || {},
    logoAssets: data.logo_assets || {},
    rawExtraction: data.raw_extraction,
    extractedAt: data.extracted_at,
    approvedAt: data.approved_at,
  };
}

/**
 * Save extracted guidelines as draft (pending review)
 */
export async function saveGuidelinesAsDraft(
  brandId: string,
  extraction: {
    voice: unknown;
    copyGuidelines: unknown;
    visualGuidelines: unknown;
    messaging: unknown;
    contentGuidelines?: unknown;
    socialMediaGuidelines?: unknown;
    logoAssets?: unknown;
  },
  sourceDocumentId?: string,
  userId?: string
): Promise<{ id: string } | null> {
  const supabase = getSupabase();
  
  const { data, error } = await supabase
    .from('brand_guidelines')
    .upsert({
      brand_id: brandId,
      source_document_id: sourceDocumentId,
      status: 'pending_review',
      voice: extraction.voice,
      copy_guidelines: extraction.copyGuidelines,
      visual_guidelines: extraction.visualGuidelines,
      messaging: extraction.messaging,
      content_guidelines: extraction.contentGuidelines || {},
      social_media_guidelines: extraction.socialMediaGuidelines || {},
      logo_assets: extraction.logoAssets || {},
      raw_extraction: extraction,
      extracted_by: userId,
      extracted_at: new Date().toISOString(),
    }, {
      onConflict: 'brand_id',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to save guidelines:', error);
    return null;
  }

  return { id: data.id };
}

/**
 * Approve guidelines (move from draft to approved)
 */
export async function approveGuidelines(
  guidelinesId: string,
  userId: string | null,
  modifications?: Partial<BrandGuidelines>
): Promise<boolean> {
  const supabase = getSupabase();
  
  const updateData: Record<string, unknown> = {
    status: 'approved',
    approved_by: userId,
    approved_at: new Date().toISOString(),
  };

  // Apply any user modifications
  if (modifications?.voice) updateData.voice = modifications.voice;
  if (modifications?.copyGuidelines) updateData.copy_guidelines = modifications.copyGuidelines;
  if (modifications?.visualGuidelines) updateData.visual_guidelines = modifications.visualGuidelines;
  if (modifications?.messaging) updateData.messaging = modifications.messaging;
  if (modifications?.contentGuidelines) updateData.content_guidelines = modifications.contentGuidelines;
  if (modifications?.socialMediaGuidelines) updateData.social_media_guidelines = modifications.socialMediaGuidelines;
  if (modifications?.logoAssets) updateData.logo_assets = modifications.logoAssets;

  console.log('Updating guidelines with data:', updateData);
  
  const { data, error } = await supabase
    .from('brand_guidelines')
    .update(updateData)
    .eq('id', guidelinesId)
    .select();

  if (error) {
    console.error('Failed to approve guidelines:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return false;
  }

  console.log('Guidelines updated:', data);
  return true;
}

/**
 * Log a brand check for analytics
 */
export async function logBrandCheck(
  brandId: string,
  userId: string | undefined,
  checkType: string,
  content: string,
  result: {
    score: number;
    isCompliant: boolean;
    issues: unknown[];
    suggestions: string[];
  },
  metadata?: {
    modelUsed?: string;
    tokensUsed?: number;
    responseTimeMs?: number;
  }
): Promise<void> {
  const supabase = getSupabase();
  
  await supabase.from('brand_check_logs').insert({
    brand_id: brandId,
    user_id: userId,
    check_type: checkType,
    content_checked: content.substring(0, 10000), // Limit size
    score: result.score,
    is_compliant: result.isCompliant,
    issues: result.issues,
    suggestions: result.suggestions,
    model_used: metadata?.modelUsed,
    tokens_used: metadata?.tokensUsed,
    response_time_ms: metadata?.responseTimeMs,
  });
}
