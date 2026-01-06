'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
  PenLine,
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
  Globe,
  Copy,
  Check,
  Link as LinkIcon,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { NotificationBell } from '@/components/notifications';

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
  onNewChat: (projectId?: string, initialMessage?: string) => void;
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
  onToggleProjectVisibility?: (id: string, visibility: 'private' | 'shared') => void;
  onCollapse?: () => void;
  onExpand?: () => void;
  isCollapsed?: boolean;
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
  onToggleProjectVisibility,
  onCollapse,
  onExpand,
  isCollapsed = false,
  brandName,
  userName,
  userEmail,
}: ProjectSidebarProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(new Set());
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
        // Track that user manually collapsed this project
        setManuallyCollapsed((mc) => new Set(mc).add(projectId));
      } else {
        newSet.add(projectId);
        // Remove from manually collapsed when user expands
        setManuallyCollapsed((mc) => {
          const newMc = new Set(mc);
          newMc.delete(projectId);
          return newMc;
        });
      }
      return newSet;
    });
  };

  // Get IDs of default projects to exclude from folders
  const defaultProjectIds = new Set(
    projects.filter(p => p.is_default).map(p => p.id)
  );

  // Group conversations by project
  // Conversations in default projects go to 'uncategorized' (shown in "General" section)
  const conversationsByProject = conversations.reduce(
    (acc, conv) => {
      const isDefaultProject = conv.project_id && defaultProjectIds.has(conv.project_id);
      const projectId = (!conv.project_id || isDefaultProject) ? 'uncategorized' : conv.project_id;
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

  // Auto-expand current project (unless user manually collapsed it)
  const effectiveExpandedProjects = new Set(expandedProjects);
  if (currentProjectId && !effectiveExpandedProjects.has(currentProjectId) && !manuallyCollapsed.has(currentProjectId)) {
    effectiveExpandedProjects.add(currentProjectId);
  }

  // Icon-only collapsed view
  if (isCollapsed) {
    return (
      <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground items-center py-3 gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={onExpand}
          title="Expand sidebar"
        >
          <PanelLeft className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={() => {
            onNewChat(currentProjectId || undefined);
            if (onExpand) onExpand();
          }}
          title="New Chat"
        >
          <PenLine className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={() => setShowNewProjectDialog(true)}
          title="New Folder"
        >
          <FolderPlus className="size-5" />
        </Button>
        
        {/* New Project Dialog - needed for collapsed view too */}
        <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Folder</DialogTitle>
              <DialogDescription>
                Create a new folder to organize your conversations.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="collapsed-project-name">Folder Name</Label>
                <Input
                  id="collapsed-project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Enter folder name..."
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'size-6 rounded-full transition-all',
                        selectedColor === color && 'ring-2 ring-offset-2 ring-primary'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewProjectDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateProject} disabled={!newProjectName.trim() || isCreatingProject}>
                {isCreatingProject ? 'Creating...' : 'Create Folder'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground overflow-hidden">
      {/* Logo Header */}
      
      {/* Action Buttons Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
        {onCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onCollapse}
            title="Close sidebar"
          >
            <PanelLeft className="size-4" />
          </Button>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => onNewChat(currentProjectId || undefined)}
            title="New Chat"
          >
            <PenLine className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => setShowNewProjectDialog(true)}
            title="New Folder"
          >
            <FolderPlus className="size-4" />
          </Button>
        </div>
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
            {/* Folders Section */}
            {projects.filter(p => !p.is_default).length > 0 && (
              <div className="mt-4">
                <h3 className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  Folders
                </h3>
              </div>
            )}

            {/* Projects (excluding default) */}
            {projects.filter(p => !p.is_default).map((project) => (
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

            {/* General conversations (uncategorized) */}
            {conversationsByProject['uncategorized']?.length > 0 && (
              <div className="mt-4">
                <h3 className="px-3 py-2 text-xs font-medium text-muted-foreground">
                  General
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

// Types for project sharing
interface ProjectTeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [newName, setNewName] = useState(project.name);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Project sharing state
  const [teamMembers, setTeamMembers] = useState<ProjectTeamMember[]>([]);
  const [existingShares, setExistingShares] = useState<{id: string; userId: string; name: string; status: string}[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [publicCopied, setPublicCopied] = useState(false);

  // Load team members and existing shares when share dialog opens
  const loadShareData = async () => {
    setIsLoadingMembers(true);
    try {
      // Fetch team members
      const res = await fetch('/api/brand-members');
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.members || []);
      }

      // Fetch existing shares for all conversations in the project
      const allShares: {id: string; userId: string; name: string; status: string}[] = [];
      const seenUsers = new Set<string>();
      
      for (const conv of conversations) {
        const sharesRes = await fetch(`/api/conversation-shares?conversationId=${conv.id}`);
        if (sharesRes.ok) {
          const data = await sharesRes.json();
          for (const share of (data.shares || [])) {
            if (!seenUsers.has(share.userId)) {
              seenUsers.add(share.userId);
              allShares.push(share);
            }
          }
        }
      }
      setExistingShares(allShares);
    } catch (error) {
      console.error('Error loading share data:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleOpenShareDialog = () => {
    setShowShareDialog(true);
    setShareSuccess(false);
    setSelectedMembers(new Set());
    setPublicShareUrl(null);
    loadShareData();
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

  const handleShareProject = async () => {
    if (selectedMembers.size === 0 || conversations.length === 0) return;
    
    setIsSharing(true);
    try {
      // Share all conversations in the project with selected members
      const userIds = Array.from(selectedMembers);
      
      for (const conv of conversations) {
        await fetch('/api/conversation-shares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conv.id,
            userIds,
            message: `Shared as part of project "${project.name}"`,
          }),
        });
      }
      
      setShareSuccess(true);
      // Refresh existing shares
      loadShareData();
      setTimeout(() => {
        setShareSuccess(false);
      }, 1500);
    } catch (error) {
      console.error('Error sharing project:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveProjectShare = async (userId: string) => {
    try {
      // Remove shares for all conversations in the project for this user
      for (const conv of conversations) {
        const sharesRes = await fetch(`/api/conversation-shares?conversationId=${conv.id}`);
        if (sharesRes.ok) {
          const data = await sharesRes.json();
          const shareToRemove = (data.shares || []).find((s: any) => s.userId === userId);
          if (shareToRemove) {
            await fetch(`/api/conversation-shares?shareId=${shareToRemove.id}`, {
              method: 'DELETE',
            });
          }
        }
      }
      // Refresh existing shares
      loadShareData();
    } catch (error) {
      console.error('Error removing share:', error);
    }
  };

  const handleGenerateProjectPublicLink = async () => {
    setIsGeneratingLink(true);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType: 'project',
          resourceId: project.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate link');
      }

      const data = await response.json();
      setPublicShareUrl(data.shareUrl);
    } catch (error) {
      console.error('Error generating public link:', error);
      alert('Failed to generate public link. Please try again.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyPublicUrl = async () => {
    if (publicShareUrl) {
      await navigator.clipboard.writeText(publicShareUrl);
      setPublicCopied(true);
      setTimeout(() => setPublicCopied(false), 2000);
    }
  };

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
    <div className="group/folder">
      <div
        className={cn(
          'flex items-center rounded-lg transition-colors px-2 py-1',
          isSelected ? 'bg-accent' : 'hover:bg-accent/50'
        )}
      >
        {/* Expand/Collapse Button */}
        <button
          className="p-0.5 hover:bg-accent/50 rounded shrink-0"
          onClick={onToggle}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Icon */}
        <div className="ml-1 shrink-0">
          {isExpanded ? (
            <FolderOpen className="h-4 w-4" style={{ color: project.color || '#f97316' }} />
          ) : (
            <Folder className="h-4 w-4" style={{ color: project.color || '#f97316' }} />
          )}
        </div>
        
        {/* Name - clickable and truncates */}
        <button
          className="truncate text-left text-sm py-1.5 px-2 flex-1 min-w-0"
          onClick={() => {
            onSelect();
            onToggle();
          }}
          title={project.name}
        >
          {project.name}
        </button>
        
        {/* More menu - only visible on hover */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded hover:bg-accent opacity-0 group-hover/folder:opacity-60 hover:!opacity-100 shrink-0 transition-opacity"
              onClick={(e) => e.stopPropagation()}
              title="More"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
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
              <DropdownMenuItem onClick={handleOpenShareDialog}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Project
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
        accept=".txt,.md,.csv,.pdf,.json,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
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
          No chats in {project.name}.{' '}
          <button className="underline hover:no-underline" onClick={onNewChat}>
            Start one
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

      {/* Share Project Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share project
            </DialogTitle>
            <DialogDescription>
              Share all {conversations.length} chat{conversations.length !== 1 ? 's' : ''} in &quot;{project.name}&quot; with team members
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No chats in this project to share
              </p>
            ) : (
              <>
                {/* Team Member Selection */}
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
                        const existingShare = existingShares.find(s => s.userId === member.id);
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
                            {existingShare && (
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                existingShare.status === 'accepted' ? "bg-green-100 text-green-700" :
                                existingShare.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                                "bg-red-100 text-red-700"
                              )}>
                                {existingShare.status}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Share Button */}
                  {teamMembers.length > 0 && conversations.length > 0 && (
                    <Button
                      onClick={handleShareProject}
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
                          Invitation Sent!
                        </>
                      ) : (
                        <>
                          <Share2 className="mr-2 h-4 w-4" />
                          Send Invitation ({selectedMembers.size} selected)
                        </>
                      )}
                    </Button>
                  )}

                  {/* Currently Shared With */}
                  {existingShares.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">Currently shared with:</p>
                      <div className="space-y-1">
                        {existingShares.map((share) => (
                          <div key={share.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                            <span>{share.name} ({share.status})</span>
                            <button
                              onClick={() => handleRemoveProjectShare(share.userId)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Public Link Sharing (Anyone with Link) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Public Link (Anyone)</Label>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Anyone with this link can view (read-only)
                  </p>

                  {!publicShareUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateProjectPublicLink}
                      disabled={isGeneratingLink}
                      className="w-full"
                    >
                      {isGeneratingLink ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Generate Public Link
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input 
                          readOnly 
                          value={publicShareUrl}
                          className="flex-1 text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCopyPublicUrl}
                          className="shrink-0"
                        >
                          {publicCopied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ✓ Public link created • No expiration • Unlimited views
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Team member interface for sharing
interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role?: string;
}

// Share record interface
interface ShareRecord {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: 'pending' | 'accepted' | 'declined';
}

// Conversation item component with team member selection sharing
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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [publicCopied, setPublicCopied] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  
  // Team member sharing state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [existingShares, setExistingShares] = useState<ShareRecord[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  
  const isShared = existingShares.length > 0;

  // Fetch shares on mount to show icon
  useEffect(() => {
    const fetchShareStatus = async () => {
      try {
        const res = await fetch(`/api/conversation-shares?conversationId=${conversation.id}`);
        if (res.ok) {
          const data = await res.json();
          setExistingShares(data.shares || []);
        }
      } catch (error) {
        console.error('Error fetching share status:', error);
      }
    };
    fetchShareStatus();
  }, [conversation.id]);

  // Fetch team members and existing shares when dialog opens
  const loadShareData = async () => {
    setIsLoadingMembers(true);
    try {
      // Fetch team members
      const membersRes = await fetch('/api/brand-members');
      if (membersRes.ok) {
        const data = await membersRes.json();
        setTeamMembers(data.members || []);
      }

      // Fetch existing shares for this conversation
      const sharesRes = await fetch(`/api/conversation-shares?conversationId=${conversation.id}`);
      if (sharesRes.ok) {
        const data = await sharesRes.json();
        setExistingShares(data.shares || []);
        // Pre-select users who already have access
        const sharedUserIds = new Set((data.shares || []).map((s: ShareRecord) => s.userId));
        setSelectedMembers(sharedUserIds);
      }
    } catch (error) {
      console.error('Error loading share data:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleOpenShareDialog = () => {
    setShowShareDialog(true);
    setShareSuccess(false);
    loadShareData();
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
      // Get newly selected members (not already shared)
      const existingIds = new Set(existingShares.map(s => s.userId));
      const newMembers = Array.from(selectedMembers).filter(id => !existingIds.has(id));
      
      if (newMembers.length > 0) {
        const response = await fetch('/api/conversation-shares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversation.id,
            userIds: newMembers,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to share');
        }
      }
      
      setShareSuccess(true);
      // Reload shares to update the UI
      await loadShareData();
      
      setTimeout(() => setShareSuccess(false), 3000);
    } catch (error) {
      console.error('Error sharing conversation:', error);
      alert('Failed to share conversation. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const response = await fetch(`/api/conversation-shares?shareId=${shareId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadShareData();
      }
    } catch (error) {
      console.error('Error removing share:', error);
    }
  };

  const handleCopyPublicUrl = async () => {
    if (publicShareUrl) {
      await navigator.clipboard.writeText(publicShareUrl);
      setPublicCopied(true);
      setTimeout(() => setPublicCopied(false), 2000);
    }
  };

  const handleGeneratePublicLink = async () => {
    setIsGeneratingLink(true);
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType: 'conversation',
          resourceId: conversation.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate link');
      }

      const data = await response.json();
      setPublicShareUrl(data.shareUrl);
    } catch (error) {
      console.error('Error generating public link:', error);
      alert('Failed to generate public link. Please try again.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'group/conversation flex items-center gap-2 rounded-lg pl-3 pr-1 py-2 text-sm transition-colors cursor-pointer min-w-0',
          isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
        )}
        onClick={onSelect}
      >
        <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
        <span className="flex-1 min-w-0 break-words overflow-hidden">{conversation.title}</span>
        {isShared && (
          <span title="Shared with team members" className="shrink-0">
            <Users className="h-3 w-3 text-muted-foreground" />
          </span>
        )}
        {!isOwner && (
          <span className="text-[10px] text-muted-foreground shrink-0">shared</span>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {isOwner && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenShareDialog();
                  }}
                >
                      <Share2 className="mr-2 h-4 w-4" />
                  Share
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

      {/* Enhanced Share Dialog with Team Member Selection */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share conversation
            </DialogTitle>
            <DialogDescription>
              Select team members to share this conversation with
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Team Member Selection */}
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
                    const existingShare = existingShares.find(s => s.userId === member.id);
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
                        {existingShare && (
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            existingShare.status === 'accepted' ? "bg-green-100 text-green-700" :
                            existingShare.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          )}>
                            {existingShare.status}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Share Button */}
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
                      Invitation Sent!
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-2 h-4 w-4" />
                      Send Invitation ({selectedMembers.size} selected)
                    </>
                  )}
                </Button>
              )}

              {/* Currently Shared With */}
              {existingShares.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-2">Currently shared with:</p>
                  <div className="space-y-1">
                    {existingShares.map((share) => (
                      <div key={share.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                        <span>{share.name} ({share.status})</span>
                        <button
                          onClick={() => handleRemoveShare(share.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Public Link Sharing (Anyone with Link) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Public Link (Anyone)</Label>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Anyone with this link can view (read-only)
              </p>

              {!publicShareUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePublicLink}
                  disabled={isGeneratingLink}
                  className="w-full"
                >
                  {isGeneratingLink ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Generate Public Link
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input 
                      readOnly 
                      value={publicShareUrl}
                      className="flex-1 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyPublicUrl}
                      className="shrink-0"
                    >
                      {publicCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ✓ Public link created • No expiration • Unlimited views
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
