'use client';

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
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Archive,
  PanelLeft,
  LayoutGrid,
  MessageSquare,
  ChevronUp,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface Conversation {
  id: string;
  title: string;
  model: string;
  last_message_at: string;
}

interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId?: string;
  isLoading?: boolean;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onArchiveConversation?: (id: string) => void;
  brandName?: string;
  userName?: string;
  userAvatar?: string;
}

export function ChatSidebar({
  conversations,
  currentConversationId,
  isLoading = false,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onArchiveConversation,
  brandName,
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
              onSelect={() => onSelectConversation(conversation.id)}
              onDelete={() => onDeleteConversation(conversation.id)}
              onArchive={
                onArchiveConversation
                  ? () => onArchiveConversation(conversation.id)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <span className="font-semibold text-base">Chatbot</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="size-8" onClick={onNewChat}>
            <Trash2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onNewChat}>
            <Plus className="size-4" />
          </Button>
        </div>
      </div>

      {/* Layout Toggle */}
      <div className="flex items-center gap-1 px-3 pb-3">
        <Button variant="ghost" size="icon" className="size-8 bg-muted">
          <PanelLeft className="size-4" />
        </Button>
        <Button variant="ghost" size="icon" className="size-8">
          <LayoutGrid className="size-4" />
        </Button>
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
          <div className="size-8 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-sm font-medium">
            G
          </div>
          <span className="flex-1 text-sm text-left">Guest</span>
          <ChevronUp className="size-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onArchive?: () => void;
}

function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  onArchive,
}: ConversationItemProps) {
  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer',
        isActive
          ? 'bg-accent text-accent-foreground'
          : 'hover:bg-accent/50'
      )}
      onClick={onSelect}
    >
      <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
      <span className="flex-1 truncate">{conversation.title}</span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100',
              isActive && 'opacity-100'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onArchive && (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
