import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ brandId: string }> }
) {
  try {
    const { brandId } = await params;
    const body = await request.json();
    const { guidelines } = body;

    if (!guidelines) {
      return NextResponse.json(
        { error: 'Guidelines data is required' },
        { status: 400 }
      );
    }

    // Update the guidelines in the database
    const { data, error } = await supabase
      .from('brand_guidelines')
      .update({
        voice: guidelines.voice,
        copy_guidelines: guidelines.copy_guidelines,
        visual_guidelines: guidelines.visual_guidelines,
        messaging: guidelines.messaging,
        updated_at: new Date().toISOString(),
      })
      .eq('brand_id', brandId)
      .eq('status', 'approved')
      .select()
      .single();

    if (error) {
      console.error('Error updating guidelines:', error);
      return NextResponse.json(
        { error: 'Failed to update guidelines' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      guidelines: data,
    });
  } catch (error) {
    console.error('Error in update endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
