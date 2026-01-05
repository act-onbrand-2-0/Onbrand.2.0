'use client';

import { useState, useEffect } from 'react';
import { ChatSidebar } from './chat-sidebar';
import { ProjectSidebar } from './project-sidebar';
import { ProjectDetailView } from './project-detail-view';
import { MessageList } from './message-list';
import { ChatInput, type ModelId, type Attachment } from './chat-input';
import { type MessageAttachment, type ToolInvocation } from './chat-message';
import { SuggestedActions } from './greeting';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: MessageAttachment[];
  toolInvocations?: ToolInvocation[];
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
  activeToolCall?: string | null;
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
  onToggleProjectVisibility?: (id: string, visibility: 'private' | 'shared') => void;
  onSendMessage: (attachments?: Attachment[]) => void;
	// Extended: allow passing options like web search toggle
	// Keeping backwards compatibility by making it optional
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	onSendMessage: (attachments?: Attachment[], options?: { useWebSearch?: boolean }) => void;
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
	// Move current conversation to a project (used by + menu)
	onMoveConversationToProject?: (projectId: string) => void;
	onClearProject?: () => void;
	// Style change handler
	onStyleChange?: (style: string) => void;
	pendingStylePreset?: string;
	pendingProjectId?: string | null;

  // User info
  brandName?: string;
  currentUserId?: string;
  userName?: string;
  userEmail?: string;
  jobFunction?: string | null;
}

export function ChatContainer({
  conversations,
  currentConversation,
  messages,
  isLoading,
  isStreaming,
  input,
  streamingContent,
  activeToolCall,
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
  onToggleProjectVisibility,
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
  jobFunction,
	onMoveConversationToProject,
	onClearProject,
	onStyleChange,
	pendingStylePreset,
	pendingProjectId,
}: ChatContainerProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
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
    <div className="flex h-full flex-1 bg-background relative">
      {/* Sidebar - Hidden on mobile, collapsible on desktop */}
      <div 
        className={cn(
          "hidden md:flex md:flex-col md:border-r md:border-sidebar-border transition-all duration-300",
          sidebarCollapsed ? "md:w-16" : "md:w-[280px]"
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
            onToggleProjectVisibility={onToggleProjectVisibility}
            onCollapse={() => setSidebarCollapsed(true)}
            onExpand={() => setSidebarCollapsed(false)}
            isCollapsed={sidebarCollapsed}
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
              activeToolCall={activeToolCall}
            />

            {/* Suggested Actions - Show when no messages and input is empty */}
            {messages.length === 0 && !input.trim() && (
              <SuggestedActions 
                onSelect={(text) => {
                  setInput(text);
                }} 
                jobFunction={jobFunction}
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
								// New: project actions in + menu
								projects={projects?.map(p => ({ id: p.id, name: p.name })) || []}
								currentProjectId={currentProjectId || null}
								currentConversationProjectId={currentConversation?.project_id || pendingProjectId || null}
								onSelectProject={onSelectProject}
								onCreateProject={onCreateProject}
						onMoveConversationToProject={onMoveConversationToProject}
						onClearProject={onClearProject}
						// Style selection
						currentConversationStylePreset={(currentConversation?.style_preset || pendingStylePreset) as any}
						onStyleChange={onStyleChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
