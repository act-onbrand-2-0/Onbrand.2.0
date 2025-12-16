/**
 * Chat SDK Integration Example for ACT 2.0
 * 
 * This file demonstrates how to integrate the Vercel AI Chat SDK
 * with your Supabase database for persistent conversations.
 * 
 * Documentation: https://chat-sdk.dev/docs
 */

// ============================================================================
// 1. API ROUTE - app/api/chat/route.ts
// ============================================================================

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, convertToCoreMessages } from 'ai';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { messages, id: chatId, brandId } = await req.json();
  
  // Initialize Supabase client with service role key for server-side operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get chat details including brand settings
  const { data: chat } = await supabase
    .from('chats')
    .select('*, brands(*)')
    .eq('id', chatId)
    .single();

  if (!chat) {
    return new Response('Chat not found', { status: 404 });
  }

  // Select model based on chat settings
  const model = chat.model === 'claude-3-opus' 
    ? anthropic('claude-3-opus-20240229')
    : openai('gpt-4-turbo');

  // Stream the response
  const result = streamText({
    model,
    messages: convertToCoreMessages(messages),
    temperature: chat.settings?.temperature ?? 0.7,
    maxTokens: chat.settings?.max_tokens ?? 2000,
    
    // Save messages after streaming completes
    async onFinish({ messages: finishedMessages, usage }) {
      // Save all messages to database
      for (const msg of finishedMessages) {
        // Convert message to parts format
        const parts = msg.content 
          ? [{ type: 'text', text: msg.content }]
          : msg.parts || [];

        await supabase.from('chat_messages').insert({
          chat_id: chatId,
          role: msg.role,
          parts,
          attachments: msg.experimental_attachments || [],
          tokens_used: msg.role === 'assistant' ? usage?.totalTokens : 0,
          model: chat.model,
        });
      }
      
      // Update chat metadata
      await supabase
        .from('chats')
        .update({ 
          last_message_at: new Date().toISOString(),
          total_tokens_used: chat.total_tokens_used + (usage?.totalTokens || 0),
        })
        .eq('id', chatId);
    },
  });

  return result.toDataStreamResponse();
}

// ============================================================================
// 2. CHAT COMPONENT - components/chat/ChatInterface.tsx
// ============================================================================

'use client';

import { useChat } from 'ai/react';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Message } from 'ai';

interface ChatInterfaceProps {
  chatId: string;
  brandId: string;
  userId: string;
}

export function ChatInterface({ chatId, brandId, userId }: ChatInterfaceProps) {
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load initial messages from database
  useEffect(() => {
    async function loadMessages() {
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (messages) {
        // Convert database messages to AI SDK format
        const formattedMessages: Message[] = messages.map((msg) => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: extractTextFromParts(msg.parts),
          parts: msg.parts,
          experimental_attachments: msg.attachments,
          createdAt: new Date(msg.created_at),
        }));

        setInitialMessages(formattedMessages);
      }
      setIsLoading(false);
    }

    loadMessages();
  }, [chatId]);

  // Initialize useChat hook
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading: isStreaming,
    append,
    reload,
    stop,
  } = useChat({
    api: '/api/chat',
    id: chatId,
    initialMessages,
    body: {
      brandId,
      userId,
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Handle file attachments
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('brandId', brandId);

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    });

    const { url, contentType } = await response.json();

    // Append message with attachment
    await append({
      role: 'user',
      content: `Uploaded file: ${file.name}`,
      experimental_attachments: [
        {
          name: file.name,
          contentType,
          url,
        },
      ],
    });
  };

  if (isLoading) {
    return <div>Loading chat...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {/* Render message parts */}
              {message.parts?.map((part, i) => {
                if (part.type === 'text') {
                  return <p key={i}>{part.text}</p>;
                }
                if (part.type === 'image') {
                  return <img key={i} src={part.image} alt="Generated" />;
                }
                if (part.type === 'tool-call') {
                  return (
                    <div key={i} className="text-sm opacity-75">
                      Calling tool: {part.toolName}
                    </div>
                  );
                }
                return null;
              })}

              {/* Render attachments */}
              {message.experimental_attachments?.map((attachment, i) => (
                <div key={i} className="mt-2 text-sm">
                  📎 {attachment.name}
                </div>
              ))}
            </div>
          </div>
        ))}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg p-4">
              <div className="animate-pulse">Thinking...</div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="px-4 py-2 bg-gray-200 rounded-lg cursor-pointer hover:bg-gray-300"
          >
            📎
          </label>
          
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isStreaming}
          />
          
          <button
            type="submit"
            disabled={isStreaming || !input.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStreaming ? 'Stop' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}

