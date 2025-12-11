// @ts-nocheck
/**
 * Conversation management utilities
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Conversation,
  Message,
  CreateConversationParams,
  AddMessageParams,
  ConversationWithMessages,
  ConversationListOptions,
  ConversationStats,
} from './conversation-types';

/**
 * Create a new conversation
 */
export async function createConversation(
  supabase: ReturnType<typeof createClient>,
  params: CreateConversationParams
): Promise<{ conversation: Conversation | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('create_conversation_with_quota_check', {
      p_brand_id: params.brand_id,
      p_user_id: params.user_id,
      p_title: params.title,
      p_model: params.model || 'gpt-4',
      p_system_prompt: params.system_prompt || null,
      p_settings: params.settings || null,
    });

    if (error) {
      return { conversation: null, error };
    }

    // Fetch the created conversation
    const { data: conversation, error: fetchError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) {
      return { conversation: null, error: fetchError };
    }

    return { conversation, error: null };
  } catch (error) {
    return {
      conversation: null,
      error: error instanceof Error ? error : new Error('Failed to create conversation'),
    };
  }
}

/**
 * Add a message to a conversation with automatic quota deduction
 */
export async function addMessage(
  supabase: ReturnType<typeof createClient>,
  params: AddMessageParams
): Promise<{ message: Message | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('add_message_with_quota', {
      p_conversation_id: params.conversation_id,
      p_role: params.role,
      p_content: params.content,
      p_tokens_used: params.tokens_used,
      p_model: params.model,
      p_metadata: params.metadata || {},
    });

    if (error) {
      return { message: null, error };
    }

    // Fetch the created message
    const { data: message, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) {
      return { message: null, error: fetchError };
    }

    return { message, error: null };
  } catch (error) {
    return {
      message: null,
      error: error instanceof Error ? error : new Error('Failed to add message'),
    };
  }
}

/**
 * Get a conversation by ID
 */
export async function getConversation(
  supabase: ReturnType<typeof createClient>,
  conversationId: string
): Promise<{ conversation: Conversation | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) {
      return { conversation: null, error };
    }

    return { conversation: data, error: null };
  } catch (error) {
    return {
      conversation: null,
      error: error instanceof Error ? error : new Error('Failed to get conversation'),
    };
  }
}

/**
 * Get a conversation with all its messages
 */
export async function getConversationWithMessages(
  supabase: ReturnType<typeof createClient>,
  conversationId: string
): Promise<{ conversation: ConversationWithMessages | null; error: Error | null }> {
  try {
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (convError) {
      return { conversation: null, error: convError };
    }

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (msgError) {
      return { conversation: null, error: msgError };
    }

    return {
      conversation: { ...conversation, messages: messages || [] },
      error: null,
    };
  } catch (error) {
    return {
      conversation: null,
      error: error instanceof Error ? error : new Error('Failed to get conversation with messages'),
    };
  }
}

/**
 * List conversations with filters
 */
export async function listConversations(
  supabase: ReturnType<typeof createClient>,
  options: ConversationListOptions
): Promise<{ conversations: Conversation[]; error: Error | null }> {
  try {
    let query = supabase
      .from('conversations')
      .select('*')
      .eq('brand_id', options.brand_id);

    if (options.user_id) {
      query = query.eq('user_id', options.user_id);
    }

    if (options.archived !== undefined) {
      query = query.eq('archived', options.archived);
    }

    const sortBy = options.sort_by || 'last_message_at';
    const sortOrder = options.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      return { conversations: [], error };
    }

    return { conversations: data || [], error: null };
  } catch (error) {
    return {
      conversations: [],
      error: error instanceof Error ? error : new Error('Failed to list conversations'),
    };
  }
}

/**
 * Update conversation (title, archived status, etc.)
 */
export async function updateConversation(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  updates: Partial<Pick<Conversation, 'title' | 'archived' | 'system_prompt' | 'settings'>>
): Promise<{ conversation: Conversation | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      return { conversation: null, error };
    }

    return { conversation: data, error: null };
  } catch (error) {
    return {
      conversation: null,
      error: error instanceof Error ? error : new Error('Failed to update conversation'),
    };
  }
}

/**
 * Archive a conversation
 */
export async function archiveConversation(
  supabase: ReturnType<typeof createClient>,
  conversationId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { conversation, error } = await updateConversation(supabase, conversationId, {
    archived: true,
  });

  return { success: !!conversation, error };
}

/**
 * Unarchive a conversation
 */
export async function unarchiveConversation(
  supabase: ReturnType<typeof createClient>,
  conversationId: string
): Promise<{ success: boolean; error: Error | null }> {
  const { conversation, error } = await updateConversation(supabase, conversationId, {
    archived: false,
  });

  return { success: !!conversation, error };
}

/**
 * Delete a conversation (and all its messages via CASCADE)
 */
export async function deleteConversation(
  supabase: ReturnType<typeof createClient>,
  conversationId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Failed to delete conversation'),
    };
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  limit?: number
): Promise<{ messages: Message[]; error: Error | null }> {
  try {
    let query = supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      return { messages: [], error };
    }

    return { messages: data || [], error: null };
  } catch (error) {
    return {
      messages: [],
      error: error instanceof Error ? error : new Error('Failed to get messages'),
    };
  }
}

/**
 * Get conversation statistics for a brand
 */
export async function getConversationStats(
  supabase: ReturnType<typeof createClient>,
  brandId: string
): Promise<{ stats: ConversationStats | null; error: Error | null }> {
  try {
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('id, total_tokens_used, total_cost_usd, archived')
      .eq('brand_id', brandId);

    if (convError) {
      return { stats: null, error: convError };
    }

    const { count: messageCount, error: msgError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversations?.map(c => c.id) || []);

    if (msgError) {
      return { stats: null, error: msgError };
    }

    const stats: ConversationStats = {
      total_conversations: conversations?.length || 0,
      total_messages: messageCount || 0,
      total_tokens_used: conversations?.reduce((sum, c) => sum + c.total_tokens_used, 0) || 0,
      total_cost_usd: conversations?.reduce((sum, c) => sum + Number(c.total_cost_usd), 0) || 0,
      active_conversations: conversations?.filter(c => !c.archived).length || 0,
      archived_conversations: conversations?.filter(c => c.archived).length || 0,
    };

    return { stats, error: null };
  } catch (error) {
    return {
      stats: null,
      error: error instanceof Error ? error : new Error('Failed to get conversation stats'),
    };
  }
}

/**
 * Search conversations by title or content
 */
export async function searchConversations(
  supabase: ReturnType<typeof createClient>,
  brandId: string,
  searchQuery: string,
  limit: number = 20
): Promise<{ conversations: Conversation[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('brand_id', brandId)
      .ilike('title', `%${searchQuery}%`)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { conversations: [], error };
    }

    return { conversations: data || [], error: null };
  } catch (error) {
    return {
      conversations: [],
      error: error instanceof Error ? error : new Error('Failed to search conversations'),
    };
  }
}
