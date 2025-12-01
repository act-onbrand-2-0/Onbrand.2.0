import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Trigger an n8n workflow by looking up its webhook URL from the database
 * 
 * POST /api/n8n/trigger
 * {
 *   "brand_id": "acme",
 *   "workflow_type": "content_generation",
 *   "data": { ... }
 * }
 */
export async function POST(request: Request) {
  try {
    const { brand_id, workflow_type, workflow_name, data } = await request.json();

    // Find the workflow in the database
    let query = supabase
      .from('n8n_workflows')
      .select('*')
      .eq('brand_id', brand_id)
      .eq('is_active', true);

    // Search by type or name
    if (workflow_type) {
      query = query.eq('workflow_type', workflow_type);
    } else if (workflow_name) {
      query = query.eq('workflow_name', workflow_name);
    }

    const { data: workflow, error } = await query.single();

    if (error || !workflow) {
      return NextResponse.json(
        { error: 'Workflow not found or not active' },
        { status: 404 }
      );
    }

    // Trigger the workflow using its specific webhook URL
    const response = await fetch(workflow.webhook_url, {
      method: workflow.webhook_method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_API_KEY && {
          'X-N8N-API-KEY': process.env.N8N_API_KEY,
        }),
      },
      body: JSON.stringify({
        brand_id,
        workflow_id: workflow.workflow_id,
        data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Workflow trigger failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Update trigger count and last triggered time
    await supabase
      .from('n8n_workflows')
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: workflow.trigger_count + 1,
      })
      .eq('id', workflow.id);

    // Log the execution start
    await supabase.from('n8n_workflow_executions').insert({
      workflow_id: workflow.id,
      brand_id,
      n8n_execution_id: result.executionId || null,
      status: 'running',
      input_data: data,
      started_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      workflow: {
        id: workflow.id,
        name: workflow.workflow_name,
        type: workflow.workflow_type,
      },
      execution_id: result.executionId,
      result,
    });
  } catch (error) {
    console.error('Error triggering n8n workflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to trigger workflow',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * List available workflows for a brand
 * 
 * GET /api/n8n/trigger?brand_id=acme
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const brand_id = searchParams.get('brand_id');

    if (!brand_id) {
      return NextResponse.json(
        { error: 'brand_id is required' },
        { status: 400 }
      );
    }

    const { data: workflows, error } = await supabase
      .from('n8n_workflows')
      .select('*')
      .eq('brand_id', brand_id)
      .eq('is_active', true)
      .order('workflow_name');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      brand_id,
      workflows: workflows.map((w) => ({
        id: w.id,
        name: w.workflow_name,
        type: w.workflow_type,
        description: w.description,
        trigger_count: w.trigger_count,
        last_triggered_at: w.last_triggered_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workflows' },
      { status: 500 }
    );
  }
}
