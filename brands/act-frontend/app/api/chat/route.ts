// @ts-nocheck - Prevent OpenAI init errors during build
import { streamText, convertToCoreMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getWorkspaceFromSubdomain } from "@/lib/workspaces";
import { createAdminClient } from "@/lib/supabase/admin";

// Tell Next.js this is a dynamic API route
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Node runtime to allow Supabase Auth via cookies
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    console.log("[Chat API] Request received");
    
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("[Chat API] ANTHROPIC_API_KEY not set");
      return new Response("ANTHROPIC_API_KEY not configured", { status: 500 });
    }
    
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      console.log("[Chat API] Auth failed:", authError?.message);
      return new Response("Unauthorized", { status: 401 });
    }
    const userId = authData.user.id;
    console.log("[Chat API] Authenticated user:", userId);

    const { id, messages, title } = await req.json();
    console.log("[Chat API] Parsed body, messages:", messages?.length);
    console.log("[Chat API] First message:", JSON.stringify(messages[0]));
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log("[Chat API] Invalid messages array");
      return new Response("Invalid messages", { status: 400 });
    }
    
    // For AI SDK v5, we need to ensure messages are in CoreMessage format
    // If they're already simple {role, content} objects, use them directly
    let coreMessages;
    try {
      coreMessages = convertToCoreMessages(messages);
      console.log("[Chat API] Converted to core messages:", coreMessages.length);
    } catch (e: any) {
      console.log("[Chat API] convertToCoreMessages failed, using messages as-is:", e.message);
      // If conversion fails, messages are likely already in core format
      coreMessages = messages.map((m: any) => ({
        role: m.role,
        content: m.content || m.text || "",
      }));
    }

    const workspace = await getWorkspaceFromSubdomain();
    console.log("[Chat API] Got workspace:", workspace.id);

    // Ensure current user is a member of the workspace; if not, auto-enroll (dev convenience)
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace.id)
      .maybeSingle();
    if (!membership) {
      const admin = createAdminClient();
      await admin
        .from("workspace_members")
        .insert({ workspace_id: workspace.id, user_id: userId, role: "member" })
        .select("id")
        .maybeSingle();
    }

    // Ensure chat exists (create if missing)
    let chatId = id as string | undefined;
    if (!chatId) {
      // Safely derive a title from the latest user message
      const lastMessage: any = messages[messages.length - 1];
      const userMessage: any =
        messages
          .slice()
          .reverse()
          .find((m: any) => m.role === "user") ?? lastMessage ?? null;
      const userTextCandidate =
        userMessage?.content ??
        userMessage?.text ??
        (Array.isArray(userMessage?.parts)
          ? userMessage.parts.find((p: any) => p?.type === "text")?.text ??
            undefined
          : undefined);
      const chatTitle =
        title ||
        (typeof userTextCandidate === "string" && userTextCandidate.length > 0
          ? userTextCandidate.slice(0, 80)
          : "New Chat");
      const { data: chatInsert, error: chatErr } = await supabase
        .from("chats")
        .insert({
          user_id: userId,
          workspace_id: workspace.id,
          title: chatTitle,
        })
        .select("id")
        .single();
      if (chatErr) {
        return new Response(`Failed to create chat: ${chatErr.message}`, {
          status: 500,
        });
      }
      chatId = chatInsert.id;
    }

    // Persist the latest user message
    const lastUserCore =
      [...coreMessages].reverse().find((m: any) => m.role === "user") ??
      null;
    if (lastUserCore?.content) {
      const text =
        Array.isArray(lastUserCore.content)
          ? lastUserCore.content
              .filter((p: any) => p?.type === "text")
              .map((p: any) => p.text)
              .join("")
          : typeof lastUserCore.content === "string"
          ? (lastUserCore.content as string)
          : "";
      if (text) {
        await supabase.from("messages").insert({
          chat_id: chatId,
          role: "user",
          content: text,
        });
      }
    }

    console.log("[Chat API] Starting AI stream with", coreMessages.length, "messages");
    const result = await streamText({
      model: anthropic("claude-3-5-sonnet-20241022"),
      messages: coreMessages,
      onFinish: async ({ text }) => {
        console.log("[Chat API] Stream finished, saving assistant message");
        // Save assistant message and update chat timestamp
        await supabase
          .from("messages")
          .insert({ chat_id: chatId, role: "assistant", content: text });
        await supabase
          .from("chats")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", chatId);
      },
    });

    console.log("[Chat API] Returning stream response");
    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

