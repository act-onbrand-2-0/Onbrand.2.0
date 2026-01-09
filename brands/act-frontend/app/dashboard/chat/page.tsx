'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ChatContainer } from '@/components/chat/chat-container';
import { type ModelId, type Attachment, hasAIMention } from '@/components/chat/chat-input';
import { useRouter, useSearchParams } from 'next/navigation';

// Helper to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

// Helper to read file as text
async function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

// Types
interface Project {
  id: string;
  brand_id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_default: boolean;
  archived: boolean;
}

interface ProjectFile {
  id: string;
  project_id: string;
  brand_id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  extracted_text: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  brand_id: string;
  user_id: string;
  project_id: string | null;
  title: string;
  model: string;
  system_prompt: string | null;
  style_preset?: string;
  last_message_at: string;
  created_at: string;
  last_message_preview?: string;
  visibility?: 'private' | 'shared' | null;
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
  const searchParams = useSearchParams();
  const conversationIdFromUrl = searchParams.get('c');
  
  // Create Supabase client (memoized to prevent recreation)
  const supabase = useMemo(() => createClient(), []);
  
  // User and brand state
  const [userId, setUserId] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [jobFunction, setJobFunction] = useState<string | null>(null);
  
  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  
  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [dbMessages, setDbMessages] = useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  
  // Input state (AI SDK 5 requires manual input management)
  const [input, setInput] = useState('');
  
  // Model selection state
  const [selectedModel, setSelectedModel] = useState<ModelId>('claude-4.5');
  
  // Style preset state for new conversations
  const [pendingStylePreset, setPendingStylePreset] = useState<string>('normal');
  
