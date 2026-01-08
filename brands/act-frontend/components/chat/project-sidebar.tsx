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
  Mail,
  Search,
  Eye,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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
  onRenameConversation?: (id: string, title: string) => void;
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
  onRenameConversation,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  
  // Collapsible sidebar sections
  const [sectionCollapsed, setSectionCollapsed] = useState<{
    folders: boolean;
    chatHistory: boolean;
    sharedWithMe: boolean;
  }>({
    folders: false,
    chatHistory: false,
    sharedWithMe: false,
  });
  
  const toggleSection = (section: 'folders' | 'chatHistory' | 'sharedWithMe') => {
    setSectionCollapsed(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Filter conversations by search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

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

  // Separate shared projects (projects owned by others, marked with _isShared)
  const sharedProjects = projects.filter(
    (p: any) => p._isShared === true
  );
  
  // Separate shared conversations (conversations owned by others)
  const sharedConversations = filteredConversations.filter(
    (conv: any) => currentUserId && conv.user_id && conv.user_id !== currentUserId
  );
  
  // Get shared project IDs for filtering
  const sharedProjectIds = new Set(sharedProjects.map(p => p.id));
  
  // Shared conversations that are NOT in a shared project (these are read-only single chats)
  const sharedConversationsWithoutProject = sharedConversations.filter(
    (conv: any) => !conv.project_id || !sharedProjectIds.has(conv.project_id)
  );
  
  // Filter out shared conversations from the main list
  const ownedConversations = filteredConversations.filter(
    (conv: any) => !currentUserId || !conv.user_id || conv.user_id === currentUserId
  );

  // Debug logging
  console.log('Sidebar - currentUserId:', currentUserId);
  console.log('Sidebar - total conversations:', conversations.length);
  console.log('Sidebar - shared projects:', sharedProjects.length);
  console.log('Sidebar - shared single chats:', sharedConversationsWithoutProject.length);
  console.log('Sidebar - owned conversations:', ownedConversations.length);

  // Group owned conversations by project
  // Conversations in default projects go to 'uncategorized' (shown in "General" section)
  const conversationsByProject = ownedConversations.reduce(
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
          onClick={() => setShowSearchDialog(true)}
          title="Search chats"
        >
          <Search className="size-5" />
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
          <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
            {/* Header with gradient accent */}
            <div className="relative px-6 pt-6 pb-4">
              <div 
                className="absolute inset-0 opacity-10" 
                style={{ 
                  background: `linear-gradient(135deg, ${selectedColor} 0%, transparent 60%)` 
                }} 
              />
              <DialogHeader className="relative">
                <div className="flex items-center gap-3">
                  <div 
                    className="size-10 rounded-xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: selectedColor }}
                  >
                    <FolderPlus className="size-5 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl font-semibold">Create New Project</DialogTitle>
                    <DialogDescription className="text-sm">
                      Organize your conversations in a project folder
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-6">
              {/* Project Name */}
              <div className="space-y-2">
                <Label htmlFor="collapsed-project-name" className="text-sm font-medium">
                  Project Name
                </Label>
                <Input
                  id="collapsed-project-name"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g., Marketing Campaign"
                  className="h-11"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newProjectName.trim() && !isCreatingProject) {
                      handleCreateProject();
                    }
                  }}
                />
              </div>

              {/* Color Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Project Color</Label>
                <div className="flex flex-wrap gap-3">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        'size-9 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none',
                        selectedColor === color 
                          ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110 shadow-lg' 
                          : 'hover:shadow-md'
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                      title={`Select ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              {newProjectName.trim() && (
                <div className="pt-2">
                  <Label className="text-sm font-medium text-muted-foreground mb-2 block">Preview</Label>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                    <div 
                      className="size-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: selectedColor }}
                    >
                      <Folder className="size-4 text-white" />
                    </div>
                    <span className="font-medium">{newProjectName.trim()}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-muted/30 border-t flex justify-end gap-3">
              <Button 
                variant="ghost" 
                onClick={() => setShowNewProjectDialog(false)} 
                disabled={isCreatingProject}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject} 
                disabled={!newProjectName.trim() || isCreatingProject}
                style={{ backgroundColor: newProjectName.trim() ? selectedColor : undefined }}
                className={cn(
                  newProjectName.trim() && 'hover:opacity-90 text-white'
                )}
              >
                {isCreatingProject ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <FolderPlus className="mr-2 h-4 w-4" />
                    Create Project
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Search Dialog - needed for collapsed view too */}
        <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="sr-only">Search chats</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                  autoFocus
                />
              </div>
              <div className="max-h-[400px] overflow-y-auto space-y-1">
                {searchQuery.trim() ? (
                  filteredConversations.length > 0 ? (
                    filteredConversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          onSelectConversation(conv.id);
                          setShowSearchDialog(false);
                          setSearchQuery('');
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                      >
                        <MessageSquare className="size-4 shrink-0 opacity-50" />
                        <span className="truncate">{conv.title}</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No chats found</p>
                  )
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onNewChat(currentProjectId || undefined);
                        setShowSearchDialog(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm bg-accent hover:bg-accent/80 transition-colors"
                    >
                      <PenLine className="size-4" />
                      <span>New chat</span>
                    </button>
                    {conversations.slice(0, 10).map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => {
                          onSelectConversation(conv.id);
                          setShowSearchDialog(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                      >
                        <MessageSquare className="size-4 shrink-0 opacity-50" />
                        <span className="truncate">{conv.title}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground overflow-hidden">
      {/* Header with collapse button */}
      <div className="flex items-center px-3 py-2">
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
      </div>
      
      {/* Action Buttons - Vertical list with labels */}
      <div className="px-2 space-y-1">
        <button
          onClick={() => onNewChat(currentProjectId || undefined)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <PenLine className="size-4" />
          <span>New chat</span>
        </button>
        <button
          onClick={() => setShowSearchDialog(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <Search className="size-4" />
          <span>Search chats</span>
        </button>
        <button
          onClick={() => setShowNewProjectDialog(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <FolderPlus className="size-4" />
          <span>New project</span>
        </button>
      </div>

      {/* Search Dialog */}
      <Dialog open={showSearchDialog} onOpenChange={setShowSearchDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="sr-only">Search chats</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
                autoFocus
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {searchQuery.trim() ? (
                filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        setShowSearchDialog(false);
                        setSearchQuery('');
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <MessageSquare className="size-4 shrink-0 opacity-50" />
                      <span className="truncate">{conv.title}</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No chats found</p>
                )
              ) : (
                <>
                  <button
                    onClick={() => {
                      onNewChat(currentProjectId || undefined);
                      setShowSearchDialog(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm bg-accent hover:bg-accent/80 transition-colors"
                  >
                    <PenLine className="size-4" />
                    <span>New chat</span>
                  </button>
                  {conversations.slice(0, 10).map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        onSelectConversation(conv.id);
                        setShowSearchDialog(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                    >
                      <MessageSquare className="size-4 shrink-0 opacity-50" />
                      <span className="truncate">{conv.title}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                <button
                  onClick={() => toggleSection('folders')}
                  className="w-full flex items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className={cn(
                    "size-3 transition-transform",
                    !sectionCollapsed.folders && "rotate-90"
                  )} />
                  Folders
                </button>
              </div>
            )}

            {/* Projects (excluding default) */}
            {!sectionCollapsed.folders && projects.filter(p => !p.is_default).map((project) => (
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
                onRenameConversation={onRenameConversation}
                onDeleteProject={() => onDeleteProject(project.id)}
                onRenameProject={(name) => onRenameProject(project.id, name)}
                onUploadFile={onUploadFile ? (file) => onUploadFile(project.id, file) : undefined}
                onDeleteFile={onDeleteFile}
                onArchiveConversation={onArchiveConversation}
                onToggleVisibility={onToggleVisibility}
              />
            ))}

            {/* Chat history (uncategorized conversations) */}
            {conversationsByProject['uncategorized']?.length > 0 && (
              <div className="mt-4">
                <button
                  onClick={() => toggleSection('chatHistory')}
                  className="w-full flex items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className={cn(
                    "size-3 transition-transform",
                    !sectionCollapsed.chatHistory && "rotate-90"
                  )} />
                  Chat history
                </button>
                {!sectionCollapsed.chatHistory && (
                <div className="space-y-1">
                  {conversationsByProject['uncategorized'].map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isActive={currentConversationId === conv.id}
                      isOwner={!currentUserId || conv.user_id === currentUserId}
                      onSelect={() => onSelectConversation(conv.id)}
                      onDelete={() => onDeleteConversation(conv.id)}
                      onRename={onRenameConversation ? (title) => onRenameConversation(conv.id, title) : undefined}
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
              </div>
            )}

            {/* Shared with me section */}
            {(sharedProjects.length > 0 || sharedConversationsWithoutProject.length > 0) && (
              <div className="mt-4">
                <button
                  onClick={() => toggleSection('sharedWithMe')}
                  className="w-full flex items-center gap-1 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight className={cn(
                    "size-3 transition-transform",
                    !sectionCollapsed.sharedWithMe && "rotate-90"
                  )} />
                  <Users className="size-3 ml-1" />
                  Shared with me
                </button>

                {!sectionCollapsed.sharedWithMe && (
                <>
                {/* Shared Folders */}
                {sharedProjects.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {sharedProjects.map((project) => (
                      <ProjectItem
                        key={project.id}
                        project={project}
                        conversations={conversationsByProject[project.id] || []}
                        files={projectFiles?.[project.id] || []}
                        isExpanded={effectiveExpandedProjects.has(project.id)}
                        isSelected={currentProjectId === project.id}
                        currentConversationId={currentConversationId}
                        currentUserId={currentUserId}
                        isSharedProject={true}
                        onToggle={() => toggleProject(project.id)}
                        onSelect={() => onSelectProject(project.id)}
                        onNewChat={() => onNewChat(project.id)}
                        onSelectConversation={onSelectConversation}
                        onDeleteConversation={onDeleteConversation}
                        onDeleteProject={undefined}
                        onRenameProject={undefined}
                        onUploadFile={onUploadFile ? (file) => onUploadFile(project.id, file) : undefined}
                        onDeleteFile={onDeleteFile}
                        onArchiveConversation={onArchiveConversation}
                        onToggleVisibility={onToggleVisibility}
                      />
                    ))}
                  </div>
                )}

                {/* Shared Single Chats (read-only) */}
                {sharedConversationsWithoutProject.length > 0 && (
                  <div className="space-y-1">
                    {sharedConversationsWithoutProject.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={currentConversationId === conv.id}
                        isOwner={false}
                        isReadOnly={true}
                        onSelect={() => onSelectConversation(conv.id)}
                        onDelete={() => onDeleteConversation(conv.id)}
                        onArchive={
                          onArchiveConversation
                            ? () => onArchiveConversation(conv.id)
                            : undefined
                        }
                        onToggleVisibility={undefined}
                      />
                    ))}
                  </div>
                )}
                </>
                )}
              </div>
            )}
          </div>
        )}
      </ScrollArea>


      {/* New Project Dialog */}
      <Dialog open={showNewProjectDialog} onOpenChange={setShowNewProjectDialog}>
        <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
          {/* Header with gradient accent */}
          <div className="relative px-6 pt-6 pb-4">
            <div 
              className="absolute inset-0 opacity-10" 
              style={{ 
                background: `linear-gradient(135deg, ${selectedColor} 0%, transparent 60%)` 
              }} 
            />
            <DialogHeader className="relative">
              <div className="flex items-center gap-3">
                <div 
                  className="size-10 rounded-xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: selectedColor }}
                >
                  <FolderPlus className="size-5 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-semibold">Create New Project</DialogTitle>
                  <DialogDescription className="text-sm">
                    Organize your conversations in a project folder
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <Label htmlFor="project-name" className="text-sm font-medium">
                Project Name
              </Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g., Marketing Campaign"
                className="h-11"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim() && !isCreatingProject) {
                    handleCreateProject();
                  }
                }}
              />
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Project Color</Label>
              <div className="flex flex-wrap gap-3">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      'size-9 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none',
                      selectedColor === color 
                        ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110 shadow-lg' 
                        : 'hover:shadow-md'
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                    title={`Select ${color}`}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            {newProjectName.trim() && (
              <div className="pt-2">
                <Label className="text-sm font-medium text-muted-foreground mb-2 block">Preview</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                  <div 
                    className="size-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: selectedColor }}
                  >
                    <Folder className="size-4 text-white" />
                  </div>
                  <span className="font-medium">{newProjectName.trim()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-muted/30 border-t flex justify-end gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setShowNewProjectDialog(false)} 
              disabled={isCreatingProject}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProject} 
              disabled={!newProjectName.trim() || isCreatingProject}
              style={{ backgroundColor: newProjectName.trim() ? selectedColor : undefined }}
              className={cn(
                newProjectName.trim() && 'hover:opacity-90 text-white'
              )}
            >
              {isCreatingProject ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Create Project
                </>
              )}
            </Button>
          </div>
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
  isSharedProject?: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation?: (id: string, title: string) => void;
  onDeleteProject?: () => void;
  onRenameProject?: (name: string) => void;
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
  onRenameConversation,
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
  
  // Email sharing state
  const [shareEmail, setShareEmail] = useState('');
  const [isEmailSharing, setIsEmailSharing] = useState(false);
  const [emailShareError, setEmailShareError] = useState<string | null>(null);
  const [emailShareSuccess, setEmailShareSuccess] = useState(false);

  // Computed: is the project shared with anyone?
  const isProjectShared = existingShares.length > 0;

  // Fetch share status on mount
  useEffect(() => {
    const fetchShareStatus = async () => {
      const allShares: {id: string; userId: string; name: string; status: string}[] = [];
      const seenUsers = new Set<string>();
      
      for (const conv of conversations) {
        try {
          const res = await fetch(`/api/conversation-shares?conversationId=${conv.id}`);
          if (res.ok) {
            const data = await res.json();
            for (const share of (data.shares || [])) {
              if (!seenUsers.has(share.userId)) {
                seenUsers.add(share.userId);
                allShares.push(share);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching share status:', error);
        }
      }
      setExistingShares(allShares);
    };
    
    if (conversations.length > 0) {
      fetchShareStatus();
    }
  }, [conversations]);

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
    setShareEmail('');
    setEmailShareError(null);
    setEmailShareSuccess(false);
    loadShareData();
  };

  // Share project by email
  const handleShareProjectByEmail = async () => {
    if (!shareEmail.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareEmail.trim())) {
      setEmailShareError('Please enter a valid email address');
      return;
    }
    
    setIsEmailSharing(true);
    setEmailShareError(null);
    setEmailShareSuccess(false);
    
    try {
      const response = await fetch('/api/project-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          email: shareEmail.trim(),
          message: `Shared folder "${project.name}"`,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setEmailShareError(data.error || data.details || 'Failed to share');
        return;
      }
      
      setEmailShareSuccess(true);
      setShareEmail('');
      loadShareData();
      setTimeout(() => setEmailShareSuccess(false), 2000);
    } catch (error) {
      console.error('Error sharing project by email:', error);
      setEmailShareError('Failed to share. Please try again.');
    } finally {
      setIsEmailSharing(false);
    }
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
    if (newName.trim() && newName !== project.name && onRenameProject) {
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

        {/* Shared indicator */}
        {isProjectShared && (
          <span title="Shared with team" className="shrink-0 mr-1">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        )}
        
        {/* Share button - visible on hover */}
        <button
          className="p-1 rounded hover:bg-accent opacity-0 group-hover/folder:opacity-60 hover:!opacity-100 shrink-0 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenShareDialog();
          }}
          title="Share Project"
        >
          <Share2 className="h-4 w-4" />
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
              onRename={onRenameConversation ? (title) => onRenameConversation(conv.id, title) : undefined}
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
          <button 
            type="button"
            className="underline hover:no-underline text-primary cursor-pointer" 
            onClick={(e) => {
              e.stopPropagation();
              console.log('Start one clicked for project:', project.name);
              onNewChat();
            }}
          >
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

                  {/* Share by Email */}
                  <div className="pt-3 border-t">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-sm font-medium">Share by Email</Label>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Share this folder with someone outside your team
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={shareEmail}
                        onChange={(e) => {
                          setShareEmail(e.target.value);
                          setEmailShareError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleShareProjectByEmail();
                          }
                        }}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleShareProjectByEmail}
                        disabled={!shareEmail.trim() || isEmailSharing}
                        size="sm"
                      >
                        {isEmailSharing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : emailShareSuccess ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          'Share'
                        )}
                      </Button>
                    </div>
                    {emailShareError && (
                      <p className="text-xs text-destructive mt-1">{emailShareError}</p>
                    )}
                    {emailShareSuccess && (
                      <p className="text-xs text-green-600 mt-1">Invitation sent!</p>
                    )}
                  </div>

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
  permission?: 'read' | 'write'; // 'read' = view only, 'write' = collaborative
}

// Conversation item component with team member selection sharing
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  isOwner: boolean;
  isReadOnly?: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename?: (newTitle: string) => void;
  onArchive?: () => void;
  onToggleVisibility?: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  isOwner,
  isReadOnly = false,
  onSelect,
  onDelete,
  onRename,
  onArchive,
  onToggleVisibility,
}: ConversationItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState(conversation.title);
  
  // Invite link state (simplified sharing)
  const [inviteLink, setInviteLink] = useState<{ url: string; token: string } | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  
  // Existing shares state
  const [existingShares, setExistingShares] = useState<ShareRecord[]>([]);
  
  // Team member sharing state
  const [teamMembers, setTeamMembers] = useState<{id: string; name: string; email: string; avatar?: string; role?: string}[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const isShared = existingShares.length > 0;
  
  const toggleMemberSelection = (memberId: string) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

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

  // Generate collaborative invite link
  const handleGenerateInviteLink = async () => {
    setIsGeneratingInvite(true);
    try {
      const response = await fetch('/api/conversation-invite-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          permission: 'write', // Collaborative access
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate invite link');
      }

      const data = await response.json();
      setInviteLink({ url: data.link.url, token: data.link.token });
    } catch (error) {
      console.error('Error generating invite link:', error);
      alert('Failed to generate invite link. Please try again.');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInviteUrl = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink.url);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      const response = await fetch(`/api/conversation-shares?shareId=${shareId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Refresh shares
        const sharesRes = await fetch(`/api/conversation-shares?conversationId=${conversation.id}`);
        if (sharesRes.ok) {
          const data = await sharesRes.json();
          setExistingShares(data.shares || []);
        }
      }
    } catch (error) {
      console.error('Error removing share:', error);
    }
  };

  // Load team members when share dialog opens
  const loadTeamMembers = async () => {
    setIsLoadingMembers(true);
    try {
      const res = await fetch('/api/brand-members');
      const data = await res.json();
      console.log('=== CONV SHARE DIALOG DEBUG ===');
      console.log('API Response:', data);
      if (res.ok) {
        // Filter out members who already have shares
        const sharedUserIds = new Set(existingShares.map(s => s.userId));
        const availableMembers = (data.members || []).filter(
          (m: {id: string; name: string; email: string}) => !sharedUserIds.has(m.id)
        );
        console.log('Available members:', availableMembers);
        setTeamMembers(availableMembers);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const handleOpenShareDialog = () => {
    setShowShareDialog(true);
    setSelectedMembers(new Set());
    loadTeamMembers();
  };

  // Share with selected team members
  const handleShareWithMembers = async () => {
    if (selectedMembers.size === 0) return;
    
    setIsSharing(true);
    try {
      const memberIds = Array.from(selectedMembers);
      
      // Share conversation with each selected member
      for (const memberId of memberIds) {
        await fetch('/api/conversation-shares', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversation.id,
            userId: memberId,
            permission: 'write',
          }),
        });
      }
      
      // Refresh shares
      const sharesRes = await fetch(`/api/conversation-shares?conversationId=${conversation.id}`);
      if (sharesRes.ok) {
        const data = await sharesRes.json();
        setExistingShares(data.shares || []);
      }
      
      // Clear selection and refresh team members
      setSelectedMembers(new Set());
      loadTeamMembers();
    } catch (error) {
      console.error('Error sharing with members:', error);
    } finally {
      setIsSharing(false);
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
                {onRename && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      setNewTitle(conversation.title);
                      setShowRenameDialog(true);
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                )}
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

      {/* Rename Dialog */}
      {onRename && (
        <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Rename conversation</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Enter new title..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTitle.trim()) {
                    onRename(newTitle.trim());
                    setShowRenameDialog(false);
                  }
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  if (newTitle.trim()) {
                    onRename(newTitle.trim());
                    setShowRenameDialog(false);
                  }
                }}
                disabled={!newTitle.trim()}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

      {/* Simplified Share Dialog - Collaborative Invite Link Only */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share conversation
            </DialogTitle>
            <DialogDescription>
              Invite others to collaborate on this chat
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Team Members Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Your team
                </Label>
                {selectedMembers.size > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {selectedMembers.size} selected
                  </span>
                )}
              </div>
              
              {isLoadingMembers ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No other team members in your organization yet
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border p-2">
                  {teamMembers.map((member) => {
                    const isAlreadyShared = existingShares.some(s => s.userId === member.id);
                    return (
                      <div
                        key={member.id}
                        onClick={() => !isAlreadyShared && toggleMemberSelection(member.id)}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md transition-colors",
                          isAlreadyShared 
                            ? "opacity-50 cursor-not-allowed"
                            : selectedMembers.has(member.id)
                              ? "bg-primary/10 border border-primary/30 cursor-pointer"
                              : "hover:bg-muted cursor-pointer"
                        )}
                      >
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                        {isAlreadyShared ? (
                          <span className="text-xs text-muted-foreground">Shared</span>
                        ) : selectedMembers.has(member.id) && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedMembers.size > 0 && (
                <Button
                  onClick={handleShareWithMembers}
                  disabled={isSharing}
                  className="w-full"
                >
                  {isSharing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Share with {selectedMembers.size} teammate{selectedMembers.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>

            <Separator />

            {/* Or share via link */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Or share via link
              </Label>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can join and collaborate on this chat in real-time
              </p>
            </div>

            {!inviteLink ? (
              <Button
                onClick={handleGenerateInviteLink}
                disabled={isGeneratingInvite}
                className="w-full"
              >
                {isGeneratingInvite ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating link...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Create Invite Link
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input 
                    readOnly 
                    value={inviteLink.url}
                    className="flex-1 text-sm bg-muted"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyInviteUrl}
                    className="shrink-0"
                  >
                    {inviteCopied ? (
                      <>
                        <Check className="mr-1 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  Link ready • Share it with your teammates
                </p>
              </div>
            )}

            {/* Currently Shared With */}
            {existingShares.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Currently shared with:</p>
                <div className="space-y-1">
                  {existingShares.map((share) => (
                    <div key={share.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{share.name}</span>
                        <span className={cn(
                          "px-1.5 py-0.5 rounded text-[10px]",
                          share.status === 'accepted' ? "bg-green-100 text-green-700" :
                          share.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {share.status}
                        </span>
                      </div>
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
