'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dedupedFetch } from '@/lib/request-dedup';

export interface ReactionGroup {
  count: number;
  userIds: string[];
  userReacted: boolean;
}

export type ReactionsMap = Record<string, Record<string, ReactionGroup>>;

export function useMessageReactions(conversationId: string | null) {
  const [reactions, setReactions] = useState<ReactionsMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  // Fetch reactions for all messages in the conversation - with batching and deduplication
  const fetchReactions = useCallback(async (messageIds: string[]) => {
    // Filter out already fetched IDs to prevent duplicate requests
    const newIds = messageIds.filter(id => !fetchedIdsRef.current.has(id));
    if (!newIds.length) return;
    
    // Mark as fetched immediately to prevent duplicates
    newIds.forEach(id => fetchedIdsRef.current.add(id));
    
    setIsLoading(true);
    try {
      const newReactions: ReactionsMap = {};
      
      // Batch fetch - 5 at a time
      const batchSize = 5;
      for (let i = 0; i < newIds.length; i += batchSize) {
        const batch = newIds.slice(i, i + batchSize);
        await Promise.all(batch.map(async (messageId) => {
          try {
            const response = await dedupedFetch(`/api/message-reactions?messageId=${messageId}`);
            if (response.ok) {
              const data = await response.json();
              newReactions[messageId] = data.reactions || {};
            }
          } catch {
            // Silently ignore individual failures
          }
        }));
      }
      
      setReactions(prev => ({ ...prev, ...newReactions }));
    } catch (error) {
      console.error('Failed to fetch reactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Toggle a reaction on a message
  const toggleReaction = useCallback(async (messageId: string, emoji: string) => {
    // Optimistic update
    setReactions(prev => {
      const messageReactions = prev[messageId] ? { ...prev[messageId] } : {};
      const existing = messageReactions[emoji];
      
      if (existing?.userReacted) {
        // Remove reaction
        if (existing.count <= 1) {
          delete messageReactions[emoji];
        } else {
          messageReactions[emoji] = {
            ...existing,
            count: existing.count - 1,
            userReacted: false,
          };
        }
      } else {
        // Add reaction
        messageReactions[emoji] = {
          count: (existing?.count || 0) + 1,
          userIds: existing?.userIds || [],
          userReacted: true,
        };
      }
      
      return { ...prev, [messageId]: messageReactions };
    });

    // Get current state to determine action
    const currentReactions = reactions[messageId]?.[emoji];
    const shouldRemove = currentReactions?.userReacted;

    try {
      if (shouldRemove) {
        await fetch('/api/message-reactions', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, emoji }),
        });
      } else {
        await fetch('/api/message-reactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId, emoji }),
        });
      }
    } catch (error) {
      console.error('Failed to toggle reaction:', error);
      // Revert optimistic update on error
      fetchReactions([messageId]);
    }
  }, [reactions, fetchReactions]);

  // Subscribe to real-time updates for reactions
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`reactions-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        async (payload) => {
          // Refetch reactions for the affected message
          const messageId = (payload.new as any)?.message_id || (payload.old as any)?.message_id;
          if (messageId) {
            try {
              const response = await dedupedFetch(`/api/message-reactions?messageId=${messageId}`);
              if (response.ok) {
                const data = await response.json();
                setReactions(prev => ({ ...prev, [messageId]: data.reactions || {} }));
              }
            } catch {
              // Silently ignore
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  return {
    reactions,
    isLoading,
    fetchReactions,
    toggleReaction,
  };
}
