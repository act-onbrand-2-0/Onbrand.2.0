'use client';

import { useState } from 'react';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatSidebar } from './chat-sidebar';
import { MessageList } from './message-list';
import { ChatInput, type ModelId, type Attachment } from './chat-input';
import { type MessageAttachment } from './chat-message';
import { SuggestedActions } from './greeting';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: MessageAttachment[];
}

interface Conversation {
  id: string;
  title: string;
  model: string;
  last_message_at: string;
  visibility?: 'private' | 'shared' | null;
  user_id?: string;
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
  selectedModel: ModelId;

  // Actions
  setInput: (value: string) => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onArchiveConversation?: (id: string) => void;
  onToggleVisibility?: (id: string, visibility: 'private' | 'shared') => void;
  onSendMessage: (attachments?: Attachment[]) => void;
  onStopGeneration?: () => void;
  onRegenerate?: () => void;
  onModelChange: (model: ModelId) => void;

  // User info
  brandName?: string;
  currentUserId?: string;
  userName?: string;
  userEmail?: string;
}

export function ChatContainer({
  conversations,
  currentConversation,
  messages,
  isLoading,
  isStreaming,
  input,
  streamingContent,
  selectedModel,
  setInput,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onArchiveConversation,
  onToggleVisibility,
  onSendMessage,
  onStopGeneration,
  onRegenerate,
  onModelChange,
  brandName,
  currentUserId,
  userName,
  userEmail,
}: ChatContainerProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-dvh bg-background">
      {/* Sidebar - Hidden on mobile, collapsible on desktop */}
      <div 
        className={cn(
          "hidden md:flex md:flex-col md:border-r md:border-sidebar-border transition-all duration-300",
          sidebarCollapsed ? "md:w-0 md:overflow-hidden" : "md:w-72"
        )}
      >
        <ChatSidebar
          conversations={conversations}
          currentConversationId={currentConversation?.id}
          currentUserId={currentUserId}
          isLoading={isLoading}
          onNewChat={onNewChat}
          onSelectConversation={onSelectConversation}
          onDeleteConversation={onDeleteConversation}
          onArchiveConversation={onArchiveConversation}
          onToggleVisibility={onToggleVisibility}
          onCollapse={() => setSidebarCollapsed(true)}
          brandName={brandName}
          userName={userName}
          userEmail={userEmail}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Expand sidebar button - shows when collapsed */}
        {sidebarCollapsed && (
          <div className="hidden md:block absolute top-3 left-3 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setSidebarCollapsed(false)}
              title="Expand sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          </div>
        )}
        {/* Messages */}
        <MessageList
          messages={messages}
          isLoading={isLoading}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
        />

        {/* Suggested Actions - Show when no messages */}
        {messages.length === 0 && (
          <SuggestedActions 
            onSelect={(text) => {
              setInput(text);
            }} 
          />
        )}

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
            model={selectedModel}
            onModelChange={onModelChange}
          />
        </div>
      </div>
    </div>
  );
}
