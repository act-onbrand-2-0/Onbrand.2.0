'use client';

import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  MoreHorizontal,
  Trash2,
  PanelLeft,
  MessageSquare,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Share2,
  Lock,
  Users,
  FolderPlus,
  Pencil,
  Folder,
  FolderOpen,
  Upload,
  FileText,
  File,
  X,
  Loader2,
} from 'lucide-react';

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
  files?: ProjectFile[];
}

interface Conversation {
  id: string;
  title: string;
  project_id?: string | null;
  model: string;
  last_message_at: string;
  visibility?: 'private' | 'shared' | null;
  user_id?: string;
}

interface ProjectSidebarProps {
  projects: Project[];
  conversations: Conversation[];
  projectFiles?: Record<string, ProjectFile[]>;
  currentProjectId?: string | null;
  currentConversationId?: string;
  currentUserId?: string;
  isLoading?: boolean;
  onNewChat: (projectId?: string) => void;
  onNewProject: (name: string, color?: string) => Promise<string | undefined>; // Returns project ID
  onSelectProject: (projectId: string | null) => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onUploadFile?: (projectId: string, file: File) => Promise<void>;
  onDeleteFile?: (fileId: string) => Promise<void>;
  onArchiveConversation?: (id: string) => void;
  onToggleVisibility?: (id: string, visibility: 'private' | 'shared') => void;
  onCollapse?: () => void;
  brandName?: string;
  userName?: string;
  userEmail?: string;
}

// Color palette for projects
const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
];

