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

    const { document_id, brand_id, content } = await req.json();

    if (!document_id || !brand_id || !content) {
      return new Response("Missing required fields", {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Chunk the content
    const chunkSize = 1000;
    const overlap = 200;
    const chunks: string[] = [];
    let start = 0;

    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      chunks.push(content.slice(start, end));
      start = end - overlap;
    }

    // Generate embeddings for each chunk
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response("Missing OPENAI_API_KEY", {
        status: 500,
        headers: corsHeaders,
      });
    }

    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      // Call OpenAI embeddings API
      const embeddingResponse = await fetch(
        "https://api.openai.com/v1/embeddings",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: chunk,
          }),
        }
      );

      if (!embeddingResponse.ok) {
        throw new Error(`OpenAI API error: ${await embeddingResponse.text()}`);
      }

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;

      embeddings.push({
        brand_id,
        document_id,
        chunk_index: i,
        content: chunk,
        content_length: chunk.length,
        embedding,
      });
    }

    // Insert embeddings into database
    const { error: insertError } = await supabase
      .from("document_embeddings")
      .insert(embeddings);

    if (insertError) {
      throw new Error(`Database error: ${insertError.message}`);
    }

    // Update document status
    const { error: updateError } = await supabase
      .from("brand_documents")
      .update({
        is_indexed: true,
        chunk_count: chunks.length,
        status: "processed",
        processed_at: new Date().toISOString(),
      })
      .eq("id", document_id);

    if (updateError) {
      throw new Error(`Update error: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        chunk_count: chunks.length,
        document_id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Process document error:", error);
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
