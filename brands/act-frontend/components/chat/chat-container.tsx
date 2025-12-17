'use client';

import { ChatSidebar } from './chat-sidebar';
import { MessageList } from './message-list';
import { ChatInput, type ModelId, type Attachment } from './chat-input';
import { type MessageAttachment } from './chat-message';

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
  onSendMessage: (attachments?: Attachment[]) => void;
  onStopGeneration?: () => void;
  onRegenerate?: () => void;
  onModelChange: (model: ModelId) => void;

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
  selectedModel,
  setInput,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onArchiveConversation,
  onSendMessage,
  onStopGeneration,
  onRegenerate,
  onModelChange,
  brandName,
}: ChatContainerProps) {
  // Debug: Check if messages have attachments
  console.log('ChatContainer messages:', messages.map(m => ({ 
    role: m.role, 
    hasAttachments: !!(m.attachments?.length),
    attachmentsCount: m.attachments?.length 
  })));
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
            model={selectedModel}
            onModelChange={onModelChange}
          />
        </div>
      </div>
    </div>
  );
}
