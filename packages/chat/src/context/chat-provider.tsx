'use client';

import { createContext, useContext, ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useChat } from '../hooks/use-chat';
import type { BrandContext, Conversation, Message, CreateConversationInput, SendMessageInput } from '../types';

interface ChatContextValue {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  input: string;

  // Actions
  setInput: (input: string) => void;
  createConversation: (input: CreateConversationInput) => Promise<Conversation>;
  selectConversation: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
  sendMessage: (input?: SendMessageInput) => Promise<void>;
  regenerateLastResponse: () => Promise<void>;
  stopGeneration: () => void;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

interface ChatProviderProps {
  children: ReactNode;
  supabase: SupabaseClient;
  brandContext: BrandContext;
  userId: string;
  apiEndpoint?: string;
}

export function ChatProvider({
  children,
  supabase,
  brandContext,
  userId,
  apiEndpoint,
}: ChatProviderProps) {
  const chat = useChat({
    supabase,
    brandContext,
    userId,
    apiEndpoint,
  });

  return (
    <ChatContext.Provider value={chat}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
