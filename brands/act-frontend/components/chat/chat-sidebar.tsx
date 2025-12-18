'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Archive,
  PanelLeft,
  LayoutGrid,
  MessageSquare,
  ChevronUp,
  Share2,
  Lock,
  Users,
  Copy,
  Check,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface Conversation {
  id: string;
  title: string;
  model: string;
  last_message_at: string;
  visibility?: 'private' | 'shared' | null;
  user_id?: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  currentUserId?: string;
  isLoading?: boolean;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onArchiveConversation?: (id: string) => void;
  onToggleVisibility?: (id: string, visibility: 'private' | 'shared') => void;
  onCollapse?: () => void;
  brandName?: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export function ChatSidebar({
  conversations,
  currentConversationId,
  currentUserId,
  isLoading = false,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onArchiveConversation,
  onToggleVisibility,
  onCollapse,
  brandName,
  userName,
  userEmail,
}: ChatSidebarProps) {
  // Group conversations by date
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const groupedConversations = {
    today: [] as Conversation[],
    yesterday: [] as Conversation[],
    lastWeek: [] as Conversation[],
    older: [] as Conversation[],
  };

  conversations.forEach((conv) => {
    const date = new Date(conv.last_message_at);
    if (date.toDateString() === today.toDateString()) {
      groupedConversations.today.push(conv);
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupedConversations.yesterday.push(conv);
    } else if (date > lastWeek) {
      groupedConversations.lastWeek.push(conv);
    } else {
      groupedConversations.older.push(conv);
    }
  });

  const renderConversationGroup = (
    title: string,
    items: Conversation[]
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="mb-4">
        <h3 className="px-3 py-2 text-xs font-medium text-muted-foreground">
          {title}
        </h3>
        <div className="space-y-1">
          {items.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              isActive={currentConversationId === conversation.id}
              isOwner={!currentUserId || conversation.user_id === currentUserId}
              onSelect={() => onSelectConversation(conversation.id)}
              onDelete={() => onDeleteConversation(conversation.id)}
              onArchive={
                onArchiveConversation
                  ? () => onArchiveConversation(conversation.id)
                  : undefined
              }
              onToggleVisibility={
                onToggleVisibility
                  ? () => onToggleVisibility(
                      conversation.id,
                      conversation.visibility === 'shared' ? 'private' : 'shared'
                    )
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    );
  };

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
            onClick={() => {
              console.log('+ button clicked in sidebar');
              onNewChat();
            }}
            title="New Chat"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-2 py-2">
        {isLoading ? (
          <div className="space-y-2 px-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">
            You have reached the end of your chat history.
          </div>
        ) : (
          <>
            {renderConversationGroup('Last 30 days', groupedConversations.today)}
            {renderConversationGroup('Yesterday', groupedConversations.yesterday)}
            {renderConversationGroup('Previous 7 Days', groupedConversations.lastWeek)}
            {renderConversationGroup('Older', groupedConversations.older)}
            
            <div className="px-3 py-4 text-xs text-muted-foreground">
              You have reached the end of your chat history.
            </div>
          </>
        )}
      </ScrollArea>
      
      {/* User Section */}
      <div className="mt-auto border-t border-sidebar-border p-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-sidebar-accent transition-colors">
          <div className="size-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-medium shrink-0">
            {(userName?.[0] || userEmail?.[0] || 'U').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium truncate">
              {userName || 'User'}
            </div>
            {userEmail && (
              <div className="text-xs text-muted-foreground truncate">
                {userEmail}
              </div>
            )}
          </div>
          <ChevronUp className="size-4 text-muted-foreground shrink-0" />
        </button>
      </div>
    </div>
  );
}

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
  const [copied, setCopied] = useState(false);
  const isShared = conversation.visibility === 'shared';
  
  // Generate share URL - only accessible by users in the same brand
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/chat/${conversation.id}`
    : '';

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (isShared) {
      // Already shared - show the share URL dialog
      setShowShareDialog(true);
    } else {
      // Not shared yet - toggle visibility and show dialog
      onToggleVisibility?.();
      setShowShareDialog(true);
    }
  };
  
  return (
    <>
      <div
        className={cn(
          'group relative flex items-center gap-2 rounded-lg pl-3 pr-8 py-2 text-sm transition-colors cursor-pointer',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-accent/50'
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
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 hover:bg-sidebar-accent"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {/* Share option - only for owner */}
            {isOwner && onToggleVisibility && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShare();
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  {isShared ? 'Copy Link' : 'Share with Team'}
                </DropdownMenuItem>
                {isShared && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility();
                    }}
                  >
                    <Lock className="mr-2 h-4 w-4" />
                    Make Private
                  </DropdownMenuItem>
                )}
              </>
            )}
            {/* Delete - shows confirmation dialog */}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
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
              This will permanently delete &quot;{conversation.title}&quot; and all its messages. This action cannot be undone.
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

      {/* Share Dialog */}
      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Share conversation
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Anyone in your organization with this link can view this conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 mt-2">
            <Input 
              readOnly 
              value={shareUrl}
              className="flex-1 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyUrl}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
