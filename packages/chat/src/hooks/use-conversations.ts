'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Conversation, CreateConversationInput, ChatModel } from '../types';

interface UseConversationsProps {
  supabase: SupabaseClient;
  brandId: string;
  userId: string;
}

interface UseConversationsReturn {
  conversations: Conversation[];
  isLoading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  createConversation: (input: CreateConversationInput) => Promise<Conversation>;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  archiveConversation: (id: string) => Promise<void>;
}

export function useConversations({
  supabase,
  brandId,
  userId,
}: UseConversationsProps): UseConversationsReturn {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all conversations for the brand/user
  const fetchConversations = useCallback(async () => {
    if (!brandId || !userId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .eq('archived', false)
        .order('last_message_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setConversations(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, brandId, userId]);

  // Create a new conversation
  const createConversation = useCallback(async (
    input: CreateConversationInput
  ): Promise<Conversation> => {
    setError(null);

    const defaultSettings = {
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 1.0,
    };

    const newConversation = {
      brand_id: brandId,
      user_id: userId,
      project_id: input.project_id || null,
      title: input.title,
      model: input.model || 'gpt-4' as ChatModel,
      system_prompt: input.system_prompt || null,
      settings: { ...defaultSettings, ...input.settings },
    };

    const { data, error: createError } = await supabase
      .from('conversations')
      .insert(newConversation)
      .select()
      .single();

    if (createError) {
      throw new Error(createError.message);
    }

    setConversations(prev => [data, ...prev]);
    return data;
  }, [supabase, brandId, userId]);

  // Update a conversation
  const updateConversation = useCallback(async (
    id: string,
    updates: Partial<Conversation>
  ): Promise<void> => {
    setError(null);

    const { error: updateError } = await supabase
      .from('conversations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('brand_id', brandId); // Ensure brand isolation

    if (updateError) {
      throw new Error(updateError.message);
    }

    setConversations(prev =>
      prev.map(conv =>
        conv.id === id ? { ...conv, ...updates } : conv
      )
    );
  }, [supabase, brandId]);

  // Delete a conversation
  const deleteConversation = useCallback(async (id: string): Promise<void> => {
    setError(null);

    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('brand_id', brandId); // Ensure brand isolation

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    setConversations(prev => prev.filter(conv => conv.id !== id));
  }, [supabase, brandId]);

  // Archive a conversation
  const archiveConversation = useCallback(async (id: string): Promise<void> => {
    await updateConversation(id, { archived: true });
    setConversations(prev => prev.filter(conv => conv.id !== id));
  }, [updateConversation]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!brandId || !userId) return;

    const channel = supabase
      .channel(`conversations:${brandId}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `brand_id=eq.${brandId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newConv = payload.new as Conversation;
            if (newConv.user_id === userId) {
              setConversations(prev => [newConv, ...prev]);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as Conversation;
            setConversations(prev =>
              prev.map(conv => (conv.id === updated.id ? updated : conv))
            );
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setConversations(prev => prev.filter(conv => conv.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, brandId, userId]);

  return {
    conversations,
    isLoading,
    error,
    fetchConversations,
    createConversation,
    updateConversation,
    deleteConversation,
    archiveConversation,
  };
}
