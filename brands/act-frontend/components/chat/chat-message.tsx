'use client';

import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

export function ChatMessage({
  role,
  content,
  isStreaming = false,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div
      className="group/message fade-in w-full animate-in duration-200"
      data-role={role}
    >
      <div
        className={cn('flex w-full items-start gap-2 md:gap-3', {
          'justify-end': isUser,
          'justify-start': !isUser,
        })}
      >
        {/* Assistant Avatar */}
        {!isUser && (
          <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
            <Sparkles className="size-3.5" />
          </div>
        )}

        {/* Message Content */}
        <div
          className={cn('flex flex-col', {
            'w-full': !isUser,
            'max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]': isUser,
          })}
        >
          <div
            className={cn({
              'w-fit break-words rounded-2xl px-3 py-2 text-white': isUser,
              'bg-transparent px-0 py-0 text-left': !isUser,
            })}
            style={isUser ? { backgroundColor: '#006cff' } : undefined}
          >
            <div className="whitespace-pre-wrap break-words text-sm">
              {content}
              {isStreaming && (
                <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ThinkingMessage() {
  return (
    <div className="group/message w-full animate-in fade-in duration-200">
      <div className="flex w-full items-start gap-2 md:gap-3 justify-start">
        <div className="-mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
          <Sparkles className="size-3.5 animate-pulse" />
        </div>
        <div className="flex flex-col w-full">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span className="animate-pulse">Thinking</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
            <span className="animate-bounce delay-300">.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
