import { getBrandGuidelines } from '@/lib/ai/guidelines-db';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.');
  }
  return createClient(supabaseUrl, supabaseKey);
}

/**
 * GET /api/brands/[brandId]/guidelines
 * 
 * Get the approved brand guidelines for a specific brand
 * This is the main endpoint for fetching guidelines used by the AI agent
 */
export async function GET(
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

    // Fetch approved guidelines
    const guidelines = await getBrandGuidelines(brandId);

    if (!guidelines) {
      // Check if there are any guidelines at all (draft, pending)
      const supabase = getSupabase();
      const { data: pending } = await supabase
        .from('brand_guidelines')
        .select('id, status, extracted_at')
        .eq('brand_id', brandId)
        .single();

      if (pending) {
        return NextResponse.json({
          success: false,
          hasGuidelines: true,
          status: pending.status,
          message: `Guidelines exist but are in '${pending.status}' status. Please approve them first.`,
          approveUrl: `/api/brands/${brandId}/guidelines/approve`,
        }, { status: 202 });
      }

      return NextResponse.json({
        success: false,
        hasGuidelines: false,
        message: 'No brand guidelines found. Please upload a brand guidelines document.',
        uploadUrl: `/api/brands/${brandId}/guidelines/upload`,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      guidelines,
    });

  } catch (error) {
    console.error('Get guidelines error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch brand guidelines' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/brands/[brandId]/guidelines
 * 
 * Archive the current brand guidelines (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const supabase = getSupabase();

    const { error } = await supabase
      .from('brand_guidelines')
      .update({ status: 'archived' })
      .eq('brand_id', brandId)
      .eq('status', 'approved');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to archive guidelines' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Brand guidelines archived',
    });

  } catch (error) {
    console.error('Delete guidelines error:', error);
    return NextResponse.json(
      { error: 'Failed to archive brand guidelines' },
      { status: 500 }
    );
  }
}
