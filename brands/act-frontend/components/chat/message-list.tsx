'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowDown, Wrench, Loader2, Sparkles } from 'lucide-react';
import { ChatMessage, ThinkingMessage, type MessageAttachment, type ToolInvocation } from './chat-message';
import { Greeting } from './greeting';

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
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior });
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

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, streamingContent, isAtBottom, scrollToBottom]);

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
              role={message.role === 'system' ? 'assistant' : message.role}
              content={message.content}
              attachments={message.attachments}
              toolInvocations={message.toolInvocations}
              isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
              // Collaborative chat props
              senderName={message.sender_name}
              senderEmail={message.sender_email}
              isCurrentUser={message.is_current_user}
              isCollaborative={isCollaborativeChat}
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
        onClick={() => scrollToBottom('smooth')}
        type="button"
      >
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
}
