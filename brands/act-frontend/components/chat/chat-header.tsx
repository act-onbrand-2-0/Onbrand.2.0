'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Menu,
  Settings,
  ChevronDown,
  RefreshCw,
  MoreVertical,
  Share2,
  Trash2,
  Archive,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ChatSidebar } from './chat-sidebar';
import { NotificationBell } from '@/components/notifications';

interface Conversation {
  id: string;
  title: string;
  model: string;
  last_message_at: string;
  visibility?: 'private' | 'shared' | null;
  user_id?: string;
}

interface ChatHeaderProps {
  conversation?: Conversation | null;
  conversations: Conversation[];
  currentUserId?: string;
  isLoading?: boolean;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onArchiveConversation?: (id: string) => void;
  onToggleVisibility?: (id: string, visibility: 'private' | 'shared') => void;
  onRegenerate?: () => void;
  onOpenSettings?: () => void;
  brandName?: string;
  userName?: string;
  userEmail?: string;
}

export function ChatHeader({
  conversation,
  conversations,
  currentUserId,
  isLoading = false,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onArchiveConversation,
  onToggleVisibility,
  onRegenerate,
  onOpenSettings,
  brandName,
  userName,
  userEmail,
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Left side - Mobile menu + Title */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <ChatSidebar
              conversations={conversations}
              currentConversationId={conversation?.id}
              currentUserId={currentUserId}
              isLoading={isLoading}
              onNewChat={onNewChat}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={onDeleteConversation}
              onArchiveConversation={onArchiveConversation}
              onToggleVisibility={onToggleVisibility}
              brandName={brandName}
              userName={userName}
              userEmail={userEmail}
            />
          </SheetContent>
        </Sheet>

        {/* Title */}
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-medium truncate max-w-[200px] md:max-w-[300px]">
            {conversation?.title || 'New Chat'}
          </h1>
        </div>
      </div>

      {/* Right side - Model selector + Actions */}
      <div className="flex items-center gap-2">
        {/* Model Badge */}
        {conversation?.model && (
          <Badge variant="secondary" className="text-xs">
            {conversation.model}
          </Badge>
        )}

        {/* Regenerate Button */}
        {conversation && onRegenerate && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRegenerate}
            className="h-8 w-8"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sr-only">Regenerate response</span>
          </Button>
        )}

        {/* Notifications */}
        <NotificationBell />

        {/* Settings */}
        {onOpenSettings && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="h-8 w-8"
          >
            <Settings className="h-4 w-4" />
            <span className="sr-only">Settings</span>
          </Button>
        )}

        {/* More Options Menu */}
        {conversation && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: conversation.title || 'Chat',
                      text: `Check out this chat: ${conversation.title}`,
                      url: window.location.href,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard');
                  }
                }}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share Chat
              </DropdownMenuItem>
              {onToggleVisibility && (
                <DropdownMenuItem
                  onClick={() => onToggleVisibility(
                    conversation.id, 
                    conversation.visibility === 'shared' ? 'private' : 'shared'
                  )}
                >
                  {conversation.visibility === 'shared' ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Make Private
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Make Shared
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onArchiveConversation && (
                <DropdownMenuItem onClick={() => onArchiveConversation(conversation.id)}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onDeleteConversation(conversation.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
