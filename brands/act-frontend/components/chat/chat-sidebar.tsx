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
  Mail,
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
          {items.map((conversation, index) => (
            <div
              key={conversation.id}
              className="animate-in fade-in slide-in-from-left-2 duration-200"
              style={{ animationDelay: `${Math.min(index * 30, 300)}ms`, animationFillMode: 'both' }}
            >
              <ConversationItem
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
            </div>
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
  
  // Team member sharing state
  const [teamMembers, setTeamMembers] = useState<{id: string; name: string; email: string; avatar?: string}[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isSharingWithMembers, setIsSharingWithMembers] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [isSharingByEmail, setIsSharingByEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  
  // Share status is fetched when dialog opens, not on mount (to reduce API calls)

  // Fetch team members when share dialog opens
  useEffect(() => {
    if (!showShareDialog) return;
    
    const fetchTeamMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const res = await fetch('/api/brand-members');
        const data = await res.json();
        console.log('=== SHARE DIALOG DEBUG ===');
        console.log('API Response status:', res.status);
        console.log('API Response data:', data);
        console.log('Existing shares:', existingShares);
        
        if (res.ok) {
          // Filter out members who already have shares
          const sharedUserIds = new Set(existingShares.map(s => s.userId));
          console.log('Shared user IDs:', [...sharedUserIds]);
          const availableMembers = (data.members || []).filter(
            (m: any) => !sharedUserIds.has(m.id)
          );
          console.log('Available members after filter:', availableMembers);
          setTeamMembers(availableMembers);
        } else {
          console.error('API Error:', data.error);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
      } finally {
        setIsLoadingMembers(false);
      }
    };
    fetchTeamMembers();
  }, [showShareDialog, existingShares]);

  // Share with selected team members
  const handleShareWithMembers = async () => {
    if (selectedMembers.size === 0) return;
    
    setIsSharingWithMembers(true);
    setShareSuccess(null);
    try {
      const res = await fetch('/api/conversation-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          userIds: Array.from(selectedMembers),
          permission: 'write', // Collaborative access
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        const count = data.sharesCreated || selectedMembers.size;
        setShareSuccess(`Sent to ${count} teammate${count !== 1 ? 's' : ''}!`);
        // Refresh shares list
        const sharesRes = await fetch(`/api/conversation-shares?conversationId=${conversation.id}`);
        if (sharesRes.ok) {
          const sharesData = await sharesRes.json();
          setExistingShares(sharesData.shares || []);
        }
        // Clear selection
        setSelectedMembers(new Set());
        // Remove shared members from available list
        setTeamMembers(prev => prev.filter(m => !selectedMembers.has(m.id)));
      }
    } catch (error) {
      console.error('Error sharing with members:', error);
    } finally {
      setIsSharingWithMembers(false);
    }
  };

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

  // Share by email address
  const handleShareByEmail = async () => {
    if (!emailInput.trim()) return;
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput.trim())) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    setIsSharingByEmail(true);
    setEmailError(null);
    setShareSuccess(null);
    
    try {
      const res = await fetch('/api/conversation-shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          email: emailInput.trim(),
          permission: 'write',
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShareSuccess(`Invitation sent to ${emailInput}!`);
        setEmailInput('');
        // Refresh shares list
        const sharesRes = await fetch(`/api/conversation-shares?conversationId=${conversation.id}`);
        if (sharesRes.ok) {
          const sharesData = await sharesRes.json();
          setExistingShares(sharesData.shares || []);
        }
      } else {
        setEmailError(data.error || data.details || 'Failed to share');
      }
    } catch (error) {
      console.error('Error sharing by email:', error);
      setEmailError('Failed to send invitation');
    } finally {
      setIsSharingByEmail(false);
    }
  };
  
  // Team share URL - only accessible by users in the same brand
  // Always use window.location.origin which reflects the actual domain
  // (including branch subdomains like chatbot.onbrandai.app)
  const teamShareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/chat/${conversation.id}`
    : '';

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
              Invite others to collaborate on this chat
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Share by Email */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Invite by email
              </Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setEmailError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleShareByEmail()}
                  className="flex-1"
                />
                <Button
                  onClick={handleShareByEmail}
                  disabled={isSharingByEmail || !emailInput.trim()}
                  size="sm"
                >
                  {isSharingByEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
              {emailError && (
                <p className="text-xs text-red-500">{emailError}</p>
              )}
              {shareSuccess && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {shareSuccess}
                </p>
              )}
            </div>

            {/* Team Members List (if any) */}
            {(isLoadingMembers || teamMembers.length > 0) && (
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
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border p-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        onClick={() => toggleMemberSelection(member.id)}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                          selectedMembers.has(member.id)
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                        {selectedMembers.has(member.id) && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              
              {selectedMembers.size > 0 && (
                <Button
                  onClick={handleShareWithMembers}
                  disabled={isSharingWithMembers}
                  className="w-full"
                >
                  {isSharingWithMembers ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-4 w-4" />
                      Share with {selectedMembers.size} teammate{selectedMembers.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
              
              {shareSuccess && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  {shareSuccess} They&apos;ll get a notification.
                </p>
              )}
              
              {/* Show existing shares */}
              {existingShares.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Already shared with:</p>
                  <div className="flex flex-wrap gap-1">
                    {existingShares.map((share) => (
                      <span 
                        key={share.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-xs"
                      >
                        {share.name || share.email}
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          share.status === 'accepted' ? "bg-green-500" : "bg-yellow-500"
                        )} />
                      </span>
                    ))}
                  </div>
                </div>
              )}
              </div>
            )}
            
            <Separator />

            {/* Collaborative Invite Link */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Or share via link
              </Label>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can join and collaborate
              </p>

              {!inviteLink ? (
                <Button
                  variant="outline"
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
                    Link ready
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
