'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Message, MessageRole } from '../types';

interface UseMessagesProps {
  supabase: SupabaseClient;
  conversationId: string | null;
}

interface UseMessagesReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  fetchMessages: () => Promise<void>;
  addMessage: (message: Omit<Message, 'id' | 'created_at'>) => Promise<Message>;
  updateMessage: (id: string, updates: Partial<Message>) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  clearMessages: () => void;
}

export function useMessages({
  supabase,
  conversationId,
}: UseMessagesProps): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all messages for a conversation
  const fetchMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setMessages(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, conversationId]);

  // Add a new message
  const addMessage = useCallback(async (
    message: Omit<Message, 'id' | 'created_at'>
  ): Promise<Message> => {
    if (!conversationId) {
      throw new Error('No conversation selected');
    }

    const { data, error: insertError } = await supabase
      .from('messages')
      .insert({
        ...message,
        conversation_id: conversationId,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(insertError.message);
    }

    setMessages(prev => [...prev, data]);
    return data;
  }, [supabase, conversationId]);

  // Update a message (for streaming updates)
  const updateMessage = useCallback(async (
    id: string,
    updates: Partial<Message>
  ): Promise<void> => {
    const { error: updateError } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    setMessages(prev =>
      prev.map(msg => (msg.id === id ? { ...msg, ...updates } : msg))
    );
  }, [supabase]);

  // Delete a message
  const deleteMessage = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    setMessages(prev => prev.filter(msg => msg.id !== id));
  }, [supabase]);

  // Clear messages (when switching conversations)
  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  // Fetch messages when conversation changes
  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to realtime message updates
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as Message;
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Message;
            setMessages(prev =>
              prev.map(msg => (msg.id === updated.id ? updated : msg))
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setMessages(prev => prev.filter(msg => msg.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId]);

  return {
    messages,
    isLoading,
    error,
    fetchMessages,
    addMessage,
    updateMessage,
    deleteMessage,
    clearMessages,
  };
}
