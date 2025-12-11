import { generateText, generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const { prompt, mode = "text", brandId } = await req.json();

    if (mode === "object") {
      const schema = z.object({
        title: z.string(),
        description: z.string(),
        tags: z.array(z.string()),
      });

      // @ts-expect-error - AI SDK version mismatch
      const result = await generateObject({
        model: openai("gpt-4o-mini"),
        schema,
        prompt,
      });

      return Response.json(result);
    }

    // @ts-expect-error - AI SDK version mismatch
    const result = await generateText({
      model: openai("gpt-4o-mini"),
      prompt,
      system: `You are a helpful AI assistant for brand management.
      Brand ID: ${brandId || "default"}
      Provide accurate and helpful responses.`,
    });

    return Response.json({ text: result.text });
  } catch (error) {
    console.error("AI API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

