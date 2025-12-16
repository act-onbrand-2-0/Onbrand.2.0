'use client';

import { useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowUp, Square, Paperclip, Sparkles, ChevronDown } from 'lucide-react';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isStreaming?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  model?: string;
}

export function ChatInput({
  input,
  setInput,
  onSubmit,
  onStop,
  isStreaming = false,
  isLoading = false,
  placeholder = 'Send a message...',
  disabled = false,
  model = 'GPT-4o Mini',
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, []);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isLoading && !isStreaming && input.trim()) {
        onSubmit();
        resetHeight();
      }
    }
  };

  const handleSubmit = () => {
    if (!disabled && !isLoading && !isStreaming && input.trim()) {
      onSubmit();
      resetHeight();
    }
  };

  const isReady = !isStreaming && !isLoading;
  const canSend = isReady && input.trim();

  return (
    <div className="relative flex w-full flex-col">
      <div className="rounded-2xl border border-border bg-muted/50 overflow-hidden">
        {/* Textarea Row */}
        <div className="px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className={cn(
              'w-full min-h-[24px] max-h-[200px] resize-none bg-transparent text-sm',
              'focus:outline-none',
              'placeholder:text-muted-foreground',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
            rows={1}
          />
        </div>

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-border/50">
          {/* Left side - Attachment + Model Selector */}
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
              disabled={disabled || !isReady}
            >
              <Paperclip className="size-4" />
              <span className="sr-only">Attach file</span>
            </Button>
            
            {/* Model Selector */}
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Sparkles className="size-3.5" />
              <span>{model}</span>
              <ChevronDown className="size-3" />
            </button>
          </div>

          {/* Right side - Send/Stop Button */}
          <div className="flex items-center">
            {isStreaming ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-lg"
                onClick={onStop}
              >
                <Square className="size-4 fill-current" />
                <span className="sr-only">Stop generating</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn(
                  'size-8 rounded-lg transition-colors',
                  canSend 
                    ? 'bg-foreground text-background hover:bg-foreground/90' 
                    : 'text-muted-foreground cursor-not-allowed'
                )}
                disabled={!canSend}
                onClick={handleSubmit}
              >
                <ArrowUp className="size-4" />
                <span className="sr-only">Send message</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
