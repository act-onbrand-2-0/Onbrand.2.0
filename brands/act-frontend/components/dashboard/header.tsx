"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Command,
  MoreVertical,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "@/components/notifications";

interface DashboardHeaderProps {
  title?: string;
}

export function DashboardHeader({ title = "Dashboard" }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4 border-b bg-card sticky top-0 z-10 w-full">
      <SidebarTrigger className="-ml-1 sm:-ml-2" />
      <h1 className="text-base sm:text-lg font-medium flex-1 truncate">{title}</h1>

      {/* Search */}
      <div className="hidden md:block relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
        <Input
          placeholder="Search..."
          className="pl-10 pr-14 w-[180px] lg:w-[220px] h-9 bg-card border"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-muted px-1 py-0.5 rounded text-xs text-muted-foreground">
          <Command className="size-3" />
          <span>K</span>
        </div>
      </div>

      {/* Theme Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="hidden sm:flex"
      >
        <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>

      {/* Notifications */}
      <NotificationBell />

      {/* Mobile Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Search className="size-4 mr-2" />
            Search
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? (
              <Sun className="size-4 mr-2" />
            ) : (
              <Moon className="size-4 mr-2" />
            )}
            Toggle Theme
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
