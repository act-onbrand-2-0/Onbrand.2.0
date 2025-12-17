'use client';

import { cn } from '@/lib/utils';
import { Sparkles, FileText } from 'lucide-react';

// Attachment display info
export interface MessageAttachment {
  id: string;
  name: string;
  type: 'image' | 'document';
  preview?: string; // For images, this is the object URL or base64
  mimeType: string;
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  attachments?: MessageAttachment[];
}

export function ChatMessage({
  role,
  content,
  isStreaming = false,
  attachments,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const hasAttachments = attachments && attachments.length > 0;
  
  // Debug: Log all messages with their attachments
  console.log(`ChatMessage [${role}] content="${content?.slice(0,30)}..." hasAttachments=${hasAttachments}`);

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
          className={cn('flex flex-col gap-2', {
            'w-full': !isUser,
            'max-w-[calc(100%-2.5rem)] sm:max-w-[min(fit-content,80%)]': isUser,
            'items-end': isUser,
          })}
        >
          {/* Attachments (shown above text for user messages) */}
          {hasAttachments && (
            <div className="flex flex-wrap gap-2 mb-2" style={{ justifyContent: isUser ? 'flex-end' : 'flex-start' }}>
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="rounded-xl overflow-hidden shadow-lg"
                  style={{ border: '3px solid #3b82f6', maxWidth: '280px' }}
                >
                  {attachment.type === 'image' && attachment.preview ? (
                    <div style={{ width: '280px', height: '200px', backgroundColor: '#e5e7eb' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={attachment.preview}
                        alt={attachment.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        onError={(e) => console.error('Image load error:', e)}
                        onLoad={() => console.log('Image loaded successfully')}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted">
                      <FileText className="size-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                        {attachment.name}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Text content */}
          {content && (
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
          )}
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
