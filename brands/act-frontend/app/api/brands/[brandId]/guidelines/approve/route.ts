import { approveGuidelines } from '@/lib/ai/guidelines-db';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are missing');
  }
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET /api/brands/[brandId]/guidelines/approve
 * 
 * Get the current draft guidelines for review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('brand_guidelines')
      .select('*')
      .eq('brand_id', brandId)
      .in('status', ['draft', 'pending_review'])
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'No pending guidelines found for review' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      guidelines: {
        id: data.id,
        brandId: data.brand_id,
        status: data.status,
        voice: data.voice,
        copyGuidelines: data.copy_guidelines,
        visualGuidelines: data.visual_guidelines,
        messaging: data.messaging,
        extractedAt: data.extracted_at,
        rawExtraction: data.raw_extraction,
      },
    });

  } catch (error) {
    console.error('Get guidelines error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guidelines' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/brands/[brandId]/guidelines/approve
 * 
 * Approve (with optional modifications) the extracted guidelines
 * 
 * Request body:
 * {
 *   guidelinesId: string;
 *   modifications?: {
 *     voice?: {...},
 *     copyGuidelines?: {...},
 *     visualGuidelines?: {...},
 *     messaging?: {...}
 *   }
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const { guidelinesId, modifications } = await request.json();

    if (!guidelinesId) {
      return NextResponse.json(
        { error: 'guidelinesId is required' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Verify guidelines belong to this brand
    const { data: existing, error: fetchError } = await supabase
      .from('brand_guidelines')
      .select('id, brand_id, status')
      .eq('id', guidelinesId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Guidelines not found' },
        { status: 404 }
      );
    }

    if (existing.brand_id !== brandId) {
      return NextResponse.json(
        { error: 'Guidelines do not belong to this brand' },
        { status: 403 }
      );
    }

    if (existing.status === 'approved') {
      return NextResponse.json(
        { error: 'Guidelines are already approved' },
        { status: 400 }
      );
    }

    // Approve with optional modifications
    // TODO: Get actual user ID from auth - for now pass null
    const userId: string | null = null;
    
    console.log('Approving guidelines:', { guidelinesId, brandId, userId, modifications });
    
    const success = await approveGuidelines(guidelinesId, userId, modifications);

    if (!success) {
      console.error('Approval failed for guidelines:', guidelinesId);
      return NextResponse.json(
        { error: 'Failed to approve guidelines' },
        { status: 500 }
      );
    }

    console.log('Guidelines approved successfully:', guidelinesId);

    return NextResponse.json({
      success: true,
      message: 'Brand guidelines approved and activated',
      guidelinesId,
      brandId,
    });

  } catch (error) {
    console.error('Approve error:', error);
    return NextResponse.json(
      { error: 'Failed to approve guidelines' },
      { status: 500 }
    );
  }
}
