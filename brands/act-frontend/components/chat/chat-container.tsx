'use client';

import { ChatSidebar } from './chat-sidebar';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  last_message_at: string;
}

interface ChatContainerProps {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  input: string;
  streamingContent?: string;

  // Actions
  setInput: (value: string) => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onArchiveConversation?: (id: string) => void;
  onSendMessage: () => void;
  onStopGeneration?: () => void;
  onRegenerate?: () => void;

  // User info
  brandName?: string;
}

export function ChatContainer({
  conversations,
  currentConversation,
  messages,
  isLoading,
  isStreaming,
  input,
  streamingContent,
  setInput,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onArchiveConversation,
  onSendMessage,
  onStopGeneration,
  onRegenerate,
  brandName,
}: ChatContainerProps) {
  return (
    <div className="flex h-dvh bg-background">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-sidebar-border">
        <ChatSidebar
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          isLoading={isLoading}
          onNewChat={onNewChat}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
          onArchiveConversation={onArchiveConversation}
          brandName={brandName}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Deploy Button - Top Right */}
        <div className="absolute top-3 right-3 z-10">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <ExternalLink className="size-3" />
            Deploy with Vercel
          </Button>
        </div>

        {/* Messages */}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
        />

        {/* Input - Fixed at bottom */}
        <div className="mx-auto flex w-full max-w-3xl px-4 pb-4">
          <ChatInput
            input={input}
            setInput={setInput}
            onSubmit={onSendMessage}
            onStop={onStopGeneration}
            isStreaming={isStreaming}
            isLoading={isLoading}
            placeholder="Send a message..."
          />
        </div>
      </div>
    </div>
  );
}