export function ProjectSidebar({
  projects,
  conversations,
  projectFiles,
  currentProjectId,
  currentConversationId,
  currentUserId,
  isLoading = false,
  onNewChat,
  onNewProject,
  onSelectProject,
  onSelectConversation,
  onDeleteConversation,
  onDeleteProject,
  onRenameProject,
  onUploadFile,
  onDeleteFile,
  onArchiveConversation,
  onToggleVisibility,
  onCollapse,
  brandName,
  userName,
  userEmail,
}: ProjectSidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  // Toggle project expansion
  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  // Group conversations by project
  const conversationsByProject = conversations.reduce(
    (acc, conv) => {
      const projectId = conv.project_id || 'uncategorized';
      if (!acc[projectId]) {
        acc[projectId] = [];
      }
      acc[projectId].push(conv);
      return acc;
    },
    {} as Record<string, Conversation[]>
  );

  // Handle new project creation - auto-navigate into the project
  const handleCreateProject = async () => {
    if (newProjectName.trim() && !isCreatingProject) {
      setIsCreatingProject(true);
      try {
        const projectId = await onNewProject(newProjectName.trim(), selectedColor);
        setNewProjectName('');
        setSelectedColor(PROJECT_COLORS[0]);
        setShowNewProjectDialog(false);
        
        // Auto-expand and select the new project, then start a new chat
        if (projectId) {
          setExpandedProjects((prev) => new Set(prev).add(projectId));
          onSelectProject(projectId);
          // Start a new chat in this project
          onNewChat(projectId);
        }
      } finally {
        setIsCreatingProject(false);
      }
    }
  };

  // Auto-expand current project
  const effectiveExpandedProjects = new Set(expandedProjects);
  if (currentProjectId && !effectiveExpandedProjects.has(currentProjectId)) {
    effectiveExpandedProjects.add(currentProjectId);
  }

  return (
    <div className="flex h-full w-72 flex-col bg-sidebar text-sidebar-foreground overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-1">
          {onCollapse && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onCollapse}
              title="Collapse sidebar"
            >
              <PanelLeft className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onNewChat(currentProjectId || undefined)}
            title="New Chat"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setShowNewProjectDialog(true)}
          title="New Project"
        >
          <FolderPlus className="size-4" />
        </Button>
      </div>

      {/* Projects & Conversations List */}
      <ScrollArea className="flex-1 px-2 py-2">
        {isLoading ? (
          <div className="space-y-2 px-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {/* All Chats option */}
            <button
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                currentProjectId === null
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              )}
              onClick={() => onSelectProject(null)}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">All Chats</span>
              <span className="text-xs text-muted-foreground">
                {conversations.length}
              </span>
            </button>

            {/* Projects */}
            {projects.map((project) => (
              <ProjectItem
                key={project.id}
                project={project}
                conversations={conversationsByProject[project.id] || []}
                files={projectFiles?.[project.id] || []}
                isExpanded={effectiveExpandedProjects.has(project.id)}
                isSelected={currentProjectId === project.id}
                currentConversationId={currentConversationId}
                currentUserId={currentUserId}
                onToggle={() => toggleProject(project.id)}
                onSelect={() => onSelectProject(project.id)}
                onNewChat={() => onNewChat(project.id)}
                onSelectConversation={onSelectConversation}
                onDeleteConversation={onDeleteConversation}
                onDeleteProject={() => onDeleteProject(project.id)}
                onRenameProject={(name) => onRenameProject(project.id, name)}
                onUploadFile={onUploadFile ? (file) => onUploadFile(project.id, file) : undefined}
                onDeleteFile={onDeleteFile}
                onArchiveConversation={onArchiveConversation}
                onToggleVisibility={onToggleVisibility}
              />
            ))}

            {/* Uncategorized conversations */}
            {conversationsByProject['uncategorized']?.length > 0 && (
              <div className="mt-4">
                <h3 className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Uncategorized
                </h3>
                <div className="space-y-1">
                  {conversationsByProject['uncategorized'].map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversationId === conv.id}
                      isOwner={!currentUserId || conv.user_id === currentUserId}
                      onSelect={() => onSelectConversation(conv.id)}
                      onDelete={() => onDeleteConversation(conv.id)}
                      onArchive={
                        onArchiveConversation
                          ? () => onArchiveConversation(conv.id)
                          : undefined
                      }
                      onToggleVisibility={
                        onToggleVisibility
                          ? () =>
                              onToggleVisibility(
                                conv.id,
                                conv.visibility === 'shared' ? 'private' : 'shared'
                              )
                          : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* User Section */}
      <div className="mt-auto border-t border-sidebar-border p-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors">
          <div className="size-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
            {(userName?.[0] || userEmail?.[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium truncate">{userName || 'User'}</div>
            {userEmail && (
              <div className="text-xs text-muted-foreground truncate">{userEmail}</div>
            )}
          </div>
          <ChevronUp className="size-4 text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* New Project Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Create a project folder to organize your chats.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., Marketing Campaign"
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'size-8 rounded-full transition-transform',
                      selectedColor === color && 'ring-2 ring-offset-2 ring-primary scale-110'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewProjectDialog(false)} disabled={isCreatingProject}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || isCreatingProject}>
              {isCreatingProject ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Project'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Project item with expandable conversations
interface ProjectItemProps {
  project: Project;
  conversations: Conversation[];
  files: ProjectFile[];
  isExpanded: boolean;
  isSelected: boolean;
  currentConversationId?: string;
  currentUserId?: string;
  onToggle: () => void;
  onSelect: () => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onDeleteProject: () => void;
  onRenameProject: (name: string) => void;
  onUploadFile?: (file: File) => Promise<void>;
  onDeleteFile?: (fileId: string) => Promise<void>;
  onArchiveConversation?: (id: string) => void;
  onToggleVisibility?: (id: string, visibility: 'private' | 'shared') => void;
}

function ProjectItem({
  project,
  conversations,
  files,
  isExpanded,
  isSelected,
  currentConversationId,
  currentUserId,
  onToggle,
  onSelect,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onDeleteProject,
  onRenameProject,
  onUploadFile,
  onDeleteFile,
  onArchiveConversation,
  onToggleVisibility,
}: ProjectItemProps) {
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRename = () => {
    if (newName.trim() && newName !== project.name) {
      onRenameProject(newName.trim());
    }
    setShowRenameDialog(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadFile) {
      setIsUploading(true);
      try {
        await onUploadFile(file);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1 rounded-lg pr-1 transition-colors',
          isSelected ? 'bg-accent' : 'hover:bg-accent/50'
        )}
      >
        {/* Expand/Collapse Button */}
        <button
          className="p-2 hover:bg-accent/50 rounded-l-lg"
          onClick={onToggle}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {/* Project Name */}
        <button
          className="flex flex-1 items-center gap-2 py-2 text-sm"
          onClick={onSelect}
        >
          {isExpanded ? (
            <FolderOpen className="h-4 w-4" style={{ color: project.color }} />
          ) : (
            <Folder className="h-4 w-4" style={{ color: project.color }} />
          )}
          <span className="flex-1 truncate text-left">{project.name}</span>
          <span className="text-xs text-muted-foreground mr-1">
            {conversations.length}
          </span>
        </button>

        {/* Actions Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onNewChat()}>
              <Plus className="mr-2 h-4 w-4" />
              New Chat
            </DropdownMenuItem>
            {onUploadFile && (
              <DropdownMenuItem
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isUploading ? 'Uploading...' : 'Add Files'}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setNewName(project.name);
                setShowRenameDialog(true);
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            {!project.is_default && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".txt,.md,.csv,.pdf,.json,.doc,.docx,.xls,.xlsx"
        onChange={handleFileUpload}
      />

      {/* Expanded Conversations */}
      {isExpanded && conversations.length > 0 && (
        <div className="ml-6 space-y-1 mt-1">
          {conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={currentConversationId === conv.id}
              isOwner={!currentUserId || conv.user_id === currentUserId}
              onSelect={() => onSelectConversation(conv.id)}
              onDelete={() => onDeleteConversation(conv.id)}
              onArchive={
                onArchiveConversation
                  ? () => onArchiveConversation(conv.id)
                  : undefined
              }
              onToggleVisibility={
                onToggleVisibility
                  ? () =>
                      onToggleVisibility(
                        conv.id,
                        conv.visibility === 'shared' ? 'private' : 'shared'
                      )
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {isExpanded && conversations.length === 0 && files.length === 0 && (
        <div className="ml-6 py-2 text-xs text-muted-foreground">
          No chats yet.{' '}
          <button className="underline hover:no-underline" onClick={onNewChat}>
            Start one
          </button>
        </div>
      )}

      {/* Project Files */}
      {isExpanded && files.length > 0 && (
        <div className="ml-6 mt-2">
          <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Context Files
          </div>
          <div className="space-y-1">
            {files.map((file) => (
              <div
                key={file.id}
                className="group flex items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent/50"
              >
                <File className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate" title={file.name}>
                  {file.name}
                </span>
                <span className="text-muted-foreground shrink-0">
                  {formatFileSize(file.file_size)}
                </span>
                {file.status === 'processing' && (
                  <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
                {file.status === 'ready' && (
                  <span className="text-green-500 text-[10px]">Ready</span>
                )}
                {file.status === 'error' && (
                  <span className="text-destructive text-[10px]">Error</span>
                )}
                {onDeleteFile && (
                  <button
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteFile(file.id)}
                    title="Remove file"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add files prompt when no files */}
      {isExpanded && files.length === 0 && onUploadFile && (
        <div className="ml-6 mt-2">
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-3 w-3" />
            Add context files
          </button>
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete &quot;{project.name}&quot; and move all its chats to
              uncategorized. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={onDeleteProject}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Conversation item component
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isOwner: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onArchive?: () => void;
  onToggleVisibility?: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  isOwner,
  onSelect,
  onDelete,
  onArchive,
  onToggleVisibility,
}: ConversationItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isShared = conversation.visibility === 'shared';

  return (
    <>
      <div
        className={cn(
          'group relative flex items-center gap-2 rounded-lg pl-3 pr-8 py-2 text-sm transition-colors cursor-pointer',
          isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
        )}
        onClick={onSelect}
      >
        <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
        <span className="flex-1 truncate">{conversation.title}</span>
        {isShared && (
          <span title="Shared with team">
            <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
          </span>
        )}
        {!isOwner && (
          <span className="text-[10px] text-muted-foreground">shared</span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {isOwner && onToggleVisibility && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility();
                  }}
                >
                  {isShared ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share with Team
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{conversation.title}&quot; and all
              its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete();
                setShowDeleteDialog(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
