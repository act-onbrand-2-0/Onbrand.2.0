import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const runtime = 'nodejs';

/**
 * Budget Planning - Initiate Job
 *
 * POST /api/agents/budget/initiate
 * Body: FormData with 'file' (PDF) and 'brandId' fields
 *
 * Returns immediately with job ID. Use /api/agents/budget/status?jobId=xxx to poll for results.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse FormData from request
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const brandId = formData.get('brandId') as string | null;

    // Validate file exists
    if (!file) {
      return NextResponse.json(
        {
          error: 'No file provided',
          details: 'Please upload a PDF briefing file',
          code: 'MISSING_FILE',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        {
          error: 'Invalid file type',
          details: 'Only PDF files are accepted',
          code: 'INVALID_FILE_TYPE',
        },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large',
          details: 'Maximum file size is 10MB',
          code: 'FILE_TOO_LARGE',
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
        agent_type: 'budget',
        status: 'pending',
        input_data: { fileName: file.name, fileSize: file.size },
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
    processBudgetJob(job.id, file).catch(console.error);

    // Return immediately with job ID
    return NextResponse.json({
      success: true,
      jobId: job.id,
      status: 'pending',
      message: 'Job created. Use /api/agents/budget/status?jobId=' + job.id + ' to check status.',
    });
  } catch (error) {
    console.error('Budget initiate error:', error);

    return NextResponse.json(
      {
        error: 'Failed to initiate budget generation',
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
async function processBudgetJob(jobId: string, file: File) {
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
    const webhookUrl = process.env.N8N_BUDGET_WEBHOOK_URL;

    if (!webhookUrl) {
      throw new Error('N8N_BUDGET_WEBHOOK_URL not configured');
    }

    // Create FormData for n8n
    const forwardFormData = new FormData();
    forwardFormData.append('file', file, file.name);

    // Call n8n webhook (can take as long as needed)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        ...(process.env.N8N_API_KEY && {
          'X-N8N-API-KEY': process.env.N8N_API_KEY,
        }),
      },
      body: forwardFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook failed: ${response.statusText} - ${errorText}`);
    }

    // Handle response
    const contentType = response.headers.get('content-type') || '';
    let budget: string;

    if (contentType.includes('application/json')) {
      const data = await response.json();
      budget = data.text || data.budget || data.result || JSON.stringify(data, null, 2);
    } else {
      budget = await response.text();
    }

    // Store successful result
    await supabase
      .from('agent_jobs')
      .update({
        status: 'completed',
        result: { budget, fileName: file.name },
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

