import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Missing authorization", {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    
    if (!user) {
      return new Response("Unauthorized", {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { brand_id, workflow_type, workflow_name, data } = await req.json();

    if (!brand_id || (!workflow_type && !workflow_name)) {
      return new Response("Missing brand_id or workflow identifier", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Find the workflow
    let query = supabase
      .from("n8n_workflows")
      .select("*")
      .eq("brand_id", brand_id)
      .eq("is_active", true);

    if (workflow_type) {
      query = query.eq("workflow_type", workflow_type);
    } else if (workflow_name) {
      query = query.eq("workflow_name", workflow_name);
    }

    const { data: workflow, error: workflowError } = await query.single();

    if (workflowError || !workflow) {
      return new Response("Workflow not found or not active", {
        status: 404,
        headers: corsHeaders,
      });
    }

    // Trigger the workflow
    const n8nApiKey = Deno.env.get("N8N_API_KEY");
    const webhookResponse = await fetch(workflow.webhook_url, {
      method: workflow.webhook_method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...(n8nApiKey && { "X-N8N-API-KEY": n8nApiKey }),
      },
      body: JSON.stringify({
        brand_id,
        workflow_id: workflow.workflow_id,
        data,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Workflow trigger failed: ${await webhookResponse.text()}`);
    }

    const result = await webhookResponse.json();

    // Update workflow stats
    await supabase
      .from("n8n_workflows")
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: workflow.trigger_count + 1,
      })
      .eq("id", workflow.id);

    // Log execution start
    await supabase.from("n8n_workflow_executions").insert({
      workflow_id: workflow.id,
      brand_id,
      n8n_execution_id: result.executionId || null,
      status: "running",
      input_data: data,
      started_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        workflow: {
          id: workflow.id,
          name: workflow.workflow_name,
          type: workflow.workflow_type,
        },
        execution_id: result.executionId,
        result,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Trigger workflow error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
