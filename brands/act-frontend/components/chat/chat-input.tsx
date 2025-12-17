'use client';

import { useRef, useCallback, useEffect, KeyboardEvent, useState, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowUp, Square, Paperclip, ChevronDown, Check, X, FileText, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

// Available AI models
export const AI_MODELS = [
  { id: 'claude-4.5', name: 'Claude 4.5', provider: 'Anthropic', icon: '🟣' },
  { id: 'gpt-5.2', name: 'GPT 5.2', provider: 'OpenAI', icon: '🟢' },
  { id: 'gemini-3.1', name: 'Gemini 3.1', provider: 'Google', icon: '🔵' },
] as const;

export type ModelId = typeof AI_MODELS[number]['id'];

// Attachment types
export interface Attachment {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document';
}

// Allowed file types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'text/markdown'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB (Claude's limit)
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB for documents

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (attachments?: Attachment[]) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  model?: ModelId;
  onModelChange?: (model: ModelId) => void;
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
  model = 'claude-4.5',
  onModelChange,
}: ChatInputProps) {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const selectedModel = AI_MODELS.find(m => m.id === model) || AI_MODELS[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    
    Array.from(files).forEach((file) => {
      // Determine file type first
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
      const isDocument = ALLOWED_DOCUMENT_TYPES.includes(file.type);

      if (!isImage && !isDocument) {
        alert(`File type "${file.type}" is not supported. Please use images (JPEG, PNG, GIF, WebP) or documents (PDF, TXT, MD).`);
        return;
      }

      // Check file size based on type
      const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOCUMENT_SIZE;
      if (file.size > maxSize) {
        const sizeMB = (maxSize / 1024 / 1024).toFixed(0);
        alert(`File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size for ${isImage ? 'images' : 'documents'} is ${sizeMB}MB.`);
        return;
      }

      const attachment: Attachment = {
        id: crypto.randomUUID(),
        file,
        type: isImage ? 'image' : 'document',
      };

      // Create preview for images
      if (isImage) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    });

    setAttachments((prev) => [...prev, ...newAttachments]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      attachments.forEach((a) => {
        if (a.preview) URL.revokeObjectURL(a.preview);
      });
    };
  }, []);

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
      if (!disabled && !isLoading && !isStreaming && (input.trim() || attachments.length > 0)) {
        onSubmit(attachments.length > 0 ? attachments : undefined);
        setAttachments([]);
        resetHeight();
      }
    }
  };

  const handleSubmit = () => {
    if (!disabled && !isLoading && !isStreaming && (input.trim() || attachments.length > 0)) {
      onSubmit(attachments.length > 0 ? attachments : undefined);
      setAttachments([]);
      resetHeight();
    }
  };

  const isReady = !isStreaming && !isLoading;
  const canSend = isReady && (input.trim() || attachments.length > 0);

  return (
    <div className="relative flex w-full flex-col">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES].join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="rounded-2xl border border-border bg-muted/50 overflow-hidden">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative group flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-1.5"
              >
                {attachment.type === 'image' && attachment.preview ? (
                  <div className="relative size-10 rounded overflow-hidden">
                    <Image
                      src={attachment.preview}
                      alt={attachment.file.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center size-10 rounded bg-muted">
                    <FileText className="size-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col max-w-[120px]">
                  <span className="text-xs font-medium truncate">{attachment.file.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {(attachment.file.size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-1 -right-1 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

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
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="size-4" />
              <span className="sr-only">Attach file</span>
            </Button>
            
            {/* Model Selector Dropdown */}
            <DropdownMenu open={isModelMenuOpen} onOpenChange={setIsModelMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  disabled={disabled || !isReady}
                >
                  <span>{selectedModel.icon}</span>
                  <span>{selectedModel.name}</span>
                  <ChevronDown className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {AI_MODELS.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => {
                      onModelChange?.(m.id);
                      setIsModelMenuOpen(false);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span>{m.icon}</span>
                      <div>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.provider}</div>
                      </div>
                    </div>
                    {model === m.id && <Check className="size-4" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
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
