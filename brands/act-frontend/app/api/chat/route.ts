import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { type NextRequest } from 'next/server';

// Tell Next.js this is a dynamic API route
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Use edge runtime for streaming
export const runtime = "edge";

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // AI SDK 5 useChat sends messages in a different format
    const { 
      conversationId,
      brandId, 
      messages = [],
      model = 'claude-sonnet-4-5',
      systemPrompt,
      attachments = [] as ProcessedAttachment[]
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

    // Build the system prompt with brand context
    const modelConfig = MODELS[model as ModelKey] || MODELS['claude-4.5'];
    const defaultSystemPrompt = `You are ${modelConfig.name}, a helpful AI assistant for brand management.
You are assisting with brand: ${brandId}
When asked what model you are, always say you are ${modelConfig.name} from ${modelConfig.provider}.
Always provide helpful, accurate, and brand-appropriate responses.
Be concise but thorough. Use markdown formatting when appropriate.`;

    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    // Get the AI model based on the model key
    console.log('=== API MODEL DEBUG ===');
    console.log('Model received:', model);
    console.log('Model config:', MODELS[model as ModelKey]);
    const aiModel = getModel(model);
    console.log('AI Model created:', aiModel);

    // Extract content from messages - handle both old format (content) and new format (parts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const normalizedMessages = messages.map((m: any, index: number) => {
      let content = m.content;
      
      // If content is not a string, try to extract from parts (AI SDK 5 format)
      if (!content && m.parts) {
        content = m.parts
          .filter((p: any) => p.type === 'text')
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
              // PDF handling would require server-side parsing
              // For now, just note that a PDF was attached
              contentParts.push({
                type: 'text',
                text: `\n\n[Note: PDF file "${attachment.name}" was attached. PDF content extraction is not yet supported.]\n\n`,
              });
            }
          }
        }
        
        // If we have image attachments but no text, add a prompt
        const hasImages = (attachments as ProcessedAttachment[]).some(a => a.type === 'image');
        if (hasImages && !content) {
          contentParts.unshift({ type: 'text', text: 'What can you tell me about this image?' });
        }
        
        return {
          role: m.role as 'user' | 'assistant' | 'system',
          content: contentParts,
        };
      }
      
      return {
        role: m.role as 'user' | 'assistant' | 'system',
        content: content || '',
      };
    }).filter((m: any) => m.content && (typeof m.content === 'string' ? m.content : m.content.length > 0));

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

    const result = streamText({
      model: aiModel,
      messages: normalizedMessages,
      system: finalSystemPrompt,
      maxTokens: 4000, // Increased for image descriptions
      temperature: 0.7,
    });

    // Return plain text streaming response
    return result.toTextStreamResponse();
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

