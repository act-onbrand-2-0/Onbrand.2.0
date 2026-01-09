'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowDown, Wrench, Loader2, Sparkles } from 'lucide-react';
import { ChatMessage, ThinkingMessage, type MessageAttachment, type ToolInvocation } from './chat-message';
import { Greeting } from './greeting';

// Reaction types
interface ReactionGroup {
  count: number;
  userIds: string[];
  userReacted: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: MessageAttachment[];
  toolInvocations?: ToolInvocation[];
  // Collaborative chat fields
  user_id?: string;
  sender_name?: string;
  sender_email?: string;
  is_current_user?: boolean;
  created_at?: string;
  metadata?: { type?: string; user_name?: string };
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
  activeToolCall?: string | null;
  isDeepResearchActive?: boolean;
  userName?: string;
  isCollaborativeChat?: boolean;
  typingUsers?: {userId: string; userName: string}[];
  // Reactions props
  reactions?: Record<string, Record<string, ReactionGroup>>;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

export function MessageList({
  messages,
  isLoading = false,
  isStreaming = false,
  streamingContent,
  activeToolCall,
  isDeepResearchActive = false,
  userName,
  isCollaborativeChat = false,
  typingUsers = [],
  reactions = {},
  onToggleReaction,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Use instant scroll during streaming to avoid jitter
  const scrollToBottom = useCallback((instant = false) => {
    if (instant) {
      endRef.current?.scrollIntoView({ behavior: 'instant' });
    } else {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  // Check if scrolled to bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAtBottom(atBottom);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll when new messages arrive - use instant during streaming
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom(isStreaming);
    }
  }, [messages, isAtBottom, scrollToBottom, isStreaming]);
  
  // Throttled scroll during streaming content updates
  const lastScrollRef = useRef(0);
  useEffect(() => {
    if (isAtBottom && isStreaming && streamingContent) {
      const now = Date.now();
      // Only scroll every 100ms during streaming to reduce jitter
      if (now - lastScrollRef.current > 100) {
        lastScrollRef.current = now;
        endRef.current?.scrollIntoView({ behavior: 'instant' });
      }
    }
  }, [streamingContent, isAtBottom, isStreaming]);

  return (
    <div className="relative flex-1">
      <div
        className="absolute inset-0 touch-pan-y overflow-y-auto"
        ref={containerRef}
      >
        <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
          {messages.length === 0 && <Greeting userName={userName} />}

          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              role={message.role}
              content={message.content}
              attachments={message.attachments}
              toolInvocations={message.toolInvocations}
              isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
              // Collaborative chat props
              senderName={message.sender_name}
              senderEmail={message.sender_email}
              isCurrentUser={message.is_current_user}
              isCollaborative={isCollaborativeChat}
              timestamp={message.created_at}
              metadata={message.metadata}
              // Reactions props
              messageId={message.id}
              reactions={reactions[message.id]}
              onToggleReaction={onToggleReaction ? (emoji) => onToggleReaction(message.id, emoji) : undefined}
            />
          ))}

          {isStreaming && streamingContent && messages[messages.length - 1]?.role !== 'assistant' && (
            <ChatMessage
              role="assistant"
              content={streamingContent}
              isStreaming={true}
            />
          )}

          {/* Show loading indicator when waiting for response or while streaming */}
          {((isLoading && !isStreaming) || (isStreaming && !streamingContent) || (isStreaming && streamingContent)) && <ThinkingMessage />}

          {/* Deep Research Active Indicator */}
          {isDeepResearchActive && isStreaming && (
            <div className="flex items-center gap-2 px-3 py-2 mx-auto max-w-fit rounded-lg bg-purple-500/10 border border-purple-500/20 text-sm text-purple-600 dark:text-purple-400 animate-pulse">
              <Sparkles className="size-4" />
              <span>Deep Research mode enabled — thinking deeply...</span>
            </div>
          )}

          {/* Active Tool Call Indicator */}
          {activeToolCall && (
            <div className="flex items-center gap-2 px-3 py-2 mx-auto max-w-fit rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-600 dark:text-blue-400 animate-pulse">
              <Loader2 className="size-4 animate-spin" />
              <Wrench className="size-4" />
              <span>Using tool: <code className="font-mono bg-blue-500/20 px-1.5 py-0.5 rounded">{activeToolCall}</code></span>
            </div>
          )}

          {/* Typing Indicator */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
              <div className="flex gap-1">
                <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="size-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>
                {typingUsers.length === 1 
                  ? `${typingUsers[0].userName} is typing...`
                  : `${typingUsers.map(u => u.userName).join(', ')} are typing...`
                }
              </span>
            </div>
          )}

          <div
            className="min-h-[24px] min-w-[24px] shrink-0"
            ref={endRef}
          />
        </div>
      </div>

      {/* Scroll to bottom button */}
      <button
        aria-label="Scroll to bottom"
        className={`-translate-x-1/2 absolute bottom-4 left-1/2 z-10 rounded-full border bg-background p-2 shadow-lg transition-all hover:bg-muted ${
          isAtBottom
            ? 'pointer-events-none scale-0 opacity-0'
            : 'pointer-events-auto scale-100 opacity-100'
        }`}
        onClick={() => scrollToBottom(false)}
        type="button"
      >
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
}
