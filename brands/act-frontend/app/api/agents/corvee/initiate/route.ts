import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

/**
 * Corvee Schema Generator - Initiate Job
 *
 * POST /api/agents/corvee/initiate
 * Body: { weekStart: "2026-01-06", brandId: "uuid" }
 *
 * Returns immediately with job ID. Use /api/agents/corvee/status?jobId=xxx to poll for results.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate the request body
    const body = await request.json();
    const { weekStart, brandId } = body;

    // Validate weekStart format (YYYY-MM-DD)
    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json(
        {
          error: 'Invalid weekStart format',
          details: 'Expected YYYY-MM-DD format (e.g., 2026-01-06)',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    // Validate that weekStart is a Monday
    const date = new Date(weekStart);
    if (date.getDay() !== 1) {
      return NextResponse.json(
        {
          error: 'weekStart must be a Monday',
          details: 'The corvee schema is generated for a full work week starting Monday',
          code: 'INVALID_INPUT',
        },
        { status: 400 }
      );
    }

    if (!brandId) {
      return NextResponse.json(
        { error: 'brandId is required', code: 'INVALID_INPUT' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role to create job
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create a job record
    const { data: job, error: jobError } = await supabase
      .from('agent_jobs')
      .insert({
        brand_id: brandId,
        agent_type: 'corvee',
        status: 'pending',
        input_data: { weekStart },
        created_by: null, // Will be set by auth.uid() in RLS, or null for service role
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create job:', jobError);
      console.error('Job error details:', {
        message: jobError?.message,
        details: jobError?.details,
        hint: jobError?.hint,
        code: jobError?.code,
      });
      return NextResponse.json(
        {
          error: 'Failed to create job',
          details: jobError?.message || 'Unknown error',
          hint: jobError?.hint || 'The agent_jobs table may not exist. Run the database migration first.',
          code: 'DATABASE_ERROR',
        },
        { status: 500 }
      );
    }

    // Trigger background processing (fire and forget)
    // We don't await this - it runs in the background
    processCorveeJob(job.id, weekStart).catch(console.error);

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'pending',
      message: 'Job created. Use /api/agents/corvee/status?jobId=' + job.id + ' to check status.',
    });
  } catch (error) {
    console.error('Corvee initiate error:', error);

    return NextResponse.json(
      {
        error: 'Failed to initiate corvee generation',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: 'INITIATE_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * Background job processor - runs async without blocking the response
 */
async function processCorveeJob(jobId: string, weekStart: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Update status to processing
    await supabase
      .from('agent_jobs')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', jobId);

    // Get the n8n webhook URL
    const webhookUrl = process.env.N8N_CORVEE_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('N8N_CORVEE_WEBHOOK_URL not configured');
    }

    // Call n8n webhook (can take as long as needed)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_API_KEY && {
          'X-N8N-API-KEY': process.env.N8N_API_KEY,
        }),
      },
      body: JSON.stringify({ weekStart }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook failed: ${response.statusText} - ${errorText}`);
    }

    // Handle response
    const contentType = response.headers.get('content-type') || '';
    let schema: string;

    if (contentType.includes('application/json')) {
      const data = await response.json();
      schema = data.text || data.schema || data.result || JSON.stringify(data, null, 2);
    } else {
      schema = await response.text();
    }

    // Store successful result
    await supabase
      .from('agent_jobs')
      .update({
        status: 'completed',
        result: { schema, weekStart },
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    console.log(`Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);

    // Store error
    await supabase
      .from('agent_jobs')
      .update({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}

