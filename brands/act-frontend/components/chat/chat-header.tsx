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
} from 'lucide-react';
import { ChatSidebar } from './chat-sidebar';

interface Conversation {
  id: string;
  title: string;
  model: string;
  last_message_at: string;
}

interface ChatHeaderProps {
  conversation?: Conversation | null;
  conversations: Conversation[];
  isLoading?: boolean;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  onArchiveConversation?: (id: string) => void;
  onRegenerate?: () => void;
  onOpenSettings?: () => void;
  brandName?: string;
}

export function ChatHeader({
  conversation,
  conversations,
  isLoading = false,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onArchiveConversation,
  onRegenerate,
  onOpenSettings,
  brandName,
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
              isLoading={isLoading}
              onNewChat={onNewChat}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={onDeleteConversation}
              onArchiveConversation={onArchiveConversation}
              brandName={brandName}
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
      </div>
    </header>
  );
}
