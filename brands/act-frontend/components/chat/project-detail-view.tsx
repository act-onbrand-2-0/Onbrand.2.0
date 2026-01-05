'use client';

import { useState, useRef } from 'react';
import { FolderOpen, Plus, File, Upload, X, Loader2, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  created_at: string;
}

interface Conversation {
  id: string;
  title: string;
  project_id?: string | null;
  last_message_at: string;
  created_at: string;
  last_message_preview?: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_default: boolean;
}

interface ProjectDetailViewProps {
  project: Project;
  conversations: Conversation[];
  files: ProjectFile[];
  currentConversationId?: string;
  onNewChat: (initialMessage?: string) => void;
  onSelectConversation: (id: string) => void;
  onUploadFile?: (file: File) => Promise<void>;
  onDeleteFile?: (fileId: string) => Promise<void>;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ProjectDetailView({
  project,
  conversations,
  files,
  currentConversationId,
  onNewChat,
  onSelectConversation,
  onUploadFile,
  onDeleteFile,
}: ProjectDetailViewProps) {
  const [newChatInput, setNewChatInput] = useState('');
  const [showFiles, setShowFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter conversations for this project
  const projectConversations = conversations
    .filter((c) => c.project_id === project.id)
    .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChatInput.trim()) {
      onNewChat(newChatInput.trim());
      setNewChatInput('');
    } else {
      onNewChat();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;

    setIsUploading(true);
    try {
      await onUploadFile(file);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex flex-col h-full w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center px-6 py-5">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">{project.name}</h1>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.csv,.pdf,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        onChange={handleFileUpload}
      />

      {/* New Chat Input */}
      <div className="px-4 py-3">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-muted/50 border border-border focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <input
              type="text"
              value={newChatInput}
              onChange={(e) => setNewChatInput(e.target.value)}
              placeholder="Start a conversation..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </form>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-4">
        {projectConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: project.color + '20' }}
            >
              <FolderOpen className="h-6 w-6" style={{ color: project.color }} />
            </div>
            <h3 className="text-lg font-medium mb-1">No chats in {project.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a new chat to begin working on this project
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => onNewChat()} className="gap-2">
                <Plus className="h-4 w-4" />
                New Chat in {project.name}
              </Button>
              {onUploadFile && (
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Add Context Files
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {projectConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  "w-full flex items-start justify-between px-4 py-3 text-left transition-colors rounded-lg",
                  conversation.id === currentConversationId
                    ? "bg-accent"
                    : "hover:bg-accent/50"
                )}
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-medium text-[15px]">{conversation.title}</p>
                  {conversation.last_message_preview && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.last_message_preview}
                    </p>
                  )}
                </div>
                <span className="text-sm text-muted-foreground shrink-0 ml-4">
                  {formatDate(conversation.last_message_at)}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Context Files - Collapsible Section */}
        {(files.length > 0 || onUploadFile) && (
          <div className="mt-6 border-t border-border pt-4">
            <button
              onClick={() => setShowFiles(!showFiles)}
              className="flex items-center gap-2 w-full text-left px-2 py-2 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <ChevronRight 
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showFiles && "rotate-90"
                )} 
              />
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Context Files</span>
              <span className="text-xs text-muted-foreground ml-1">({files.length})</span>
            </button>

            {showFiles && (
              <div className="mt-2 ml-6 space-y-1">
                {files.length === 0 && (
                  <p className="text-xs text-muted-foreground px-3 py-2">No files added yet</p>
                )}
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/30 hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <File className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      {file.status === 'processing' && (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                      )}
                      {file.status === 'ready' && (
                        <span className="text-xs text-green-600 shrink-0">✓</span>
                      )}
                      {file.status === 'error' && (
                        <span className="text-xs text-destructive shrink-0">!</span>
                      )}
                    </div>
                    {onDeleteFile && (
                      <button
                        className="text-muted-foreground hover:text-destructive transition-colors ml-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFile(file.id);
                        }}
                        title="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                
                {/* Add file button */}
                {onUploadFile && (
                  <button
                    className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span>Add file</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
