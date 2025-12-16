'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useChat } from '@ai-sdk/react';
import { createClient } from '@/lib/supabase/client';
import { ChatContainer } from '@/components/chat/chat-container';
import { useRouter } from 'next/navigation';

// Types
interface Conversation {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  model: string;
  system_prompt: string | null;
  last_message_at: string;
  created_at: string;
}

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export default function ChatPage() {
  const router = useRouter();
  
  // Create Supabase client (memoized to prevent recreation)
  const supabase = useMemo(() => createClient(), []);
  
  // User and brand state
  const [userId, setUserId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  
  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [dbMessages, setDbMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  
  // Input state (AI SDK 5 requires manual input management)
  const [input, setInput] = useState('');
  
  // Refs for dynamic body values
  const brandIdRef = useRef(brandId);
  const conversationRef = useRef(currentConversation);
  
  useEffect(() => {
    brandIdRef.current = brandId;
    conversationRef.current = currentConversation;
  }, [brandId, currentConversation]);

  // AI Chat hook from Vercel AI SDK 5
  // Note: body is static in v5, so we pass dynamic values at request time
  const {
    messages: aiMessages,
    sendMessage,
    status,
    stop,
    setMessages: setAiMessages,
  } = useChat({
    api: '/api/chat',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFinish: async (message: any) => {
      // Extract text content from message parts or content field
      const content = message.parts
        ?.filter((p: any) => p.type === 'text')
        .map((p: any) => p.text)
        .join('') || message.content || '';
      
      // Save assistant message to database
      if (conversationRef.current && content) {
        await saveMessageToDb({
          conversation_id: conversationRef.current.id,
          role: 'assistant',
          content,
        });
        
        // Update conversation's last_message_at
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', conversationRef.current.id);
      }
    },
  });
  
  // Derive streaming state from status
  const isStreaming = status === 'streaming' || status === 'submitted';

  // Fetch user session and brand info
  useEffect(() => {
    async function fetchUserInfo() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/login?redirect=/chat');
        return;
      }

      setUserId(session.user.id);
      setUserName(session.user.user_metadata?.full_name || session.user.email || 'User');
      setUserAvatar(session.user.user_metadata?.avatar_url || '');

      // Get user's brand
      const { data: brandUser } = await supabase
        .from('brand_users')
        .select('brand_id, brands(name)')
        .eq('user_id', session.user.id)
        .single();

      if (brandUser) {
        setBrandId(brandUser.brand_id);
        setBrandName((brandUser.brands as any)?.name || brandUser.brand_id);
      }
    }

    fetchUserInfo();
  }, [router]);

  // Fetch conversations when brand is set
  useEffect(() => {
    if (!brandId || !userId) return;

    async function fetchConversations() {
      setIsLoadingConversations(true);
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .eq('archived', false)
        .order('last_message_at', { ascending: false });

      if (!error && data) {
        setConversations(data);
      }
      
      setIsLoadingConversations(false);
    }

    fetchConversations();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`conversations:${brandId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `brand_id=eq.${brandId}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId, userId]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!currentConversation) {
      setDbMessages([]);
      setAiMessages([]);
      return;
    }

    async function fetchMessages() {
      if (!currentConversation) return;
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', currentConversation.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch messages:', error.message, error.details, error.hint);
        return;
      }
      
      if (data) {
        setDbMessages(data);
        // Sync with AI messages (AI SDK 5 format)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAiMessages(
          data.map((m: Message) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            parts: [{ type: 'text' as const, text: m.content }],
          })) as any
        );
      }
    }

    fetchMessages();
  }, [currentConversation, setAiMessages]);

  // Save message to database
  const saveMessageToDb = async (message: {
    conversation_id: string;
    role: string;
    content: string;
  }) => {
    const model = currentConversation?.model || 'claude-3-sonnet';
    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...message,
        tokens_used: 0,
        model,
        metadata: {},
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save message:', error.message, error.details, error.hint);
    }
    
    if (!error && data) {
      setDbMessages((prev) => [...prev, data]);
    }

    return data;
  };

  // Create new conversation
  const handleNewChat = useCallback(async () => {
    setCurrentConversation(null);
    setDbMessages([]);
    setAiMessages([]);
  }, [setAiMessages]);

  // Select conversation
  const handleSelectConversation = useCallback(async (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
    }
  }, [conversations]);

  // Delete conversation
  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setDbMessages([]);
        setAiMessages([]);
      }
    }
  }, [currentConversation, setAiMessages]);

  // Archive conversation
  const handleArchiveConversation = useCallback(async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .update({ archived: true })
      .eq('id', conversationId);

    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setDbMessages([]);
        setAiMessages([]);
      }
    }
  }, [currentConversation, setAiMessages]);

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || !brandId || !userId) return;

    let conversation = currentConversation;

    // Create conversation if none exists
    if (!conversation) {
      const title = input.slice(0, 50) + (input.length > 50 ? '...' : '');
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          brand_id: brandId,
          user_id: userId,
          title,
          model: 'claude-3-sonnet', // Stored in DB, mapped to latest Claude in API
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Failed to create conversation:', error);
        return;
      }

      conversation = data;
      setCurrentConversation(data);
      setConversations((prev) => [data, ...prev]);
    }

    if (!conversation) return;

    // Save user message to database
    await saveMessageToDb({
      conversation_id: conversation.id,
      role: 'user',
      content: input,
    });

    // Send to AI (AI SDK 5 uses sendMessage with body at request time)
    const messageText = input;
    setInput('');
    
    // Pass dynamic body values at request time (required in AI SDK 5)
    sendMessage(
      { text: messageText },
      {
        body: {
          brandId: brandIdRef.current,
          conversationId: conversation.id,
          model: conversation.model || 'claude-3-sonnet',
          systemPrompt: conversation.system_prompt,
        },
      }
    );
  }, [input, brandId, userId, currentConversation, sendMessage]);

  // Regenerate last response
  const handleRegenerate = useCallback(async () => {
    // Find last user message and resend
    const lastUserMessage = [...dbMessages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage && currentConversation) {
      setInput(lastUserMessage.content);
      // Remove the last assistant message from UI
      setAiMessages((prev) => prev.slice(0, -1));
    }
  }, [dbMessages, currentConversation, setInput, setAiMessages]);

  // Combined messages for display - extract text from parts (AI SDK 5 format)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const displayMessages = aiMessages.map((m: any) => {
    // Extract text content from message parts or use content directly
    const content = m.parts
      ?.filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('') || m.content || '';
    
    return {
      id: m.id,
      role: m.role as 'user' | 'assistant' | 'system',
      content,
    };
  });

  if (!userId || !brandId) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <ChatContainer
      conversations={conversations}
      currentConversation={currentConversation}
      messages={displayMessages}
      isLoading={isLoadingConversations}
      isStreaming={isStreaming}
      input={input}
      setInput={setInput}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
      onDeleteConversation={handleDeleteConversation}
      onArchiveConversation={handleArchiveConversation}
      onSendMessage={handleSendMessage}
      onStopGeneration={stop}
      onRegenerate={handleRegenerate}
      brandName={brandName}
    />
  );
}
