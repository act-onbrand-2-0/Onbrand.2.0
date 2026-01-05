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

// Fetch enabled MCP servers for a brand
async function getMCPServers(brandId: string): Promise<MCPServerConfig[]> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('brand_id', brandId)
      .eq('enabled', true)
      .order('priority', { ascending: false });

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
async function getMCPTools(brandId: string): Promise<{ tools: Record<string, unknown>; cleanup: () => Promise<void> }> {
  const servers = await getMCPServers(brandId);
  
  if (servers.length === 0) {
    return { tools: {}, cleanup: async () => {} };
  }

  console.log(`Found ${servers.length} MCP servers for brand ${brandId}`);

  // Dynamically import MCP manager to prevent build-time bundling
  const { createMCPManager } = await import('@/lib/mcp/client-manager-loader');
  const manager = await createMCPManager();
  const statuses = await manager.connectAll(servers);

  const connectedCount = statuses.filter((s: MCPConnectionStatus) => s.connected).length;
  console.log(`Connected to ${connectedCount}/${servers.length} MCP servers`);

  // Log any connection errors
  statuses.filter((s: MCPConnectionStatus) => !s.connected).forEach((s: MCPConnectionStatus) => {
    console.warn(`MCP server ${s.serverName} failed to connect: ${s.error}`);
  });

  const tools = await manager.getAllTools();
  console.log(`Loaded ${Object.keys(tools).length} MCP tools`);

  return {
    tools,
    cleanup: async () => await manager.disconnectAll(),
  };
}

