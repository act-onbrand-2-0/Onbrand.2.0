'use client';

import { useState, useRef } from 'react';
import { FolderOpen, Plus, Mic, SlidersHorizontal, File, Upload, X, Loader2 } from 'lucide-react';
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

  const readyFilesCount = files.filter(f => f.status === 'ready').length;
  const totalFilesCount = files.length;

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex flex-col h-full w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">{project.name}</h1>
        </div>

        {/* File count badge */}
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 rounded-full border-border",
            showFiles && "bg-accent"
          )}
          onClick={() => setShowFiles(!showFiles)}
        >
          <File className="h-3.5 w-3.5 text-red-500" />
          <span className="text-sm">
            {totalFilesCount} {totalFilesCount === 1 ? 'file' : 'files'}
          </span>
        </Button>
      </div>

      {/* Files Panel (shown when toggled) */}
      {showFiles && (
        <div className="border-b border-border bg-muted/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Context Files</h3>
            {onUploadFile && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Add File
              </Button>
            )}
          </div>
          
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No files added yet. Upload files to give the AI context about your project.
            </p>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-background border border-border"
                >
                  <div className="flex items-center gap-2">
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate max-w-[200px]">{file.name}</span>
                    {file.status === 'processing' && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                    {file.status === 'ready' && (
                      <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Ready</span>
                    )}
                    {file.status === 'error' && (
                      <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Error</span>
                    )}
                  </div>
                  {onDeleteFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteFile(file.id)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.md,.csv,.pdf,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            onChange={handleFileUpload}
          />
        </div>
      )}

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
              placeholder={`New chat in ${project.name}`}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <Mic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {projectConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: project.color + '20' }}
            >
              <FolderOpen className="h-6 w-6" style={{ color: project.color }} />
            </div>
            <h3 className="text-lg font-medium mb-1">No chats yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start a new chat to begin working on this project
            </p>
            <Button onClick={() => onNewChat()} className="gap-2">
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {projectConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={cn(
                  "w-full flex items-start justify-between px-6 py-4 text-left transition-colors",
                  conversation.id === currentConversationId
                    ? "bg-accent/50"
                    : "hover:bg-accent/30"
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
      </div>
      </div>
    </div>
  );
}