// Helper function to extract text from message parts
function extractTextFromParts(parts: any[]): string {
  return parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n');
}

// ============================================================================
// 3. SERVER ACTIONS - lib/actions/chat.ts
// ============================================================================

'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Create a new chat
 */
export async function createChat(
  brandId: string,
  userId: string,
  title: string = 'New Chat'
) {
  const { data, error } = await supabase.rpc('create_chat_with_quota_check', {
    p_brand_id: brandId,
    p_user_id: userId,
    p_title: title,
    p_model: 'gpt-4',
    p_visibility: 'private',
  });

  if (error) throw error;

  revalidatePath('/chat');
  return data;
}

/**
 * Get all chats for a brand
 */
export async function getChats(brandId: string, userId: string) {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('brand_id', brandId)
    .eq('user_id', userId)
    .eq('archived', false)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Get a single chat with messages
 */
export async function getChat(chatId: string) {
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .single();

  if (chatError) throw chatError;

  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (messagesError) throw messagesError;

  return { chat, messages };
}

/**
 * Delete a chat
 */
export async function deleteChat(chatId: string) {
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId);

  if (error) throw error;

  revalidatePath('/chat');
}

/**
 * Update chat visibility (for sharing)
 */
export async function updateChatVisibility(
  chatId: string,
  visibility: 'public' | 'private'
) {
  const { error } = await supabase
    .from('chats')
    .update({ visibility })
    .eq('id', chatId);

  if (error) throw error;

  revalidatePath(`/chat/${chatId}`);
}

/**
 * Vote on a message
 */
export async function voteMessage(
  chatId: string,
  messageId: string,
  isUpvoted: boolean
) {
  const { error } = await supabase
    .from('chat_votes')
    .upsert({
      chat_id: chatId,
      message_id: messageId,
      is_upvoted: isUpvoted,
    });

  if (error) throw error;
}

// ============================================================================
// 4. CHAT PAGE - app/(dashboard)/chat/[id]/page.tsx
// ============================================================================

import { ChatInterface } from '@/components/chat/ChatInterface';
import { getChat } from '@/lib/actions/chat';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const { chat, messages } = await getChat(id);

  if (!chat) {
    redirect('/chat');
  }

  return (
    <div className="h-screen">
      <ChatInterface
        chatId={id}
        brandId={chat.brand_id}
        userId={session.user.id}
      />
    </div>
  );
}

// ============================================================================
// 5. TYPES - lib/types/chat.ts
// ============================================================================

export interface Chat {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  visibility: 'public' | 'private';
  created_at: string;
  model: string;
  system_prompt?: string;
  settings: {
    temperature: number;
    max_tokens: number;
    top_p: number;
  };
  total_tokens_used: number;
  total_cost_usd: number;
  archived: boolean;
  updated_at: string;
  last_message_at: string;
}

export interface ChatMessage {
  id: string;
  chat_id: string;
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  parts: MessagePart[];
  attachments: Attachment[];
  created_at: string;
  tokens_used: number;
  model?: string;
  metadata?: Record<string, any>;
}

export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: any }
  | { type: 'tool-result'; toolCallId: string; toolName: string; result: any };

export interface Attachment {
  name: string;
  contentType: string;
  url: string;
}

export interface ChatVote {
  chat_id: string;
  message_id: string;
  is_upvoted: boolean;
  created_at: string;
}

export interface ChatDocument {
  id: string;
  chat_id?: string;
  user_id: string;
  brand_id?: string;
  title: string;
  content?: string;
  kind: 'text' | 'code' | 'image' | 'sheet';
  created_at: string;
}