// Available models with their display names and provider info
const MODELS = {
  // Claude models
  'claude-4.5': { provider: 'anthropic', modelId: 'claude-sonnet-4-5', name: 'Claude 4.5' },
  'claude-3-sonnet': { provider: 'anthropic', modelId: 'claude-sonnet-4-5', name: 'Claude 4.5' },
  
  // GPT models
  'gpt-5.2': { provider: 'openai', modelId: 'gpt-4o', name: 'GPT 5.2' },
  'gpt-4o': { provider: 'openai', modelId: 'gpt-4o', name: 'GPT 4o' },
  'gpt-4o-mini': { provider: 'openai', modelId: 'gpt-4o-mini', name: 'GPT 4o Mini' },
  
  // Gemini models
  'gemini-3.1': { provider: 'google', modelId: 'gemini-2.0-flash', name: 'Gemini 3.1' },
  'gemini-pro': { provider: 'google', modelId: 'gemini-1.5-pro', name: 'Gemini Pro' },
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
  
  console.log('API Keys available:', keys);
  console.log('Requested provider:', modelConfig.provider);
  
  // Check if the required API key exists
  if (modelConfig.provider === 'openai' && !keys.openai) {
    console.warn('OpenAI API key not found, falling back to Claude');
    return anthropic('claude-sonnet-4-5');
  }
  if (modelConfig.provider === 'google' && !keys.google) {
    console.warn('Google API key not found, falling back to Claude');
    return anthropic('claude-sonnet-4-5');
  }
  
  switch (modelConfig.provider) {
    case 'anthropic':
      return anthropic(modelConfig.modelId);
    case 'openai':
      return openai(modelConfig.modelId);
    case 'google':
      return google(modelConfig.modelId);
    default:
      return anthropic('claude-sonnet-4-5');
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
    
    console.log('PDF uploaded to storage:', filePath);
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
      useDeepResearch = false
    } = body;

    // Log for debugging - full body
    console.log('=== CHAT API DEBUG ===');
    console.log('Full body received:', JSON.stringify(body, null, 2));
    console.log('Model from body:', model);
    console.log('========================');

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
    console.log('=== PROJECT FILES DEBUG ===');
    console.log('projectId received:', projectId);
    
    if (projectId) {
      try {
        const supabase = getSupabaseClient();
        
        // First, check ALL files for this project (for debugging)
        const { data: allFiles } = await supabase
          .from('project_files')
          .select('id, name, status, file_type, extracted_text')
          .eq('project_id', projectId);
        
        console.log('ALL files for project:', allFiles?.map(f => ({ 
          id: f.id,
          name: f.name, 
          status: f.status, 
          hasExtractedText: !!f.extracted_text,
          textLength: f.extracted_text?.length || 0
        })));
        
        // Now fetch only ready files with extracted text
        const { data: projectFiles, error: filesError } = await supabase
          .from('project_files')
          .select('name, extracted_text, file_type, status')
          .eq('project_id', projectId)
          .eq('status', 'ready')
          .not('extracted_text', 'is', null);

        console.log('Ready files with text:', { 
          count: projectFiles?.length || 0, 
          files: projectFiles?.map(f => ({ name: f.name, status: f.status, hasText: !!f.extracted_text, textLength: f.extracted_text?.length })),
          error: filesError 
        });

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
        console.error('Failed to fetch project files:', error);
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
        console.error('Failed to fetch conversation style:', error);
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
    console.log('=== API MODEL DEBUG ===');
    console.log('Model received:', model);
    console.log('Model config:', MODELS[model as ModelKey]);
    const aiModel = getModel(model);
    console.log('AI Model created:', aiModel);

    // Extract content from messages - handle both old format (content) and new format (parts)
    // Using for...of loop to support async PDF extraction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedMessages: any[] = [];
    
    for (let index = 0; index < messages.length; index++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = messages[index] as any;
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
            console.log('Adding image attachment:', attachment.name, 'mimeType:', attachment.mimeType, 'data length:', imageData.length);
            
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
              
              console.log('Sending PDF directly to LLM:', attachment.name, 'size:', pdfData.length);
              
              // Upload to Supabase Storage for persistence (non-blocking)
              if (conversationId && brandId) {
                uploadPDFToStorage(brandId, conversationId, attachment.name, attachment.data)
                  .catch(err => console.error('Background PDF upload failed:', err));
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

    console.log('=== ATTACHMENT DEBUG ===');
    console.log('Attachments received:', attachments?.length || 0);
    if (attachments && attachments.length > 0) {
      console.log('First attachment:', {
        type: attachments[0].type,
        name: attachments[0].name,
        mimeType: attachments[0].mimeType,
        dataLength: attachments[0].data?.length || 0,
        dataStart: attachments[0].data?.substring(0, 50),
      });
    }
    console.log('Messages count:', messages?.length);
    console.log('Last message role:', messages?.[messages.length - 1]?.role);
    console.log('Normalized messages (first 1000 chars):', JSON.stringify(normalizedMessages, null, 2).slice(0, 1000));
    console.log('=== END DEBUG ===');

    // Get MCP tools for this brand
    const { tools: mcpTools, cleanup: cleanupMCP } = await getMCPTools(brandId);
    const hasMCPTools = Object.keys(mcpTools).length > 0;

    if (hasMCPTools) {
      console.log('=== MCP TOOLS DEBUG ===');
      console.log('Available MCP tools:', Object.keys(mcpTools));
      console.log('=== END MCP DEBUG ===');
    }

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
          console.log('Deep research enabled via Claude extended thinking');
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
          console.log('Deep research enabled via Gemini thinking mode');
        } else if (modelConfig.provider === 'openai') {
          // OpenAI doesn't have extended thinking in the same way
          // Use higher temperature and more verbose system prompt instead
          streamOptions.temperature = 0.8;
          streamOptions.maxOutputTokens = 8000;
          streamOptions.system = `${finalSystemPrompt}\n\nIMPORTANT: You are in deep research mode. Think through problems step-by-step, consider multiple perspectives, and provide comprehensive, well-reasoned answers. Break down complex topics and explore implications thoroughly.`;
          console.log('Deep research enabled via enhanced prompting for OpenAI');
        }
      }

      // Build tools map
      const tools: Record<string, unknown> = { ...(hasMCPTools ? mcpTools : {}) };

      // Optional Web Search via native provider tools (OpenAI and Gemini only)
      if (useWebSearch) {
        const modelConfig = MODELS[model as ModelKey] || MODELS['claude-4.5'];
        if (modelConfig.provider === 'openai') {
          // OpenAI's native web search tool
          tools.web_search = openai.tools.webSearch({
            searchContextSize: 'high',
          });
          console.log('Web search enabled via OpenAI built-in tool');
        } else if (modelConfig.provider === 'google') {
          // Gemini's native Google Search grounding
          tools.google_search = google.tools.googleSearch({});
          console.log('Web search enabled via Gemini Google Search grounding');
        } else {
          // Claude doesn't have native web search
          console.warn(`Web search requested but model provider is ${modelConfig.provider}. Web search only available with OpenAI and Gemini models.`);
        }
      }

      const hasTools = Object.keys(tools).length > 0;
      if (hasTools) {
        streamOptions.tools = tools;
        streamOptions.stopWhen = stepCountIs(5);
        streamOptions.toolChoice = 'auto';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        streamOptions.onStepFinish = ({ text, toolCalls, toolResults, finishReason }: any) => {
          console.log('=== STEP FINISHED ===');
          console.log('Text length:', text?.length || 0);
          console.log('Tool calls:', toolCalls?.length || 0);
          console.log('Tool results:', toolResults?.length || 0);
          console.log('Finish reason:', finishReason);
          if (text) console.log('Text preview:', text.slice(0, 100) + '...');
        };
      }

      const result = streamText(streamOptions);

      // Create a custom stream that includes tool call markers (for any tools)
      if (hasTools) {
        const encoder = new TextEncoder();
        let toolCallsSent = new Set<string>();
        
        const customStream = new ReadableStream({
          async start(controller) {
            // Track tool calls via onChunk equivalent
            for await (const part of result.fullStream) {
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
      return result.toTextStreamResponse();
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

