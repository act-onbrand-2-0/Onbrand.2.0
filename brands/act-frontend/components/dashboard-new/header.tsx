"use client";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  UserPlus,
  MoreVertical,
} from "lucide-react";

interface DashboardHeaderProps {
  userName: string;
}

export function DashboardHeader({ userName }: DashboardHeaderProps) {
  return (
    <header className="flex items-center justify-end gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 bg-card sticky top-0 z-10 w-full">
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <MessageSquare className="size-4 mr-2" />
            Messages
          </DropdownMenuItem>
          <DropdownMenuItem>
            <UserPlus className="size-4 mr-2" />
            Invite
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