  // Pending project ID for new conversations (doesn't affect UI navigation)
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null);
  
  // MCP server selection state
  const [selectedMcpServerIds, setSelectedMcpServerIds] = useState<string[]>([]);
  
  // Refs for dynamic body values
  const brandIdRef = useRef(brandId);
  const conversationRef = useRef(currentConversation);
  const selectedModelRef = useRef(selectedModel);
  const projectIdRef = useRef(currentProjectId);
  
  useEffect(() => {
    brandIdRef.current = brandId;
    conversationRef.current = currentConversation;
    selectedModelRef.current = selectedModel;
    projectIdRef.current = currentProjectId;
  }, [brandId, currentConversation, selectedModel, currentProjectId]);

  // Simple message state (no AI SDK - it doesn't pass body correctly)
  interface MessageAttachmentDisplay {
    id: string;
    name: string;
    type: 'image' | 'document';
    preview?: string;
    mimeType: string;
  }
  interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    attachments?: MessageAttachmentDisplay[];
    // Collaborative chat fields
    user_id?: string;
    sender_name?: string;
    sender_email?: string;
    is_current_user?: boolean;
    created_at?: string;
    metadata?: { type?: string; user_name?: string };
  }
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const aiMessagesRef = useRef<ChatMessage[]>([]);
  
  // Keep aiMessages ref in sync - critical for avoiding race conditions
  useEffect(() => {
    aiMessagesRef.current = aiMessages;
  }, [aiMessages]);
  
  const [isCollaborativeChat, setIsCollaborativeChat] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{userId: string; userName: string}[]>([]);
  const chatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [activeToolCall, setActiveToolCall] = useState<string | null>(null);
  const [isDeepResearchActive, setIsDeepResearchActive] = useState(false);
  const [pendingAutoSend, setPendingAutoSend] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  // Custom sendMessage that actually works
  const sendMessage = useCallback(async (text: string, attachments?: Attachment[], options?: { useWebSearch?: boolean; useDeepResearch?: boolean; mcpServerIds?: string[] }) => {
    
    // Build attachment display info for UI - convert to base64 for persistence
    const attachmentDisplayInfo: MessageAttachmentDisplay[] = [];
    if (attachments && attachments.length > 0) {
      for (const a of attachments) {
        let preview = a.preview;
        // Convert blob URL to base64 for images so it persists
        if (a.type === 'image' && a.file) {
          preview = await fileToBase64(a.file);
        }
        attachmentDisplayInfo.push({
          id: a.id,
          name: a.file.name,
          type: a.type,
          preview,
          mimeType: a.file.type,
        });
      }
    }
    
    // Add user message with attachments for display
    const userMsg: ChatMessage = { 
      id: crypto.randomUUID(), 
      role: 'user', 
      content: text,
      attachments: attachmentDisplayInfo.length > 0 ? attachmentDisplayInfo : undefined,
      // Include user info for collaborative chat display
      user_id: userId || undefined,
      sender_name: userName || 'You',
      sender_email: userEmail || undefined,
      is_current_user: true,
    };
    setAiMessages(prev => [...prev, userMsg]);
    setStreamingContent('');
    setIsStreaming(true);
    setIsDeepResearchActive(options?.useDeepResearch === true);
    
    try {
      abortControllerRef.current = new AbortController();
      
      // Process attachments for the API
      const processedAttachments: Array<{
        type: 'image' | 'document';
        name: string;
        mimeType: string;
        data: string;
      }> = [];
      
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          if (attachment.type === 'image') {
            // Convert image to base64
            const base64 = await fileToBase64(attachment.file);
            processedAttachments.push({
              type: 'image',
              name: attachment.file.name,
              mimeType: attachment.file.type,
              data: base64,
            });
          } else if (attachment.type === 'document') {
            // For text/markdown files, read as text
            if (attachment.file.type === 'text/plain' || attachment.file.type === 'text/markdown') {
              const textContent = await fileToText(attachment.file);
              processedAttachments.push({
                type: 'document',
                name: attachment.file.name,
                mimeType: attachment.file.type,
                data: textContent,
              });
            } else {
              // For PDFs, convert to base64 (could be processed on server)
              const base64 = await fileToBase64(attachment.file);
              processedAttachments.push({
                type: 'document',
                name: attachment.file.name,
                mimeType: attachment.file.type,
                data: base64,
              });
            }
          }
        }
      }
      
      // Build messages for API - use state directly
      const currentMessages = [...aiMessages, userMsg]
        .map(m => ({ role: m.role, content: m.content || '' }))
        .filter(m => m.content.trim()); // Only filter truly empty messages
      
      // For shared conversations, use the conversation's brand_id (not the user's brand)
      const effectiveBrandId = conversationRef.current?.brand_id || brandIdRef.current;
      
      if (!effectiveBrandId) {
        throw new Error('Brand context not available. Please refresh the page.');
      }
      
      
      const apiBody = {
        brandId: effectiveBrandId,
        conversationId: conversationRef.current?.id,
        projectId: projectIdRef.current || conversationRef.current?.project_id,
        model: selectedModel,
        messages: currentMessages,
        systemPrompt: conversationRef.current?.system_prompt,
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
        useWebSearch: options?.useWebSearch === true ? true : undefined,
        useDeepResearch: options?.useDeepResearch === true ? true : undefined,
        mcpServerIds: options?.mcpServerIds && options.mcpServerIds.length > 0 ? options.mcpServerIds : undefined,
      };
      
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiBody),
        signal: abortControllerRef.current.signal,
      });
      
      if (!response.ok) {
        // Try to parse error message from response
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.details) {
            errorMessage = errorData.details;
          }
        } catch {
          // Response wasn't JSON, use status text
          errorMessage = `Error: ${response.statusText || response.status}`;
        }
        throw new Error(errorMessage);
      }
      
      
      if (!response.body) {
        throw new Error('No response body');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let chunkCount = 0;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (fullContent.length === 0) {
            fullContent = '⚠️ The AI model returned an empty response. This may be a temporary issue - please try again.';
          }
          break;
        }
        
        chunkCount++;
        const chunk = decoder.decode(value, { stream: true });
        
        // Check for tool markers in the chunk
        if (chunk.includes('[TOOL_CALL:')) {
          const match = chunk.match(/\[TOOL_CALL:([^\]]+)\]/);
          if (match) {
            setActiveToolCall(match[1]);
          }
        }
        if (chunk.includes('[TOOL_RESULT:')) {
          setActiveToolCall(null);
        }
        
        fullContent += chunk;
        // Show content without tool markers in the UI
        const displayContent = fullContent
          .replace(/\n?\[TOOL_CALL:[^\]]+\]\n?/g, '')
          .replace(/\n?\[TOOL_RESULT:[^\]]+\]\n?/g, '');
        setStreamingContent(displayContent);
      }
      
      // Clean tool markers from final content
      const cleanContent = fullContent
        .replace(/\n?\[TOOL_CALL:[^\]]+\]\n?/g, '')
        .replace(/\n?\[TOOL_RESULT:[^\]]+\]\n?/g, '');
      
      // Add assistant message after streaming completes
      if (cleanContent) {
        // Generate ID once and use for both local state and DB
        // This prevents duplicate messages from real-time subscription
        const messageId = crypto.randomUUID();
        
        // Clear streaming content FIRST to avoid visual jump, then add message
        setStreamingContent('');
        setActiveToolCall(null);
        setAiMessages(prev => [...prev, { id: messageId, role: 'assistant', content: cleanContent }]);
        
        // Save to DB in background with the SAME ID (don't await to avoid UI delay)
        if (conversationRef.current) {
          const convId = conversationRef.current.id;
          // Fire and forget - save in background with same ID
          saveMessageToDb({
            conversation_id: convId,
            role: 'assistant',
            content: fullContent,
            id: messageId, // Use same ID to prevent duplicate from real-time
          }).then(() => {
            supabase
              .from('conversations')
              .update({ last_message_at: new Date().toISOString() })
              .eq('id', convId);
          }).catch(() => {});
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        // User stopped generation - preserve partial content and save to DB
        setStreamingContent(prev => {
          if (prev && prev.trim()) {
            // Clean tool markers from partial content
            const cleanPartial = prev
              .replace(/\n?\[TOOL_CALL:[^\]]+\]\n?/g, '')
              .replace(/\n?\[TOOL_RESULT:[^\]]+\]\n?/g, '');
            const stoppedContent = cleanPartial + '\n\n*(Generation stopped)*';
            
            // Generate ID once for both local state and DB
            const messageId = crypto.randomUUID();
            
            // Add partial response as a message with indicator
            setAiMessages(messages => [...messages, { 
              id: messageId, 
              role: 'assistant', 
              content: stoppedContent
            }]);
            
            // Save partial response to database with same ID
            if (conversationRef.current) {
              const convId = conversationRef.current.id;
              saveMessageToDb({
                conversation_id: convId,
                role: 'assistant',
                content: stoppedContent,
                id: messageId, // Use same ID to prevent duplicate
              }).then(() => {
                supabase
                  .from('conversations')
                  .update({ last_message_at: new Date().toISOString() })
                  .eq('id', convId);
              }).catch(() => {});
            }
          }
          return ''; // Clear streaming content
        });
      } else {
        // Show error as assistant message
        const errorMessage = (err as Error).message || 'An error occurred while processing your request.';
        setAiMessages(prev => [...prev, { 
          id: crypto.randomUUID(), 
          role: 'assistant', 
          content: `⚠️ **Error:** ${errorMessage}` 
        }]);
      }
    } finally {
      setIsStreaming(false);
      setIsDeepResearchActive(false);
      setActiveToolCall(null);
    }
  }, [aiMessages, selectedModel, supabase, userId, userName, userEmail]);

  // Fetch user session and brand info
  useEffect(() => {
    async function fetchUserInfo() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        router.push('/login?redirect=/chat');
        return;
      }

      setUserId(session.user.id);
      setUserName(session.user.user_metadata?.full_name || '');
      setUserEmail(session.user.email || '');
      setUserAvatar(session.user.user_metadata?.avatar_url || '');

      // Get user's brand and job function
      const { data: brandUser } = await supabase
        .from('brand_users')
        .select('brand_id, job_function, brands(name)')
        .eq('user_id', session.user.id)
        .single();

      if (brandUser) {
        setBrandId(brandUser.brand_id);
        setBrandName((brandUser.brands as any)?.name || brandUser.brand_id);
        setJobFunction(brandUser.job_function || null);
        
        // Redirect to onboarding if job_function is missing
        if (!brandUser.job_function) {
          router.push('/onboarding/function');
          return;
        }
      }
    }

    fetchUserInfo();
  }, [router]);

  // Fetch projects when brand is set
  useEffect(() => {
    if (!brandId || !userId) return;

    async function fetchProjects() {
      setIsLoadingProjects(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .eq('archived', false)
        .order('is_default', { ascending: false })
        .order('name', { ascending: true });

      if (!error && data) {
        setProjects(data);
      }
      
      setIsLoadingProjects(false);
    }

    fetchProjects();

    // Subscribe to realtime updates for projects
    const channel = supabase
      .channel(`projects:${brandId}:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `brand_id=eq.${brandId}`,
        },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [brandId, userId, supabase]);

  // Fetch conversations when brand is set
  useEffect(() => {
    if (!brandId || !userId) return;

    async function fetchConversations() {
      setIsLoadingConversations(true);
      
      // If we have a conversation ID from URL, first check for and accept any pending shares
      if (conversationIdFromUrl) {
        try {
          // Check for pending shares for this conversation
          const shareResponse = await fetch(`/api/conversation-shares?conversationId=${conversationIdFromUrl}&myShares=true`);
          if (shareResponse.ok) {
            const shareData = await shareResponse.json();
            const pendingShare = shareData.shares?.find((s: any) => s.status === 'pending');
            if (pendingShare) {
              // Accept the pending share before fetching conversation
              await fetch('/api/conversation-shares', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ shareId: pendingShare.id, action: 'accept' }),
              });
            }
          }
        } catch (err) {
          // Silent fail for share check
        }
      }
      
      // Fetch user's own conversations
      const { data, error } = await supabase
        .from('conversations')
        .select('*, user_id')
        .eq('brand_id', brandId)
        .eq('archived', false)
        .order('last_message_at', { ascending: false });

      // Fetch shared conversations (single chats shared directly)
      let sharedConversations: any[] = [];
      try {
        const sharedResponse = await fetch('/api/shared-conversation/list');
        if (sharedResponse.ok) {
          const sharedData = await sharedResponse.json();
          // Mark these as directly shared (read-only)
          sharedConversations = (sharedData.conversations || []).map((c: any) => ({
            ...c,
            _isDirectlyShared: true // Flag for read-only access
          }));
        }
      } catch (err) {
        // Silent fail
      }

      // Auto-accept pending project shares before fetching
      try {
        const pendingProjSharesRes = await fetch('/api/project-shares?myShares=true');
        if (pendingProjSharesRes.ok) {
          const pendingData = await pendingProjSharesRes.json();
          const pendingShares = (pendingData.shares || []).filter((s: any) => s.status === 'pending');
          for (const share of pendingShares) {
            await fetch('/api/project-shares', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ shareId: share.id, action: 'accept' }),
            });
          }
        }
      } catch (err) {
        // Silent fail
      }

      // Fetch shared projects and their conversations
      let sharedProjects: any[] = [];
      let sharedProjectConversations: any[] = [];
      try {
        const sharedProjResponse = await fetch('/api/shared-projects/list');
        if (sharedProjResponse.ok) {
          const sharedProjData = await sharedProjResponse.json();
          sharedProjects = sharedProjData.projects || [];
          // Mark conversations from shared projects (collaborative - can write)
          sharedProjectConversations = (sharedProjData.conversations || []).map((c: any) => ({
            ...c,
            _isFromSharedProject: true // Flag for collaborative access
          }));
          // Store shared projects in state
          setProjects(prev => {
            const ownedIds = new Set(prev.map(p => p.id));
            const uniqueSharedProjects = sharedProjects.filter((p: any) => !ownedIds.has(p.id));
            return [...prev, ...uniqueSharedProjects.map((p: any) => ({ ...p, _isShared: true }))];
          });
        }
      } catch (err) {
        // Silent fail
      }

      if (!error && data) {
        // Merge owned, shared conversations, and shared project conversations
        const ownedIds = new Set(data.map((c: any) => c.id));
        const uniqueDirectlyShared = sharedConversations.filter((c: any) => !ownedIds.has(c.id));
        const uniqueFromProjects = sharedProjectConversations.filter((c: any) => 
          !ownedIds.has(c.id) && !uniqueDirectlyShared.some((s: any) => s.id === c.id)
        );
        const allConversations = [...data, ...uniqueDirectlyShared, ...uniqueFromProjects];
        setConversations(allConversations);
        
        // Auto-select conversation from URL param if present
        if (conversationIdFromUrl && !currentConversation) {
          const targetConv = data.find((c: Conversation) => c.id === conversationIdFromUrl);
          if (targetConv) {
            setCurrentConversation(targetConv);
            // Clear the URL param after selecting (cleaner URL)
            router.replace('/chat', { scroll: false });
          } else {
            // Conversation not in user's brand list - might be a shared conversation from another brand
            // Use API endpoint to fetch (bypasses RLS using service client)
            try {
              const response = await fetch(`/api/shared-conversation?conversationId=${conversationIdFromUrl}`);
              if (response.ok) {
                const { conversation: sharedConv } = await response.json();
                if (sharedConv) {
                  setCurrentConversation(sharedConv);
                  // Add to conversations list for sidebar display
                  setConversations(prev => [sharedConv, ...prev.filter(c => c.id !== sharedConv.id)]);
                  router.replace('/chat', { scroll: false });
                }
              }
            } catch (err) {
              // Silent fail
            }
          }
        }
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
  }, [brandId, userId, supabase, conversationIdFromUrl, router]);

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!currentConversation) {
      setDbMessages([]);
      setAiMessages([]);
      return;
    }

    async function fetchMessages() {
      if (!currentConversation) return;
      
      // Check if this is a shared conversation (user doesn't own it)
      const isSharedConversation = currentConversation.user_id !== userId;
      
      let data: any[] | null = null;
      let error: any = null;
      let isCollaborative = false;
      
      if (isSharedConversation) {
        // Use collaborative-messages API for shared conversations (includes sender info)
        try {
          const response = await fetch(`/api/collaborative-messages?conversationId=${currentConversation.id}`);
          if (response.ok) {
            const result = await response.json();
            data = result.messages;
            isCollaborative = result.isCollaborative;
            setIsCollaborativeChat(isCollaborative);
          } else {
            // Fallback to regular shared messages API
            const fallbackResponse = await fetch(`/api/shared-conversation/messages?conversationId=${currentConversation.id}`);
            if (fallbackResponse.ok) {
              const result = await fallbackResponse.json();
              data = result.messages;
            } else {
              error = { message: 'Failed to fetch shared messages' };
            }
          }
        } catch (err) {
          error = { message: 'Error fetching shared messages' };
        }
      } else {
        // For own conversations, also check if it's collaborative (has write shares)
        try {
          const response = await fetch(`/api/collaborative-messages?conversationId=${currentConversation.id}`);
          if (response.ok) {
            const result = await response.json();
            data = result.messages;
            isCollaborative = result.isCollaborative;
            setIsCollaborativeChat(isCollaborative);
          } else {
            // Fallback to direct Supabase query
            const result = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', currentConversation.id)
              .order('created_at', { ascending: true });
            data = result.data;
            error = result.error;
            setIsCollaborativeChat(false);
          }
        } catch {
          // Fallback to direct Supabase query
          const result = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', currentConversation.id)
            .order('created_at', { ascending: true });
          data = result.data;
          error = result.error;
          setIsCollaborativeChat(false);
        }
      }

      if (error) return;
      
      if (data) {
        setDbMessages(data);
        // Sync with AI messages - preserve any attachments from current session
        setAiMessages(prev => {
          // Create a map of existing attachments by message content (since DB IDs differ from client IDs)
          const attachmentMap = new Map<string, MessageAttachmentDisplay[]>();
          prev.forEach(m => {
            if (m.attachments && m.attachments.length > 0) {
              attachmentMap.set(m.content, m.attachments);
            }
          });
          
          // Map DB messages and restore any attachments + collaborative info
          return data.map((m: any) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            // Try to restore attachments by matching content
            attachments: attachmentMap.get(m.content),
            // Collaborative chat fields
            user_id: m.user_id,
            sender_name: m.sender_name,
            sender_email: m.sender_email,
            is_current_user: m.is_current_user,
            created_at: m.created_at,
            metadata: m.metadata,
          }));
        });
      }
    }

    fetchMessages();
  }, [currentConversation, setAiMessages, userId, supabase]);

  // Real-time subscription to detect when conversation becomes collaborative
  useEffect(() => {
    if (!currentConversation || !userId) return;

    // Subscribe to conversation_shares changes for this conversation
    const sharesChannel = supabase
      .channel(`shares-${currentConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_shares',
          filter: `conversation_id=eq.${currentConversation.id}`,
        },
        async (payload) => {
          // Re-check if conversation is now collaborative
          try {
            const response = await fetch(`/api/collaborative-messages?conversationId=${currentConversation.id}`);
            if (response.ok) {
              const result = await response.json();
              if (result.isCollaborative !== isCollaborativeChat) {
                setIsCollaborativeChat(result.isCollaborative);
              }
            }
          } catch (err) {
            // Silent fail
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sharesChannel);
    };
  }, [currentConversation?.id, userId, supabase, isCollaborativeChat]);

  // Real-time subscription for collaborative chat messages AND typing indicators
  // Using broadcast channel which doesn't require RLS - more reliable for real-time sync
  useEffect(() => {
    if (!currentConversation || !userId) return;
    
    const isOwner = currentConversation.user_id === userId;
    
    const handleNewMessage = async (payload: any) => {
      const newMessage = payload.new || payload;

      // Skip messages from current user - we already add them locally
      // This prevents duplicates when saveMessageToDb broadcasts
      if (newMessage.user_id === userId) {
        return;
      }
      

      // Fetch sender info for the new message
      let senderName = 'User';
      let senderEmail = '';
      
      if (newMessage.user_id && newMessage.role === 'user') {
        try {
          const res = await fetch(`/api/user-info?userId=${newMessage.user_id}`);
          if (res.ok) {
            const userData = await res.json();
            senderName = userData.name || 'User';
            senderEmail = userData.email || '';
          }
        } catch (err) {
          // Silent fail
        }
      } else if (newMessage.role === 'assistant') {
        senderName = 'Assistant';
      } else if (newMessage.role === 'system') {
        senderName = 'System';
      }

      const enrichedMessage: ChatMessage = {
        id: newMessage.id,
        role: newMessage.role,
        content: newMessage.content,
        user_id: newMessage.user_id,
        sender_name: senderName,
        sender_email: senderEmail,
        is_current_user: false,
        created_at: newMessage.created_at,
        metadata: newMessage.metadata,
      };

      setAiMessages(current => {
        if (current.some(m => m.id === newMessage.id)) return current;
        return [...current, enrichedMessage];
      });
      
      // Clear typing indicator for this user when they send a message
      if (newMessage.user_id) {
        setTypingUsers(current => current.filter(u => u.userId !== newMessage.user_id));
      }
    };

    // Handle typing indicator broadcasts
    const handleTypingEvent = (payload: any) => {
      const { userId: typingUserId, userName: typingUserName, isTyping } = payload;
      
      // Ignore own typing events
      if (typingUserId === userId) return;
      
      setTypingUsers(current => {
        if (isTyping) {
          // Add user if not already in list
          if (!current.some(u => u.userId === typingUserId)) {
            return [...current, { userId: typingUserId, userName: typingUserName }];
          }
          return current;
        } else {
          // Remove user from typing list
          return current.filter(u => u.userId !== typingUserId);
        }
      });
    };

    // Create channel with broadcast for messages and typing indicators
    const channel = supabase
      .channel(`chat-room-${currentConversation.id}`, {
        config: { broadcast: { self: false } }
      })
      // Listen for postgres_changes (primary sync method)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversation.id}`,
        },
        (payload) => handleNewMessage(payload)
      )
      // Listen for broadcast messages (backup sync method - doesn't need RLS)
      .on('broadcast', { event: 'new_message' }, (payload: any) => {
        if (payload.payload) {
          handleNewMessage(payload.payload);
        }
      })
      // Listen for typing indicators
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload.payload) {
          handleTypingEvent(payload.payload);
        }
      })
      .subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          // Store channel reference for broadcasting messages
          chatChannelRef.current = channel;
          
          // Check and update collaborative status once subscribed
          if (isOwner && !isCollaborativeChat) {
            fetch(`/api/collaborative-messages?conversationId=${currentConversation.id}`)
              .then(res => res.ok ? res.json() : null)
              .then(result => {
                if (result?.isCollaborative) {
                  setIsCollaborativeChat(true);
                }
              })
              .catch(() => {});
          }
        }
      });

    return () => {
      chatChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [currentConversation?.id, currentConversation?.user_id, userId, supabase, setAiMessages]);

  // Broadcast typing indicator when user is typing
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingBroadcast = useRef<number>(0);
  
  const broadcastTyping = useCallback((isTyping: boolean) => {
    if (!currentConversation || !userId || !chatChannelRef.current) return;
    
    const now = Date.now();
    // Throttle typing broadcasts to once per second
    if (isTyping && now - lastTypingBroadcast.current < 1000) return;
    lastTypingBroadcast.current = now;
    
    chatChannelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        userId,
        userName: userName || 'User',
        isTyping
      }
    }).catch(() => {});
  }, [currentConversation?.id, userId, userName]);

  // Handle input change to broadcast typing
  const handleInputChange = useCallback((value: string) => {
    setInput(value);
    
    // Broadcast typing start
    if (value.trim()) {
      broadcastTyping(true);
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to stop typing indicator after 3 seconds of no input
      typingTimeoutRef.current = setTimeout(() => {
        broadcastTyping(false);
      }, 3000);
    } else {
      // Input is empty, stop typing
      broadcastTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }, [broadcastTyping]);

  // Stop typing broadcast when message is sent
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle initial message from dashboard
  const initialMessageHandled = useRef(false);
  const pendingDashboardMessage = useRef<string | null>(null);
  
  useEffect(() => {
    // Only run once after brandId and userId are set
    if (!brandId || !userId || initialMessageHandled.current) return;
    
    const initialMessage = sessionStorage.getItem('dashboard_initial_message');
    if (initialMessage) {
      // Clear it immediately to prevent re-triggering
      sessionStorage.removeItem('dashboard_initial_message');
      initialMessageHandled.current = true;
      pendingDashboardMessage.current = initialMessage;
      
      // Set the input
      setInput(initialMessage);
      
      // Clear current conversation to start fresh
      setCurrentConversation(null);
      setDbMessages([]);
      setAiMessages([]);
    }
  }, [brandId, userId, setAiMessages]);

  // Auto-send dashboard message after input is set
  useEffect(() => {
    if (pendingDashboardMessage.current && input && brandId && userId) {
      const messageToSend = pendingDashboardMessage.current;
      pendingDashboardMessage.current = null;
      
      // Create conversation and send message
      const createAndSend = async () => {
        // Create the conversation first
        const title = messageToSend.slice(0, 50) + (messageToSend.length > 50 ? '...' : '');
        
        const { data: newConversation, error } = await supabase
          .from('conversations')
          .insert({
            brand_id: brandId,
            user_id: userId,
            project_id: currentProjectId,
            title,
            model: selectedModel,
          })
          .select()
          .single();

        if (error) return;

        if (newConversation) {
          // Set the conversation
          setCurrentConversation(newConversation);
          setConversations((prev) => [newConversation, ...prev]);
          
          // Save user message to database (include user_id for collaborative chat support)
          await supabase.from('messages').insert({
            conversation_id: newConversation.id,
            role: 'user',
            content: messageToSend,
            tokens_used: 0,
            model: selectedModel,
            metadata: {},
            user_id: userId, // Track who sent this message for collaborative chats
          });
          
          // Clear input and send to AI
          setInput('');
          sendMessage(messageToSend);
        }
      };
      
      createAndSend();
    }
  }, [input, brandId, userId, currentProjectId, selectedModel, supabase, sendMessage]);

  // Save message to database and broadcast for real-time sync
  const saveMessageToDb = async (message: {
    conversation_id: string;
    role: string;
    content: string;
    user_id?: string; // For collaborative chats - track who sent the message
    id?: string; // Optional pre-generated ID to prevent duplicates from real-time
  }) => {
    const model = currentConversation?.model || 'claude-3-sonnet';
    const messageUserId = message.role === 'user' ? (message.user_id || userId) : null;
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        ...(message.id ? { id: message.id } : {}), // Use provided ID if given
        conversation_id: message.conversation_id,
        role: message.role,
        content: message.content,
        tokens_used: 0,
        model,
        metadata: {},
        // Include user_id for user messages in collaborative chats
        user_id: messageUserId,
      })
      .select()
      .single();

    
    if (!error && data) {
      setDbMessages((prev) => [...prev, data]);
      
      // Broadcast the message for immediate real-time delivery to other users
      // Try multiple methods to ensure broadcast works
      if (chatChannelRef.current) {
        try {
          await chatChannelRef.current.send({
            type: 'broadcast',
            event: 'new_message',
            payload: {
              ...data,
              sender_name: message.role === 'user' ? userName : 'Assistant',
              sender_email: message.role === 'user' ? userEmail : null,
            }
          });
        } catch (err) {
          // Fallback: try creating a new channel connection
          try {
            const fallbackChannel = supabase.channel(`chat-room-${message.conversation_id}`);
            await fallbackChannel.send({
              type: 'broadcast',
              event: 'new_message',
              payload: {
                ...data,
                sender_name: message.role === 'user' ? userName : 'Assistant',
                sender_email: message.role === 'user' ? userEmail : null,
              }
            });
          } catch (fallbackErr) {
            // Silent fail
          }
        }
      } else {
        // Try creating a channel and sending directly
        try {
          const directChannel = supabase.channel(`chat-room-${message.conversation_id}`);
          await directChannel.send({
            type: 'broadcast',
            event: 'new_message',
            payload: {
              ...data,
              sender_name: message.role === 'user' ? userName : 'Assistant',
              sender_email: message.role === 'user' ? userEmail : null,
            }
          });
        } catch (err) {
          // Silent fail
        }
      }
    }

    return data;
  };

  // Create new conversation - clears current chat and shows empty state
  const handleNewChat = useCallback((projectId?: string, initialMessage?: string) => {
    setCurrentConversation(null);
    setDbMessages([]);
    setAiMessages([]);
    setPendingStylePreset('normal'); // Reset pending style to normal
    setPendingProjectId(null); // Reset pending project
    // If projectId provided, set it as current project
    if (projectId) {
      setCurrentProjectId(projectId);
    }
    // Set initial message if provided, otherwise clear input
    setInput(initialMessage || '');
    // If there's an initial message, trigger auto-send
    if (initialMessage?.trim()) {
      setPendingAutoSend(initialMessage.trim());
    }
  }, [setAiMessages, setInput]);

  // Select conversation
  const handleSelectConversation = useCallback(async (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      // Reset pending style when selecting an existing conversation
      setPendingStylePreset(conversation.style_preset || 'normal');
      setPendingProjectId(null); // Reset pending project
      // Sync model selector with conversation's model
      // Map legacy model names to new ones
      const modelMap: Record<string, ModelId> = {
        'claude-4.5': 'claude-4.5',
        'gpt-5.2': 'gpt-5.2',
        'gemini-3.1': 'gemini-3.1',
        // Legacy mappings
        'claude-3-sonnet': 'claude-4.5',
        'claude-3-opus': 'claude-4.5',
        'gpt-4o': 'gpt-5.2',
        'gpt-4': 'gpt-5.2',
      };
      const mappedModel = modelMap[conversation.model];
      if (mappedModel) {
        setSelectedModel(mappedModel);
      }
    }
  }, [conversations]);

  // Delete conversation
  const handleDeleteConversation = useCallback(async (conversationId: string) => {
    
    // First delete all messages for this conversation
    const { error: msgError } = await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);


    // Then delete the conversation
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      alert(`Failed to delete: ${error.message}`);
      return;
    }
    setConversations((prev) => prev.filter((c) => c.id !== conversationId));
    if (currentConversation?.id === conversationId) {
      setCurrentConversation(null);
      setDbMessages([]);
      setAiMessages([]);
    }
  }, [currentConversation, setAiMessages, supabase]);

  // Rename conversation
  const handleRenameConversation = useCallback(async (conversationId: string, newTitle: string) => {
    
    const { error } = await supabase
      .from('conversations')
      .update({ title: newTitle })
      .eq('id', conversationId);

    if (error) {
      alert(`Failed to rename: ${error.message}`);
      return;
    }

    // Update local state
    setConversations((prev) => 
      prev.map((c) => c.id === conversationId ? { ...c, title: newTitle } : c)
    );
    
    // Update current conversation if it's the one being renamed
    if (currentConversation?.id === conversationId) {
      setCurrentConversation((prev) => prev ? { ...prev, title: newTitle } : null);
    }
  }, [currentConversation, supabase]);

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

  // Toggle conversation visibility
  const handleToggleVisibility = useCallback(async (conversationId: string, visibility: 'private' | 'shared') => {
    const { error } = await supabase
      .from('conversations')
      .update({ visibility })
      .eq('id', conversationId);

    if (!error) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, visibility } : c
        )
      );
      if (currentConversation?.id === conversationId) {
        setCurrentConversation((prev) =>
          prev ? { ...prev, visibility } : prev
        );
      }
    }
  }, [currentConversation, supabase]);

  // Toggle project visibility
  const handleToggleProjectVisibility = useCallback(async (projectId: string, visibility: 'private' | 'shared') => {
    const { error } = await supabase
      .from('projects')
      .update({ visibility })
      .eq('id', projectId);

    if (!error) {
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, visibility } : p))
      );
    }
  }, [supabase]);

  // Project handlers
  const handleSelectProject = useCallback((projectId: string | null) => {
    setCurrentProjectId(projectId);
    // Clear current conversation to show project view
    if (projectId) {
      setCurrentConversation(null);
      setDbMessages([]);
      setAiMessages([]);
    }
  }, [setAiMessages]);

  // Move the current conversation to a specific project (reassign)
  const handleMoveConversationToProject = useCallback(async (projectId: string) => {
    if (!currentConversation) {
      // No open conversation: store the project ID for when conversation is created
      // Don't change currentProjectId to avoid navigating away
      setPendingProjectId(projectId);
      return;
    }
    if (currentConversation.project_id === projectId) {
      return;
    }
    // Update in DB
    const { error } = await supabase
      .from('conversations')
      .update({ project_id: projectId })
      .eq('id', currentConversation.id);
    if (error) {
      alert(`Failed to move conversation: ${error.message}`);
      return;
    }
    // Update local state
    setCurrentConversation(prev => prev ? { ...prev, project_id: projectId } : prev);
    setConversations(prev => prev.map(c => c.id === currentConversation.id ? { ...c, project_id: projectId } : c));
  }, [currentConversation, supabase]);

  const handleClearProject = useCallback(() => {
    // Clear pending project for new conversations
    setPendingProjectId(null);
    
    // If there's an existing conversation, move it to null (General)
    if (currentConversation && currentConversation.project_id) {
      supabase
        .from('conversations')
        .update({ project_id: null })
        .eq('id', currentConversation.id)
        .then(({ error }) => {
          if (error) return;
          // Update local state
          setCurrentConversation(prev => prev ? { ...prev, project_id: null } : prev);
          setConversations(prev => prev.map(c => c.id === currentConversation.id ? { ...c, project_id: null } : c));
        });
    }
  }, [currentConversation, supabase]);

  const handleStyleChange = useCallback(async (style: string) => {
    if (!currentConversation) {
      // No conversation yet - store for when conversation is created
      setPendingStylePreset(style);
      return;
    }
    
    const { error } = await supabase
      .from('conversations')
      .update({ style_preset: style })
      .eq('id', currentConversation.id);
    
    if (error) return;
    
    // Update local state
    setCurrentConversation(prev => prev ? { ...prev, style_preset: style } : prev);
    setConversations(prev => 
      prev.map(c => c.id === currentConversation.id ? { ...c, style_preset: style } : c)
    );
  }, [currentConversation, supabase]);

  const handleCreateProject = useCallback(async (name: string, color?: string): Promise<string | undefined> => {
    if (!brandId || !userId) return undefined;
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        brand_id: brandId,
        user_id: userId,
        name,
        color: color || '#6366f1',
        icon: 'folder',
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      alert(`Failed to create project: ${error.message}`);
      return undefined;
    }

    if (data) {
      setProjects((prev) => [...prev, data]);
      setCurrentProjectId(data.id);
      return data.id;
    }
    return undefined;
  }, [brandId, userId, supabase]);

  const handleDeleteProject = useCallback(async (projectId: string) => {
    // Prevent deleting default project
    const project = projects.find((p) => p.id === projectId);
    if (project?.is_default) {
      alert('Cannot delete the default project');
      return;
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      alert(`Failed to delete project: ${error.message}`);
      return;
    }

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (currentProjectId === projectId) {
      setCurrentProjectId(null);
    }
  }, [projects, currentProjectId, supabase]);

  const handleRenameProject = useCallback(async (projectId: string, name: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ name })
      .eq('id', projectId);

    if (error) {
      alert(`Failed to rename project: ${error.message}`);
      return;
    }

    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, name } : p))
    );
  }, [supabase]);

  // Project files state
  const [projectFiles, setProjectFiles] = useState<Record<string, ProjectFile[]>>({});

  // Fetch project files
  useEffect(() => {
    if (!brandId || !userId || projects.length === 0) return;

    async function fetchProjectFiles() {
      const projectIds = projects.map((p) => p.id);
      const { data, error } = await supabase
        .from('project_files')
        .select('*')
        .in('project_id', projectIds)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Group files by project
        const grouped = data.reduce((acc, file) => {
          if (!acc[file.project_id]) {
            acc[file.project_id] = [];
          }
          acc[file.project_id].push(file);
          return acc;
        }, {} as Record<string, ProjectFile[]>);
        setProjectFiles(grouped);
      }
    }

    fetchProjectFiles();
  }, [brandId, userId, projects, supabase]);
  

  // File upload handler
  const handleUploadFile = useCallback(async (projectId: string, file: File) => {
    if (!brandId || !userId) return;

    // Upload to storage
    const filePath = `${projectId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, file);

    if (uploadError) {
      alert(`Failed to upload file: ${uploadError.message}`);
      return;
    }

    // Create file record
    const { data, error } = await supabase
      .from('project_files')
      .insert({
        project_id: projectId,
        brand_id: brandId,
        user_id: userId,
        name: file.name,
        file_path: filePath,
        file_type: file.type,
        file_size: file.size,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      alert(`Failed to create file record: ${error.message}`);
      return;
    }

    if (data) {
      
      setProjectFiles((prev) => ({
        ...prev,
        [projectId]: [data, ...(prev[projectId] || [])],
      }));

      // Trigger file processing in the background
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      
      const session = await supabase.auth.getSession();
      
      fetch(`${supabaseUrl}/functions/v1/process-project-file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ file_id: data.id }),
      }).then(async (res) => {
        const result = await res.json();
        if (res.ok && result.success) {
          // Update local state when processing completes
          setProjectFiles((prev) => ({
            ...prev,
            [projectId]: (prev[projectId] || []).map((f) =>
              f.id === data.id ? { ...f, status: 'ready' as const } : f
            ),
          }));
        }
      }).catch(() => {});
    }
  }, [brandId, userId, supabase]);

  // File delete handler
  const handleDeleteFile = useCallback(async (fileId: string) => {
    // Find the file to get its path
    let fileToDelete: ProjectFile | undefined;
    let projectId: string | undefined;
    for (const [pid, files] of Object.entries(projectFiles)) {
      const file = files.find((f) => f.id === fileId);
      if (file) {
        fileToDelete = file;
        projectId = pid;
        break;
      }
    }

    if (!fileToDelete || !projectId) return;

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('project-files')
      .remove([fileToDelete.file_path]);


    // Delete record
    const { error } = await supabase
      .from('project_files')
      .delete()
      .eq('id', fileId);

    if (error) {
      alert(`Failed to delete file: ${error.message}`);
      return;
    }

    setProjectFiles((prev) => ({
      ...prev,
      [projectId!]: (prev[projectId!] || []).filter((f) => f.id !== fileId),
    }));
  }, [projectFiles, supabase]);

  // Send message
  const handleSendMessage = useCallback(async (attachments?: Attachment[], options?: { useWebSearch?: boolean; useDeepResearch?: boolean; mcpServerIds?: string[] }) => {
    // Allow sending if there's input text OR attachments
    const hasContent = input.trim() || (attachments && attachments.length > 0);
    
    // For shared chats, use conversation's brand_id if user's brandId is not set
    const effectiveBrandId = brandId || currentConversation?.brand_id;
    
    if (!hasContent || !effectiveBrandId || !userId) return;

    let conversation = currentConversation;

    // Create conversation if none exists (or we intentionally reset above)
    if (!conversation) {
      const titleBase = input.trim() || 
        (attachments?.[0]?.file.name ? `Attached: ${attachments[0].file.name}` : 'New Chat');
      const title = titleBase.slice(0, 50) + (titleBase.length > 50 ? '...' : '');
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          brand_id: effectiveBrandId,
          user_id: userId,
          project_id: pendingProjectId || currentProjectId,
          title,
          model: selectedModel,
          style_preset: pendingStylePreset,
        })
        .select()
        .single();

      if (error) {
        alert(`Failed to create conversation: ${error.message}`);
        return;
      }
      
      if (!data) return;
      conversation = data;
      setCurrentConversation(data);
      setConversations((prev) => [data, ...prev]);
    }

    if (!conversation) return;

    // Build content for DB (include attachment names if any)
    let dbContent = input;
    if (attachments && attachments.length > 0) {
      const attachmentNames = attachments.map(a => a.file.name).join(', ');
      dbContent = input.trim() ? input : `[Attached: ${attachmentNames}]`;
    }

    // Save user message to database - include user_id for real-time dedup
    await saveMessageToDb({
      conversation_id: conversation.id,
      role: 'user',
      content: dbContent,
      user_id: userId || undefined,
    });

    // Send to AI
    const messageText = input;
    setInput('');
    
    // Everyone can talk to AI in all chats (collaborative or not)
    sendMessage(messageText, attachments, options);
  }, [input, brandId, userId, currentConversation, currentProjectId, sendMessage, selectedModel, supabase, pendingProjectId, pendingStylePreset, isCollaborativeChat, userName, userEmail]);

  // Regenerate last response
  const handleRegenerate = useCallback(async () => {
    // Find last user message and resend
    const lastUserMessage = [...dbMessages].reverse().find((m) => m.role === 'user');
    if (lastUserMessage && currentConversation) {
      setInput(lastUserMessage.content);
      // Remove the last assistant message from UI
      setAiMessages((prev) => prev.slice(0, -1));
    }
  }, [dbMessages, currentConversation]);

  // Auto-send message when pendingAutoSend has a message (from project view)
  useEffect(() => {
    if (pendingAutoSend && brandId && userId && !isStreaming) {
      const messageToSend = pendingAutoSend;
      setPendingAutoSend(null);
      // Small delay to ensure state is settled, then call sendMessage directly
      const timer = setTimeout(() => {
        sendMessage(messageToSend);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pendingAutoSend, brandId, userId, isStreaming, sendMessage]);

  // Messages are already in the correct format - include attachments and collaborative info for display
  const displayMessages = aiMessages.map(m => ({
    id: m.id,
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content,
    attachments: m.attachments,
    // Collaborative chat fields
    user_id: m.user_id,
    sender_name: m.sender_name,
    sender_email: m.sender_email,
    is_current_user: m.is_current_user,
    created_at: m.created_at,
    metadata: m.metadata,
  }));

  if (!userId || !brandId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <ChatContainer
      conversations={conversations}
      currentConversation={currentConversation}
      messages={displayMessages}
      isLoading={isLoadingConversations || isLoadingProjects}
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      activeToolCall={activeToolCall}
      isDeepResearchActive={isDeepResearchActive}
      input={input}
      selectedModel={selectedModel}
      projects={projects}
      projectFiles={projectFiles}
      currentProjectId={currentProjectId}
      setInput={setInput}
      onNewChat={handleNewChat}
      onSelectConversation={handleSelectConversation}
      onDeleteConversation={handleDeleteConversation}
      onArchiveConversation={handleArchiveConversation}
      onToggleVisibility={handleToggleVisibility}
      onToggleProjectVisibility={handleToggleProjectVisibility}
      onSendMessage={handleSendMessage}
      onStopGeneration={stop}
      onRegenerate={handleRegenerate}
      onModelChange={setSelectedModel}
      onSelectProject={handleSelectProject}
      onCreateProject={handleCreateProject}
      onDeleteProject={handleDeleteProject}
      onRenameProject={handleRenameProject}
      onUploadFile={handleUploadFile}
      onDeleteFile={handleDeleteFile}
      onMoveConversationToProject={handleMoveConversationToProject}
      onClearProject={handleClearProject}
      onStyleChange={handleStyleChange}
      pendingStylePreset={pendingStylePreset}
      pendingProjectId={pendingProjectId}
      brandId={brandId}
      selectedMcpServerIds={selectedMcpServerIds}
      onMcpServerSelectionChange={setSelectedMcpServerIds}
      brandName={brandName}
      currentUserId={userId}
      userName={userName}
      userEmail={userEmail}
      jobFunction={jobFunction}
      isReadOnly={!!(currentConversation as any)?._isDirectlyShared && currentConversation?.user_id !== userId && !isCollaborativeChat}
      isCollaborativeChat={isCollaborativeChat}
      typingUsers={typingUsers}
      onInputChange={handleInputChange}
    />
  );
}
