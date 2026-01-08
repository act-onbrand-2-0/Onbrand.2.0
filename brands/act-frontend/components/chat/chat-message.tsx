'use client';

import { cn } from '@/lib/utils';
import { Sparkles, FileText, Copy, Check, Wrench, Loader2, CheckCircle, Share2, Users } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import hljs from 'highlight.js/lib/core';
import { motion, useSpring, useTransform } from 'motion/react';
import { animate } from 'motion';
import { LoadingJumpingDots } from './loading-dots';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
// Import common languages
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import yaml from 'highlight.js/lib/languages/yaml';
import diff from 'highlight.js/lib/languages/diff';

// Register languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('tsx', typescript);
hljs.registerLanguage('jsx', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('java', java);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cs', csharp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('diff', diff);

// Code block with syntax highlighting and copy button
function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const language = className?.replace('language-', '') || 'text';
  const codeString = String(children).replace(/\n$/, '');
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [codeString]);

  // Syntax highlighting
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  
  useEffect(() => {
    if (language && language !== 'text' && hljs.getLanguage(language)) {
      try {
        const result = hljs.highlight(codeString, { language });
        setHighlightedCode(result.value);
      } catch {
        setHighlightedCode('');
      }
    } else {
      // Try auto-detection
      try {
        const result = hljs.highlightAuto(codeString);
        setHighlightedCode(result.value);
      } catch {
        setHighlightedCode('');
      }
    }
  }, [codeString, language]);

  return (
    <div className="relative group my-3 rounded-lg overflow-hidden">
      {/* Header with language and copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-[#333]">
        <span className="text-xs text-gray-400 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      {/* Code content with syntax highlighting */}
      <pre className="p-4 overflow-x-auto bg-[#1e1e1e] text-[#d4d4d4]">
        {highlightedCode ? (
          <code
            ref={codeRef}
            className="text-sm font-mono leading-relaxed hljs"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />
        ) : (
          <code ref={codeRef} className="text-sm font-mono leading-relaxed">
            {codeString}
          </code>
        )}
      </pre>
    </div>
  );
}

// Attachment display info
export interface MessageAttachment {
  id: string;
  name: string;
  type: 'image' | 'document';
  preview?: string; // For images, this is the object URL or base64
  mimeType: string;
}

// Tool invocation from AI SDK
export interface ToolInvocation {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: 'partial-call' | 'call' | 'result';
  result?: unknown;
}

// Tool call display component
function ToolCallDisplay({ invocation }: { invocation: ToolInvocation }) {
  const isLoading = invocation.state === 'partial-call' || invocation.state === 'call';
  const isComplete = invocation.state === 'result';
  
  return (
    <div className="flex items-center gap-2 px-3 py-2 my-2 rounded-lg bg-muted/50 border border-border text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        {isLoading ? (
          <Loader2 className="size-4 animate-spin text-blue-500" />
        ) : (
          <CheckCircle className="size-4 text-green-500" />
        )}
        <Wrench className="size-4" />
        <span className="font-medium">
          {isLoading ? 'Calling' : 'Called'} <code className="bg-muted px-1 py-0.5 rounded text-xs">{invocation.toolName}</code>
        </span>
      </div>
      {isComplete && (
        <span className="text-xs text-muted-foreground ml-auto">
          ✓ Complete
        </span>
      )}
    </div>
  );
}

// Team member type
interface TeamMember {
  id: string;
  name: string;
  email: string;
}

