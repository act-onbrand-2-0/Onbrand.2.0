'use client';

import { useState, useEffect } from 'react';
import { PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatSidebar } from './chat-sidebar';
import { ProjectSidebar } from './project-sidebar';
import { ProjectDetailView } from './project-detail-view';
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

interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_default: boolean;
}

interface Conversation {
  id: string;
  project_id?: string | null;
  title: string;
  model: string;
  last_message_at: string;
  created_at: string;
  last_message_preview?: string;
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

  // Project state (optional)
  projects?: Project[];
  projectFiles?: Record<string, ProjectFile[]>;
  currentProjectId?: string | null;

  // Actions
  setInput: (value: string) => void;
  onNewChat: (projectId?: string) => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onArchiveConversation?: (id: string) => void;
  onToggleVisibility?: (id: string, visibility: 'private' | 'shared') => void;
  onSendMessage: (attachments?: Attachment[]) => void;
  onStopGeneration?: () => void;
  onRegenerate?: () => void;
  onModelChange: (model: ModelId) => void;

  // Project actions (optional)
  onSelectProject?: (projectId: string | null) => void;
  onCreateProject?: (name: string, color?: string) => Promise<string | undefined>;
  onDeleteProject?: (id: string) => void;
  onRenameProject?: (id: string, name: string) => void;
  onUploadFile?: (projectId: string, file: File) => Promise<void>;
  onDeleteFile?: (fileId: string) => Promise<void>;

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
  projects,
  projectFiles,
  currentProjectId,
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
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onRenameProject,
  onUploadFile,
  onDeleteFile,
  brandName,
  currentUserId,
  userName,
  userEmail,
}: ChatContainerProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isCreatingNewChat, setIsCreatingNewChat] = useState(false);

  // Check if projects feature is enabled
  const hasProjects = projects && onSelectProject && onCreateProject;

  // Reset isCreatingNewChat when conversation changes or project changes
  useEffect(() => {
    if (currentConversation) {
      setIsCreatingNewChat(false);
    }
  }, [currentConversation]);

  // Reset isCreatingNewChat when switching projects
  useEffect(() => {
    setIsCreatingNewChat(false);
  }, [currentProjectId]);

  return (
    <div className="flex h-dvh bg-background">
      {/* Sidebar - Hidden on mobile, collapsible on desktop */}
      <div 
        className={cn(
          "hidden md:flex md:flex-col md:border-r md:border-sidebar-border transition-all duration-300",
          sidebarCollapsed ? "md:w-0 md:overflow-hidden" : "md:w-72"
        )}
      >
        {hasProjects ? (
          <ProjectSidebar
            projects={projects}
            conversations={conversations}
            projectFiles={projectFiles}
            currentProjectId={currentProjectId}
            currentConversationId={currentConversation?.id}
            currentUserId={currentUserId}
            isLoading={isLoading}
            onNewChat={onNewChat}
            onNewProject={onCreateProject}
            onSelectProject={onSelectProject}
            onSelectConversation={onSelectConversation}
            onDeleteConversation={onDeleteConversation}
            onDeleteProject={onDeleteProject || (() => {})}
            onRenameProject={onRenameProject || (() => {})}
            onUploadFile={onUploadFile}
            onDeleteFile={onDeleteFile}
            onArchiveConversation={onArchiveConversation}
            onToggleVisibility={onToggleVisibility}
            onCollapse={() => setSidebarCollapsed(true)}
            brandName={brandName}
            userName={userName}
            userEmail={userEmail}
          />
        ) : (
          <ChatSidebar
            conversations={conversations}
            currentConversationId={currentConversation?.id}
            currentUserId={currentUserId}
            isLoading={isLoading}
            onNewChat={() => onNewChat()}
            onSelectConversation={onSelectConversation}
            onDeleteConversation={onDeleteConversation}
            onArchiveConversation={onArchiveConversation}
            onToggleVisibility={onToggleVisibility}
            onCollapse={() => setSidebarCollapsed(true)}
            brandName={brandName}
            userName={userName}
            userEmail={userEmail}
          />
        )}
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

        {/* Show Project Detail View when project is selected but no conversation and not creating new chat */}
        {currentProjectId && !currentConversation && !isCreatingNewChat && projects ? (
          (() => {
            const currentProject = projects.find(p => p.id === currentProjectId);
            if (currentProject) {
              return (
                <ProjectDetailView
                  project={currentProject}
                  conversations={conversations}
                  files={projectFiles?.[currentProjectId] || []}
                  currentConversationId={undefined}
                  onNewChat={(initialMessage) => {
                    setIsCreatingNewChat(true);
                    onNewChat(currentProjectId);
                    if (initialMessage) {
                      setInput(initialMessage);
                    }
                  }}
                  onSelectConversation={onSelectConversation}
                  onUploadFile={onUploadFile ? (file) => onUploadFile(currentProjectId, file) : undefined}
                  onDeleteFile={onDeleteFile}
                />
              );
            }
            return null;
          })()
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}
