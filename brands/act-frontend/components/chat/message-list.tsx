'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowDown } from 'lucide-react';
import { ChatMessage, ThinkingMessage } from './chat-message';
import { Greeting } from './greeting';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  isStreaming?: boolean;
  streamingContent?: string;
}

export function MessageList({
  messages,
  isLoading = false,
  isStreaming = false,
  streamingContent,
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
          {messages.length === 0 && <Greeting />}

          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              role={message.role === 'system' ? 'assistant' : message.role}
              content={message.content}
              isStreaming={isStreaming && index === messages.length - 1 && message.role === 'assistant'}
            />
          ))}

          {isStreaming && streamingContent && messages[messages.length - 1]?.role !== 'assistant' && (
            <ChatMessage
              role="assistant"
              content={streamingContent}
              isStreaming={true}
            />
          )}

          {isLoading && !isStreaming && <ThinkingMessage />}

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
