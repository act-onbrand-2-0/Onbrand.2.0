import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

/**
 * Corvee Schema Generator - Check Job Status
 *
 * GET /api/agents/corvee/status?jobId=xxx
 *
 * Returns the current status and result (if completed) of a job.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId parameter is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch job status
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json(
        {
          error: 'Job not found',
          details: jobError?.message || 'Job does not exist',
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Return job status
    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: job.status,
      agentType: job.agent_type,
      createdAt: job.created_at,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      result: job.result,
      error: job.error,
    });
  } catch (error) {
    console.error('Status check error:', error);

    return NextResponse.json(
      {
        error: 'Failed to check job status',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'STATUS_ERROR',
      },
      { status: 500 }
    );
  }
}

