'use client';

import { useState, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Conversation,
  Message,
  CreateConversationInput,
  SendMessageInput,
  BrandContext,
  ChatModel,
} from '../types';
import { useConversations } from './use-conversations';
import { useMessages } from './use-messages';

interface UseChatProps {
  supabase: SupabaseClient;
  brandContext: BrandContext;
  userId: string;
  apiEndpoint?: string;
}

interface UseChatReturn {
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

export function useChat({
  supabase,
  brandContext,
  userId,
  apiEndpoint = '/api/chat',
}: UseChatProps): UseChatReturn {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Use the conversations hook with brand isolation
  const {
    conversations,
    isLoading: isLoadingConversations,
    createConversation: createConv,
    updateConversation,
    deleteConversation: deleteConv,
    archiveConversation: archiveConv,
  } = useConversations({
    supabase,
    brandId: brandContext.brandId,
    userId,
  });

  // Use the messages hook
  const {
    messages,
    isLoading: isLoadingMessages,
    addMessage,
    updateMessage,
    clearMessages,
  } = useMessages({
    supabase,
    conversationId: currentConversation?.id || null,
  });

  const isLoading = isLoadingConversations || isLoadingMessages;

  // Create a new conversation
  const createConversation = useCallback(async (
    conversationInput: CreateConversationInput
  ): Promise<Conversation> => {
    setError(null);
    try {
      const conversation = await createConv({
        ...conversationInput,
        system_prompt: conversationInput.system_prompt || brandContext.systemPrompt,
      });
      setCurrentConversation(conversation);
      clearMessages();
      return conversation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(message);
      throw err;
    }
  }, [createConv, brandContext.systemPrompt, clearMessages]);

  // Select a conversation
  const selectConversation = useCallback(async (conversationId: string): Promise<void> => {
    setError(null);
    const conversation = conversations.find((c: Conversation) => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
    } else {
      setError('Conversation not found');
    }
  }, [conversations]);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string): Promise<void> => {
    setError(null);
    try {
      await deleteConv(conversationId);
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        clearMessages();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(message);
      throw err;
    }
  }, [deleteConv, currentConversation, clearMessages]);

  // Archive a conversation
  const archiveConversation = useCallback(async (conversationId: string): Promise<void> => {
    setError(null);
    try {
      await archiveConv(conversationId);
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        clearMessages();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to archive conversation';
      setError(message);
      throw err;
    }
  }, [archiveConv, currentConversation, clearMessages]);

  // Send a message with streaming response
  const sendMessage = useCallback(async (messageInput?: SendMessageInput): Promise<void> => {
    const content = messageInput?.content || input;
    if (!content.trim()) return;

    setError(null);
    setInput('');

    // Create conversation if none exists
    let conversation = currentConversation;
    if (!conversation) {
      conversation = await createConversation({
        title: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
        model: 'gpt-4' as ChatModel,
      });
    }

    try {
      // Add user message to database
      const userMessage = await addMessage({
        conversation_id: conversation.id,
        role: 'user',
        content,
        tokens_used: 0,
        model: conversation.model,
        metadata: messageInput?.attachments ? { attachments: messageInput.attachments } : {},
      });

      // Start streaming
      setIsStreaming(true);
      abortControllerRef.current = new AbortController();

      // Create a placeholder for the assistant message
      const assistantMessageId = crypto.randomUUID();
      let assistantContent = '';

      // Call the API for streaming response
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: conversation.id,
          brandId: brandContext.brandId,
          messages: [...messages, userMessage].map((m: Message) => ({
            role: m.role,
            content: m.content,
          })),
          model: conversation.model,
          systemPrompt: conversation.system_prompt || brandContext.systemPrompt,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        // Update assistant message in real-time (local state only during streaming)
        // The final message will be saved to the database
      }

      // Save the complete assistant message to the database
      await addMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: assistantContent,
        tokens_used: 0, // TODO: Calculate tokens
        model: conversation.model,
        metadata: {},
      });

      // Update conversation's last_message_at
      await updateConversation(conversation.id, {
        last_message_at: new Date().toISOString(),
      });

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled the request
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to send message';
      setError(message);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [
    input,
    currentConversation,
    createConversation,
    addMessage,
    messages,
    apiEndpoint,
    brandContext,
    updateConversation,
  ]);

  // Regenerate the last assistant response
  const regenerateLastResponse = useCallback(async (): Promise<void> => {
    if (!currentConversation || messages.length === 0) return;

    // Find the last user message
    const lastUserMessageIndex = [...messages].reverse().findIndex((m: Message) => m.role === 'user');
    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = messages[messages.length - 1 - lastUserMessageIndex];
    if (!lastUserMessage) return;

    // Remove assistant messages after the last user message
    // Then resend the last user message
    await sendMessage({ content: lastUserMessage.content });
  }, [currentConversation, messages, sendMessage]);

  // Stop streaming generation
  const stopGeneration = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  // Clear error
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    isLoading,
    isStreaming,
    error,
    input,

    // Actions
    setInput,
    createConversation,
    selectConversation,
    deleteConversation,
    archiveConversation,
    sendMessage,
    regenerateLastResponse,
    stopGeneration,
    clearError,
  };
}
