import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * GET /api/debug/guidelines
 * 
 * Debug endpoint to check brand_guidelines table
 */
export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase credentials missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all guidelines
    const { data: allGuidelines, error: allError } = await supabase
      .from('brand_guidelines')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      return NextResponse.json(
        { error: 'Failed to fetch guidelines', details: allError },
        { status: 500 }
      );
    }

    // Get count by status
    const { data: statusCounts, error: countError } = await supabase
      .from('brand_guidelines')
      .select('brand_id, status');

    const grouped = statusCounts?.reduce((acc: any, item: any) => {
      const key = `${item.brand_id}_${item.status}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      total: allGuidelines?.length || 0,
      guidelines: allGuidelines,
      statusCounts: grouped,
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error },
      { status: 500 }
    );
  }
}