// Message action buttons (copy and share) for assistant messages
function MessageActions({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [content]);

  const loadTeamMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const res = await fetch('/api/brand-members');
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Error loading team members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleOpenShareDialog = () => {
    setShowShareDialog(true);
    setShareSuccess(false);
    setSelectedMembers(new Set());
    loadTeamMembers();
  };

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) {
        newSet.delete(memberId);
      } else {
        newSet.add(memberId);
      }
      return newSet;
    });
  };

  const handleShareWithSelected = async () => {
    if (selectedMembers.size === 0) return;
    
    setIsSharing(true);
    try {
      // Share the message content via email or internal notification
      const userIds = Array.from(selectedMembers);
      const response = await fetch('/api/share-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          userIds,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to share');
      }
      
      setShareSuccess(true);
      setTimeout(() => {
        setShareSuccess(false);
        setShowShareDialog(false);
      }, 2000);
    } catch (error) {
      console.error('Error sharing message:', error);
      alert('Failed to share message. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 mt-2">
        <button
          onClick={handleCopy}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="Copy response"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
        <button
          onClick={handleOpenShareDialog}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          title="Share response"
        >
          <Share2 className="size-4" />
        </button>
      </div>

      {/* Share Dialog with Team Member Selection */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share message
            </DialogTitle>
            <DialogDescription>
              Select team members to share this message with
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Share with Team Members</Label>
              </div>

              {isLoadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No other team members found in your organization
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {teamMembers.map((member) => {
                    const isSelected = selectedMembers.has(member.id);
                    
                    return (
                      <div
                        key={member.id}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                          isSelected ? "bg-primary/10" : "hover:bg-accent"
                        )}
                        onClick={() => handleToggleMember(member.id)}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-muted-foreground/30"
                        )}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {teamMembers.length > 0 && (
                <Button
                  onClick={handleShareWithSelected}
                  disabled={selectedMembers.size === 0 || isSharing}
                  className="w-full"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sharing...
                    </>
                  ) : shareSuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Shared!
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share with {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
  attachments?: MessageAttachment[];
  toolInvocations?: ToolInvocation[];
  // Collaborative chat props
  senderName?: string;
  senderEmail?: string;
  isCurrentUser?: boolean;
  isCollaborative?: boolean;
}

export function ChatMessage({
  role,
  content,
  isStreaming = false,
  attachments,
  toolInvocations,
  senderName,
  senderEmail,
  isCurrentUser = true,
  isCollaborative = false,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const hasAttachments = attachments && attachments.length > 0;
  const hasToolCalls = toolInvocations && toolInvocations.length > 0;
  
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
          {/* Sender name for collaborative chats */}
          {isCollaborative && isUser && senderName && (
            <div className={cn('flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5', {
              'justify-end': isUser,
            })}>
              <span className={cn('font-medium', {
                'text-primary': isCurrentUser,
              })}>
                {isCurrentUser ? 'You' : senderName}
              </span>
              {!isCurrentUser && senderEmail && (
                <span className="text-muted-foreground/60">({senderEmail})</span>
              )}
            </div>
          )}

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

          {/* Tool invocations */}
          {hasToolCalls && (
            <div className="flex flex-col gap-1">
              {toolInvocations.map((invocation) => (
                <ToolCallDisplay key={invocation.toolCallId} invocation={invocation} />
              ))}
            </div>
          )}

          {/* Text content */}
          {content && (
            <div
              className={cn({
                'w-fit break-words rounded-2xl px-3 py-2 text-white': isUser,
                'bg-transparent px-0 py-0 text-left max-w-none': !isUser,
              })}
              style={isUser ? { backgroundColor: '#063EF8' } : undefined}
            >
              {isUser ? (
                <div className="whitespace-pre-wrap break-words text-sm">
                  {content}
                </div>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      // Headings
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0">{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-lg font-semibold mt-4 mb-2 first:mt-0">{children}</h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-base font-semibold mt-3 mb-1">{children}</h3>
                      ),
                      // Paragraphs
                      p: ({ children }) => (
                        <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
                      ),
                      // Lists
                      ul: ({ children }) => (
                        <ul className="list-disc list-outside ml-4 mb-3 space-y-1">{children}</ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal list-outside ml-4 mb-3 space-y-1">{children}</ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      // Code blocks
                      code: ({ className, children, ...props }) => {
                        const isInline = !className;
                        if (isInline) {
                          return (
                            <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props}>
                              {children}
                            </code>
                          );
                        }
                        return (
                          <CodeBlock className={className}>{children}</CodeBlock>
                        );
                      },
                      pre: ({ children }) => <>{children}</>,
                      // Blockquotes
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-3 text-muted-foreground">
                          {children}
                        </blockquote>
                      ),
                      // Links
                      a: ({ href, children }) => (
                        <a 
                          href={href} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary underline underline-offset-2 hover:text-primary/80"
                        >
                          {children}
                        </a>
                      ),
                      // Strong/Bold
                      strong: ({ children }) => (
                        <strong className="font-semibold">{children}</strong>
                      ),
                      // Emphasis/Italic
                      em: ({ children }) => (
                        <em className="italic">{children}</em>
                      ),
                      // Tables
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-3">
                          <table className="min-w-full border-collapse border border-border text-sm">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-muted">{children}</thead>
                      ),
                      th: ({ children }) => (
                        <th className="border border-border px-3 py-2 text-left font-semibold">{children}</th>
                      ),
                      td: ({ children }) => (
                        <td className="border border-border px-3 py-2">{children}</td>
                      ),
                      // Horizontal rule
                      hr: () => <hr className="my-4 border-border" />,
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                  {isStreaming && (
                    <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-pulse" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Action buttons for assistant messages */}
          {!isUser && content && !isStreaming && (
            <MessageActions content={content} />
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
          <div className="flex items-center gap-3 py-2">
            <LoadingJumpingDots />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FillTextLoader
 * A minimal Motion-based "fill text" loader inspired by Motion's Fill text example:
 * https://motion.dev/examples/react-loading-fill-text?platform=js
 */
export function FillTextLoader({ text = 'Loading' }: { text?: string }) {
  // Spring progress from 0 -> 1 -> 0, looped
  const progress = useSpring(0, { stiffness: 200, damping: 30, mass: 0.4 });

  useEffect(() => {
    let mounted = true;
    async function loop() {
      while (mounted) {
        await animate(progress, 1, { duration: 1.2, easing: 'ease-in-out' }).finished;
        await animate(progress, 0, { duration: 1.2, easing: 'ease-in-out' }).finished;
      }
    }
    loop();
    return () => {
      mounted = false;
    };
  }, [progress]);

  // Create an inset clip-path that grows upward with progress
  const clipPath = useTransform(progress, (p) => {
    const topInset = (1 - p) * 100; // 100% -> 0%
    return `inset(${topInset}% 0 0 0)`;
  });

  return (
    <div className="flex items-center">
      <div className="relative inline-block text-sm leading-none">
        {/* Base (unfilled) */}
        <span className="text-muted-foreground">{text}</span>
        {/* Filled overlay */}
        <motion.span
          aria-hidden
          className="absolute left-0 top-0 text-foreground"
          style={{ clipPath }}
        >
          {text}
        </motion.span>
      </div>
      <span className="ml-1 text-muted-foreground">…</span>
    </div>
  );
}
