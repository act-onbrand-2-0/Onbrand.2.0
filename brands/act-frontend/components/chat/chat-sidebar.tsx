'use client';

import { useState, useEffect } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
  Link as LinkIcon,
  Globe,
  Loader2,
  Search,
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
  onRenameConversation?: (id: string, title: string) => void;
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
  onRenameConversation,
  onArchiveConversation,
  onToggleVisibility,
  onCollapse,
  brandName,
  userName,
  userEmail,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  
  // Filter conversations by search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter(conv => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

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

  filteredConversations.forEach((conv) => {
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
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground overflow-hidden">
      {/* Header with collapse button */}
      <div className="flex items-center px-3 py-2">
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
      </div>
      
      {/* Action Buttons - Vertical list with labels */}
      <div className="px-2 space-y-1">
        <button
          onClick={() => {
            console.log('New chat clicked in sidebar');
            onNewChat();
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <Plus className="size-4" />
          <span>New chat</span>
        </button>
        <button
          onClick={() => setShowSearchDialog(true)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-sidebar-accent transition-colors"
        >
          <Search className="size-4" />
          <span>Search chats</span>
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
                      onNewChat();
                      setShowSearchDialog(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm bg-accent hover:bg-accent/80 transition-colors"
                  >
                    <Plus className="size-4" />
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
  const [teamCopied, setTeamCopied] = useState(false);
  const [publicCopied, setPublicCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [publicShareUrl, setPublicShareUrl] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<{ url: string; token: string } | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [teamShareMode, setTeamShareMode] = useState<'private' | 'shared'>(conversation.visibility || 'private');
  const [existingShares, setExistingShares] = useState<any[]>([]);
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
  
  // Team share URL - only accessible by users in the same brand
  // Use production URL, not localhost
  const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (typeof window !== 'undefined' && !window.location.origin.includes('localhost')) {
      return window.location.origin;
    }
    return 'https://onbrandai.app';
  };
  const teamShareUrl = `${getBaseUrl()}/chat/${conversation.id}`;

  const handleCopyTeamUrl = async () => {
    await navigator.clipboard.writeText(teamShareUrl);
    setTeamCopied(true);
    setTimeout(() => setTeamCopied(false), 2000);
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

  const handleShare = () => {
    // Open share dialog
      setShowShareDialog(true);
  };

  const handleTeamShareChange = (newMode: 'private' | 'shared') => {
    setTeamShareMode(newMode);
      onToggleVisibility?.();
  };
  
  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors cursor-pointer',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'hover:bg-accent/50'
        )}
        onClick={onSelect}
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
        <span className="flex-1 truncate min-w-0 pr-1">{conversation.title}</span>
        {isShared && (
          <span title="Shared with team">
            <Users className="h-3 w-3 shrink-0 text-muted-foreground" />
          </span>
        )}
        {!isOwner && (
          <span className="text-[9px] text-muted-foreground shrink-0">shared</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1 rounded hover:bg-accent opacity-60 hover:opacity-100 shrink-0 ml-1"
              onClick={(e) => e.stopPropagation()}
              title="More"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
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
                  Share
                </DropdownMenuItem>
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

      {/* Enhanced Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Share conversation
            </DialogTitle>
            <DialogDescription>
              Share this conversation with your team or via public link
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Team Sharing (Brand Members Only) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Team Access (Brand Members)</Label>
              </div>
              
              <RadioGroup
                value={teamShareMode}
                onValueChange={(value) => handleTeamShareChange(value as 'private' | 'shared')}
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="private" id="private" />
                  <Label htmlFor="private" className="font-normal cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Private (only you)</span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="shared" id="shared" />
                  <Label htmlFor="shared" className="font-normal cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Shared (all brand members)</span>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {teamShareMode === 'shared' && (
                <div className="flex items-center gap-2 pl-6">
            <Input 
              readOnly 
                    value={teamShareUrl}
                    className="flex-1 text-xs"
            />
            <Button
              size="sm"
              variant="outline"
                    onClick={handleCopyTeamUrl}
              className="shrink-0"
            >
                    {teamCopied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Collaborative Invite Link */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Invite Link (Collaborative)</Label>
              </div>
              
              <p className="text-sm text-muted-foreground">
                Share this link to invite teammates to collaborate on this chat
              </p>

              {!inviteLink ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateInviteLink}
                  disabled={isGeneratingInvite}
                  className="w-full"
                >
                  {isGeneratingInvite ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Create Invite Link
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Input 
                      readOnly 
                      value={inviteLink.url}
                      className="flex-1 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyInviteUrl}
                      className="shrink-0"
                    >
                      {inviteCopied ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ✓ Invite link created • Recipients can chat and collaborate
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Public Link Sharing (Anyone with Link) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Public Link (Read-only)</Label>
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

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
