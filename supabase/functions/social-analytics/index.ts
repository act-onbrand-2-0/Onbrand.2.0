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

  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const apiKey = Deno.env.get("SOCIAL_ANALYTICS_KEY");
    const apiUrl = Deno.env.get("GETLATE_API_URL") || "https://api.getlate.dev";

    if (!apiKey) {
      return new Response("Missing SOCIAL_ANALYTICS_KEY", {
        status: 500,
        headers: corsHeaders,
      });
    }

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

    // Parse request body for POST, or use query params for GET
    let requestData: any = {};
    if (req.method === "POST") {
      requestData = await req.json();
    } else {
      const url = new URL(req.url);
      requestData = {
        endpoint: url.searchParams.get("endpoint") || "metrics",
        brand_id: url.searchParams.get("brand_id"),
      };
    }

    const { endpoint = "metrics", brand_id, ...params } = requestData;

    if (!brand_id) {
      return new Response("Missing brand_id", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Call getlate.dev API
    const getLateUrl = `${apiUrl}/v1/${endpoint}`;
    const response = await fetch(getLateUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GetLate API error: ${errorText}`);
    }

    const data = await response.json();

    // Optionally store analytics data in database
    if (req.method === "POST" && params.store) {
      await supabase.from("social_analytics").insert({
        brand_id,
        data,
        fetched_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        brand_id,
        data,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Social analytics error:", error);
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
