import { createN8nWebhookHandler } from '@act/auth';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role for webhook handling
);

/**
 * n8n Webhook Handler
 * 
 * Receives callbacks from n8n workflows and logs execution results
 */
export async function POST(request: Request) {
  const handler = createN8nWebhookHandler(
    async (data) => {
      // Log workflow execution
      const { workflow_id, execution_id, status, brand_id, output } = data;

      if (workflow_id && brand_id) {
        // Find the workflow record
        const { data: workflow } = await supabase
          .from('n8n_workflows')
          .select('id')
          .eq('workflow_id', workflow_id)
          .eq('brand_id', brand_id)
          .single();

        if (workflow) {
          // Log execution
          await supabase.from('n8n_workflow_executions').insert({
            workflow_id: workflow.id,
            brand_id,
            n8n_execution_id: execution_id,
            status: status || 'success',
            output_data: output,
            finished_at: new Date().toISOString(),
          });

          // Update workflow trigger count
          await supabase.rpc('increment_workflow_trigger_count', {
            workflow_id: workflow.id,
          });
        }
      }

      console.log('n8n workflow completed:', data);
    },
    async (error) => {
      console.error('n8n webhook error:', error);
    }
  );

  return handler(request);
}

/**
 * GET handler for webhook verification (optional)
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'n8n webhook endpoint is active',
  });
}
