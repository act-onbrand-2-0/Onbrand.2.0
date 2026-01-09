import { streamText, stepCountIs } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// MCP imports are conditionally loaded to prevent build errors
import type { MCPServerConfig, MCPConnectionStatus } from '@/lib/mcp/types';

// Tell Next.js this is a dynamic API route
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Use Node.js runtime for PDF extraction support
export const runtime = "nodejs";

// Create Supabase client for fetching project files (using service role to bypass RLS)
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// Fetch enabled MCP servers for a brand, optionally filtered by specific server IDs
async function getMCPServers(brandId: string, serverIds?: string[]): Promise<MCPServerConfig[]> {
  try {
    const supabase = getSupabaseClient();
    
    // Start building the query
    let query = supabase
      .from('mcp_servers')
      .select('*')
      .eq('brand_id', brandId)
      .eq('enabled', true);
    
    // If specific server IDs are provided, filter by them
    if (serverIds && serverIds.length > 0) {
      query = query.in('id', serverIds);
    }
    
    const { data, error } = await query.order('priority', { ascending: false });

    if (error) {
      console.error('Failed to fetch MCP servers:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    return [];
  }
}

// Connect to MCP servers and get their tools
async function getMCPTools(brandId: string, serverIds?: string[]): Promise<{ tools: Record<string, unknown>; cleanup: () => Promise<void> }> {
  const servers = await getMCPServers(brandId, serverIds);
  
  if (servers.length === 0) {
    return { tools: {}, cleanup: async () => {} };
  }


  // Dynamically import MCP manager to prevent build-time bundling
  const { createMCPManager } = await import('@/lib/mcp/client-manager-loader');
  const manager = await createMCPManager();
  const statuses = await manager.connectAll(servers);

  const tools = await manager.getAllTools();

  return {
    tools,
    cleanup: async () => await manager.disconnectAll(),
  };
}

// Available models with their display names and provider info
const MODELS = {
  // Claude models
  'claude-4.5': { provider: 'anthropic', modelId: 'claude-sonnet-4-5-20250929', name: 'Claude 4.5' },
  'claude-3-sonnet': { provider: 'anthropic', modelId: 'claude-sonnet-4-20250514', name: 'Claude 4' },
  
  // GPT models
  'gpt-5.2': { provider: 'openai', modelId: 'gpt-4o', name: 'GPT 5.2' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o', name: 'GPT 4o' },
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini', name: 'GPT 4o Mini' },
  
  // Gemini models
  'gemini-3.1': { provider: 'google', modelId: 'gemini-3-pro-preview', name: 'Gemini 3' },
  'gemini-pro': { provider: 'google', modelId: 'gemini-2.5-pro', name: 'Gemini Pro' },
} as const;

type ModelKey = keyof typeof MODELS;

// Check which API keys are available
function checkApiKeys() {
  return {
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    google: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY || !!process.env.GOOGLE_API_KEY,
  };
}

// Style instructions for different writing styles
const STYLE_INSTRUCTIONS: Record<string, string> = {
  normal: '',
  learning: '\n\nIMPORTANT: Explain concepts step-by-step with examples and analogies. Break down complex topics into digestible parts. Act as a patient teacher.',
  concise: '\n\nIMPORTANT: Be extremely brief and to the point. Use short sentences and bullet points. Minimize explanations unless specifically asked.',
  explanatory: '\n\nIMPORTANT: Provide detailed explanations with context, background, and reasoning. Include examples and clarifications. Be thorough.',
  formal: '\n\nIMPORTANT: Use formal, professional language. Maintain a business tone with proper grammar and structure. Avoid casual expressions.',
};

// Get the AI model instance based on provider
function getModel(modelKey: string) {
  const modelConfig = MODELS[modelKey as ModelKey] || MODELS['claude-4.5'];
  const keys = checkApiKeys();
  
  // Log which model and API key status
  console.log('getModel:', { 
    modelKey, 
    provider: modelConfig.provider, 
    modelId: modelConfig.modelId,
    hasAnthropicKey: keys.anthropic,
    hasOpenAIKey: keys.openai,
    hasGoogleKey: keys.google
  });
  
  // Check if the required API key exists
  if (modelConfig.provider === 'anthropic' && !keys.anthropic) {
    console.warn('Anthropic API key missing, falling back to OpenAI if available');
    if (keys.openai) return openai('gpt-4o');
    throw new Error('No AI API keys configured');
  }
  if (modelConfig.provider === 'openai' && !keys.openai) {
    console.warn('OpenAI API key missing, falling back to Anthropic');
    return anthropic('claude-sonnet-4-20250514');
  }
  if (modelConfig.provider === 'google' && !keys.google) {
    console.warn('Google API key missing, falling back to Anthropic');
    return anthropic('claude-sonnet-4-20250514');
  }
  
  switch (modelConfig.provider) {
    case 'anthropic':
      return anthropic(modelConfig.modelId);
    case 'openai':
      return openai(modelConfig.modelId);
    case 'google':
      return google(modelConfig.modelId);
    default:
      return anthropic('claude-sonnet-4-20250514');
  }
}

// Attachment type from frontend
interface ProcessedAttachment {
  type: 'image' | 'document';
  name: string;
  mimeType: string;
  data: string; // base64 for images/PDFs, plain text for text files
}

// Upload PDF to Supabase Storage for persistence
async function uploadPDFToStorage(
  brandId: string,
  conversationId: string,
  fileName: string,
  base64Data: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const buffer = Buffer.from(cleanBase64, 'base64');
    
    const filePath = `${brandId}/${conversationId}/${Date.now()}-${fileName}`;
    
    const { error } = await supabase.storage
      .from('chat-attachments')
      .upload(filePath, buffer, { contentType: 'application/pdf' });
    
    if (error) {
      console.error('Failed to upload PDF to storage:', error);
      return null;
    }
    
    return filePath;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // AI SDK 5 useChat sends messages in a different format
    const { 
      conversationId,
      brandId, 
      projectId,
      model = 'claude-sonnet-4-5',
      messages = [],
      systemPrompt,
      attachments = [] as ProcessedAttachment[],
      useWebSearch = false,
      useDeepResearch = false,
      mcpServerIds = [] as string[]
    } = body;


    // Validate brand access (in production, verify user has access to this brand)
    if (!brandId) {
      return new Response(
        JSON.stringify({ error: 'Brand ID is required', received: Object.keys(body) }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages are required', received: body }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch project files context if projectId is provided
    let projectContext = '';
    if (projectId) {
      try {
        const supabase = getSupabaseClient();
        
        // First, check ALL files for this project (for debugging)
        const { data: allFiles } = await supabase
          .from('project_files')
          .select('id, name, status, file_type, extracted_text')
          .eq('project_id', projectId);
        
        // Now fetch only ready files with extracted text
        const { data: projectFiles, error: filesError } = await supabase
          .from('project_files')
          .select('name, extracted_text, file_type, status')
          .eq('project_id', projectId)
          .eq('status', 'ready')
          .not('extracted_text', 'is', null);


        if (projectFiles && projectFiles.length > 0) {
          projectContext = '\n\n=== PROJECT CONTEXT FILES ===\n';
          projectContext += 'The following files have been uploaded to this project for context:\n\n';
          
          for (const file of projectFiles) {
            if (file.extracted_text) {
              // Limit each file's content to prevent token overflow
              const maxFileLength = 10000;
              const content = file.extracted_text.length > maxFileLength
                ? file.extracted_text.substring(0, maxFileLength) + '\n[Content truncated...]'
                : file.extracted_text;
              
              projectContext += `--- ${file.name} (${file.file_type}) ---\n`;
              projectContext += content;
              projectContext += '\n--- End of file ---\n\n';
            }
          }
          projectContext += '=== END PROJECT CONTEXT ===\n\n';
          projectContext += 'Use the above project files as context when answering questions. Reference specific files when relevant.\n';
        }
      } catch (error) {
        // Silent fail
      }
    }

    // Fetch conversation style if conversationId exists
    let styleInstruction = '';
    if (conversationId) {
      try {
        const supabase = getSupabaseClient();
        const { data: conversation } = await supabase
          .from('conversations')
          .select('style_preset')
          .eq('id', conversationId)
          .single();
        
        if (conversation?.style_preset) {
          styleInstruction = STYLE_INSTRUCTIONS[conversation.style_preset] || '';
        }
      } catch (error) {
        // Silent fail
      }
    }

    // Build the system prompt with brand context
    const modelConfig = MODELS[model as ModelKey] || MODELS['claude-4.5'];
    const defaultSystemPrompt = `You are ${modelConfig.name}, a helpful AI assistant for brand management.
You are assisting with brand: ${brandId}
When asked what model you are, always say you are ${modelConfig.name} from ${modelConfig.provider}.
Always provide helpful, accurate, and brand-appropriate responses.
Be concise but thorough. Use markdown formatting when appropriate.${projectContext}`;

    const finalSystemPrompt = systemPrompt ? `${systemPrompt}${projectContext}${styleInstruction}` : `${defaultSystemPrompt}${styleInstruction}`;

    // Get the AI model based on the model key
    const aiModel = getModel(model);

    // Extract content from messages - handle both old format (content) and new format (parts)
    // Using for...of loop to support async PDF extraction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedMessages: any[] = [];
    
    for (let index = 0; index < messages.length; index++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = messages[index] as any;
      
      // Skip system messages (like "X joined the chat") - LLMs only accept user/assistant in messages array
      // System context should be passed via the system parameter, not in messages
      if (m.role === 'system') {
        continue;
      }
      
      let content = m.content;
      
      // If content is not a string, try to extract from parts (AI SDK 5 format)
      if (!content && m.parts) {
        content = m.parts
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((p: any) => p.type === 'text')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((p: any) => p.text)
          .join('');
      }
      
      // For the last user message, check if there are attachments to include
      const isLastUserMessage = index === messages.length - 1 && m.role === 'user';
      
      if (isLastUserMessage && attachments && attachments.length > 0) {
        // Build multimodal content array
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const contentParts: any[] = [];
        
        // Add text content if present
        if (content) {
          contentParts.push({ type: 'text', text: content });
        }
        
        // Add attachments
        for (const attachment of attachments as ProcessedAttachment[]) {
          if (attachment.type === 'image') {
            // Extract base64 data (remove data:image/...;base64, prefix if present)
            let imageData = attachment.data;
            if (imageData.startsWith('data:')) {
              imageData = imageData.split(',')[1]; // Get just the base64 part
            }
            
            // Convert base64 to Uint8Array for AI SDK (Edge-compatible)
            const binaryString = Buffer.from(imageData, 'base64');
            const binaryData = new Uint8Array(binaryString);
            
            contentParts.push({
              type: 'image',
              image: binaryData,
              mimeType: attachment.mimeType,
            });
          } else if (attachment.type === 'document') {
            // For documents, include as text context
            if (attachment.mimeType === 'text/plain' || attachment.mimeType === 'text/markdown') {
              contentParts.push({
                type: 'text',
                text: `\n\n--- Content from ${attachment.name} ---\n${attachment.data}\n--- End of ${attachment.name} ---\n\n`,
              });
            } else if (attachment.mimeType === 'application/pdf') {
              // Send PDF directly to LLM - Claude/Gemini can read PDFs natively
              // This is more reliable than server-side text extraction
              let pdfData = attachment.data;
              if (pdfData.startsWith('data:')) {
                pdfData = pdfData.split(',')[1]; // Get just the base64 part
              }
              
              
              // Upload to Supabase Storage for persistence (non-blocking)
              if (conversationId && brandId) {
                uploadPDFToStorage(brandId, conversationId, attachment.name, attachment.data)
                  .catch(() => {});
              }
              
              // Send PDF as file attachment to LLM (native PDF reading)
              // AI SDK uses 'mediaType' not 'mimeType'
              contentParts.push({
                type: 'file',
                data: pdfData, // base64 string
                mediaType: 'application/pdf',
                filename: attachment.name,
              });
            }
          }
        }
        
        // If we have image attachments but no text, add a prompt
        const hasImages = (attachments as ProcessedAttachment[]).some(a => a.type === 'image');
        if (hasImages && !content) {
          contentParts.unshift({ type: 'text', text: 'What can you tell me about this image?' });
        }
        
        normalizedMessages.push({
          role: m.role as 'user' | 'assistant' | 'system',
          content: contentParts,
        });
        continue;
      }
      
      const normalizedMsg = {
        role: m.role as 'user' | 'assistant' | 'system',
        content: content || '',
      };
      
      // Filter out empty messages
      if (normalizedMsg.content && (typeof normalizedMsg.content === 'string' ? normalizedMsg.content : normalizedMsg.content.length > 0)) {
        normalizedMessages.push(normalizedMsg);
      }
    }


    // Get MCP tools only if the user has explicitly selected specific servers
    // If no servers selected, don't include any MCP tools (user must opt-in)
    const { tools: mcpTools, cleanup: cleanupMCP } = mcpServerIds.length > 0
      ? await getMCPTools(brandId, mcpServerIds)
      : { tools: {}, cleanup: async () => {} };
    const hasMCPTools = Object.keys(mcpTools).length > 0;


    try {
      // Build streamText options
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const streamOptions: any = {
        model: aiModel,
        messages: normalizedMessages,
        system: finalSystemPrompt,
        maxOutputTokens: 4000, // AI SDK 5 uses maxOutputTokens
        temperature: 0.7,
      };

      // Optional Deep Research / Extended Thinking mode
      if (useDeepResearch) {
        const modelConfig = MODELS[model as ModelKey] || MODELS['claude-4.5'];
        
        if (modelConfig.provider === 'anthropic') {
          // Claude's extended thinking with interleaved tool use
          streamOptions.providerOptions = {
            anthropic: {
              thinking: { type: 'enabled', budgetTokens: 15000 },
            },
          };
          streamOptions.headers = {
            'anthropic-beta': 'interleaved-thinking-2025-05-14',
          };
          streamOptions.maxOutputTokens = 16000; // Increase for reasoning + response
        } else if (modelConfig.provider === 'google') {
          // Gemini's thinking mode
          streamOptions.providerOptions = {
            google: {
              thinkingConfig: {
                includeThoughts: true,
                thinkingLevel: 'high',
              },
            },
          };
          streamOptions.maxOutputTokens = 16000;
        } else if (modelConfig.provider === 'openai') {
          // OpenAI doesn't have extended thinking in the same way
          // Use higher temperature and more verbose system prompt instead
          streamOptions.temperature = 0.8;
          streamOptions.maxOutputTokens = 8000;
          streamOptions.system = `${finalSystemPrompt}\n\nIMPORTANT: You are in deep research mode. Think through problems step-by-step, consider multiple perspectives, and provide comprehensive, well-reasoned answers. Break down complex topics and explore implications thoroughly.`;
        }
      }

      // Build tools map
      const tools: Record<string, unknown> = { ...(hasMCPTools ? mcpTools : {}) };

      // Optional Web Search via native provider tools (OpenAI and Gemini only)
      const modelConfig = MODELS[model as ModelKey] || MODELS['claude-4.5'];
      
      if (useWebSearch) {
        if (modelConfig.provider === 'openai') {
          // OpenAI's native web search tool
          tools.web_search = openai.tools.webSearch({
            searchContextSize: 'high',
          });
        } else if (modelConfig.provider === 'google') {
          // Gemini's native Google Search grounding
          tools.google_search = google.tools.googleSearch({});
          // Add instruction to use search
          streamOptions.system = `${streamOptions.system || finalSystemPrompt}\n\nIMPORTANT: You have access to Google Search. When the user asks for current information, news, facts, or anything that would benefit from real-time web data, USE the google_search tool to find accurate, up-to-date information. Always search before answering questions about current events, recent news, or factual queries.`;
        }
      }

      const hasTools = Object.keys(tools).length > 0;
      if (hasTools) {
        streamOptions.tools = tools;
        streamOptions.stopWhen = stepCountIs(5);
        streamOptions.toolChoice = 'auto';
        
        // If MCP tools are available, instruct the AI to use them proactively
        if (hasMCPTools) {
          const mcpToolNames = Object.keys(mcpTools).slice(0, 10).join(', ');
          streamOptions.system = `${streamOptions.system || finalSystemPrompt}\n\nIMPORTANT: You have access to external tools that can help you complete tasks. Available tools include: ${mcpToolNames}${Object.keys(mcpTools).length > 10 ? ', and more' : ''}. When the user's request can be fulfilled or enhanced by using these tools, USE THEM AUTOMATICALLY without waiting to be asked. For example, if asked to fetch data, look up information, or perform actions that match your available tools, use them immediately. Be proactive - don't just describe what you could do, actually do it.`;
        }
      }

      // Validate we have messages to send
      if (normalizedMessages.length === 0) {
        console.error('Chat API: No messages to send. Original:', JSON.stringify(messages.slice(-3)));
        return new Response(
          JSON.stringify({ error: 'No valid messages to process' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('Chat API: Sending', normalizedMessages.length, 'messages to', model);
      
      let result;
      try {
        result = streamText(streamOptions);
      } catch (initError) {
        console.error('Chat API: Failed to initialize streamText:', initError);
        return new Response(
          JSON.stringify({ error: 'Failed to initialize AI model', details: initError instanceof Error ? initError.message : 'Unknown error' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Create a custom stream that includes tool call markers (for any tools)
      if (hasTools) {
        const encoder = new TextEncoder();
        let toolCallsSent = new Set<string>();
        let toolStreamChunks = 0;
        
        const customStream = new ReadableStream({
          async start(controller) {
            // Track tool calls via onChunk equivalent
            try {
              for await (const part of result.fullStream) {
                toolStreamChunks++;
                if (part.type === 'tool-call') {
                  const toolCallId = part.toolCallId;
                  if (!toolCallsSent.has(toolCallId)) {
                    toolCallsSent.add(toolCallId);
                    // Send tool call marker
                    controller.enqueue(encoder.encode(`\n[TOOL_CALL:${part.toolName}]\n`));
                  }
                } else if (part.type === 'tool-result') {
                  // Send tool result marker
                  controller.enqueue(encoder.encode(`\n[TOOL_RESULT:${part.toolName}]\n`));
                  // If webSearch, append simple sources list
                  try {
                    // @ts-expect-error runtime chunk shape
                    const out = part?.result || part?.output || part;
                    const sources = out?.results;
                    if (Array.isArray(sources) && sources.length > 0) {
                      const lines = sources
                        .slice(0, 5)
                        .map((r: any, i: number) => `${i + 1}. ${r.title} - ${r.url}`)
                        .join('\n');
                      controller.enqueue(encoder.encode(`\n\nSources:\n${lines}\n`));
                    }
                  } catch {
                    // ignore
                  }
                } else if (part.type === 'text-delta') {
                  controller.enqueue(encoder.encode(part.text));
                }
              }
              // Log stream completion
              if (toolStreamChunks === 0) {
                console.warn('Chat API (tools): Stream completed with 0 chunks');
              } else {
                console.log('Chat API (tools): Stream completed with', toolStreamChunks, 'chunks');
              }
            } catch (streamError) {
              console.error('Chat API (tools): Stream error:', streamError);
              const errorMsg = streamError instanceof Error ? streamError.message : 'Unknown stream error';
              controller.enqueue(encoder.encode(`\n\n⚠️ Error: ${errorMsg}`));
            }
            controller.close();
            
            // Cleanup MCP (if any)
            if (hasMCPTools) {
              await cleanupMCP().catch(err => {
                console.error('MCP cleanup error:', err);
              });
            }
          },
        });

        return new Response(customStream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }

      // Clean up MCP after non-streaming when tools used
      if (hasMCPTools) {
        // Schedule cleanup when the text generation is complete
        result.text.then(() => {
          cleanupMCP().catch(err => {
            console.error('MCP cleanup error:', err);
          });
        }).catch(() => {
          cleanupMCP().catch(err => {
            console.error('MCP cleanup error after failure:', err);
          });
        });
      }

      // Return streaming response
      const encoder = new TextEncoder();
      const textStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of result.textStream) {
              controller.enqueue(encoder.encode(chunk));
            }
            controller.close();
          } catch (streamError) {
            console.error('Stream error:', streamError);
            const errorMsg = streamError instanceof Error ? streamError.message : 'Unknown error';
            controller.enqueue(encoder.encode(`\n\n⚠️ Error: ${errorMsg}`));
            controller.close();
          }
        }
      });
      
      return new Response(textStream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    } catch (innerError) {
      // Ensure cleanup on any error within the inner try block
      await cleanupMCP().catch(err => {
        console.error('MCP cleanup error in catch:', err);
      });
      throw innerError;
    }
  } catch (error) {
    console.error("Chat API error:", error);
    
    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('api_key')) {
        return new Response(
          JSON.stringify({ error: 'Anthropic API key not configured' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

