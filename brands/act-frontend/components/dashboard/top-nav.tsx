"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Bot,
  Video,
  Calendar,
  Send,
  Settings,
  LogOut,
  UserCircle,
  CreditCard,
  ChevronsUpDown,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TopNavProps {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  onSignOut?: () => void;
}

const aiToolsItems = [
  {
    title: "AI Chat",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    title: "AI Agents",
    href: "/agents",
    icon: Bot,
  },
  {
    title: "Meetings",
    href: "/meetings",
    icon: Video,
  },
  {
    title: "Content Calendar",
    href: "/calendar",
    icon: Calendar,
  },
];

export function TopNav({ user, onSignOut }: TopNavProps) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex h-16 items-center px-4 md:px-6">
        {/* Logo - Left aligned */}
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/images/Logo.png"
            alt="onbrand"
            width={160}
            height={40}
            priority
            className="h-10 w-auto"
          />
        </Link>

        {/* Navigation - Centered */}
        <NavigationMenu className="hidden md:flex absolute left-1/2 -translate-x-1/2">
          <NavigationMenuList>
            {/* AI Tools with dropdown */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent">
                AI Tools
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <ul className="w-[180px] p-2">
                  {aiToolsItems.map((item) => (
                    <li key={item.title}>
                      <NavigationMenuLink asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2 select-none rounded-md px-3 py-2 text-sm no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                            pathname === item.href && "bg-accent"
                          )}
                        >
                          <item.icon className="h-4 w-4 text-[#889def]" />
                          <span>{item.title}</span>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Create - simple link */}
            <NavigationMenuItem>
              <Link href="/create" className={navigationMenuTriggerStyle()}>
                Create
              </Link>
            </NavigationMenuItem>

            {/* Check - simple link */}
            <NavigationMenuItem>
              <Link href="/check" className={navigationMenuTriggerStyle()}>
                Check
              </Link>
            </NavigationMenuItem>

            {/* Approve - simple link */}
            <NavigationMenuItem>
              <Link href="/approve" className={navigationMenuTriggerStyle()}>
                Approve
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right side - icons and user - Right aligned */}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Send className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex" asChild title="Brand Configuration">
            <Link href="/brand-configuration">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  {user?.avatar && <AvatarImage src={user.avatar} />}
                  <AvatarFallback className="bg-[#889def] text-white text-xs">
                    {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {user?.email || ''}
                  </p>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserCircle className="h-4 w-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/billing">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Billing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="h-4 w-4 mr-2" />
                  Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/brand-configuration">
                  <Settings className="h-4 w-4 mr-2" />
                  Brand Configuration
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={onSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

