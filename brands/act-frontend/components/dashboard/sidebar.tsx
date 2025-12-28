"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  Palette,
  FolderOpen,
  HelpCircle,
  Settings,
  ChevronRight,
  ChevronDown,
  Sparkles,
  MoreHorizontal,
  ChevronsUpDown,
  Atom,
  LogOut,
  UserCircle,
  CreditCard,
  Users,
  BarChart3,
} from "lucide-react";

interface DashboardSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user?: {
    name: string;
    email: string;
    avatar?: string;
  };
  brand?: {
    id: string;
    name: string;
    memberCount?: number;
  };
  onSignOut?: () => void;
}

const menuItems = [
  {
    title: "AI Chat",
    icon: Sparkles,
    href: "/chat",
    isGradient: true,
  },
  {
    title: "Dashboard",
    icon: LayoutGrid,
    href: "/dashboard",
  },
  {
    title: "Brand Guidelines",
    icon: Palette,
    href: "/brand-guidelines",
  },
  {
    title: "Content",
    icon: FileText,
    href: "/content",
  },
  {
    title: "Image Generation",
    icon: ImageIcon,
    href: "/images",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/analytics",
  },
  {
    title: "Team",
    icon: Users,
    href: "/team",
  },
];

const recentProjects = [
  { name: "Brand Campaign Q1", hasNotification: true },
  { name: "Social Media Assets", hasNotification: false },
  { name: "Website Refresh", hasNotification: true },
];

export function DashboardSidebar({
  user,
  brand,
  onSignOut,
  ...props
}: DashboardSidebarProps) {
  const [projectsOpen, setProjectsOpen] = React.useState(true);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname?.startsWith(href);
  };

  return (
    <Sidebar collapsible="offcanvas" className="lg:border-r-0!" {...props}>
      <SidebarHeader className="p-3 sm:p-4 lg:p-5 pb-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-[#889def] text-white">
            <Atom className="size-4" />
          </div>
          <span className="font-semibold text-base sm:text-lg">ACT 2.0</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 sm:px-4 lg:px-5">
        {/* Brand Card */}
        {brand && (
          <div className="flex items-center gap-2 sm:gap-3 rounded-lg border bg-card p-2 sm:p-3 mb-3 sm:mb-4">
            <div className="flex size-8 sm:size-[34px] items-center justify-center rounded-lg bg-[#889def] text-white shrink-0">
              <span className="text-sm font-bold">{brand.name?.[0]?.toUpperCase() || 'A'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs sm:text-sm capitalize">{brand.name}</p>
              {brand.memberCount && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="size-3 sm:size-3.5" />
                  <span className="text-[10px] sm:text-xs">{brand.memberCount} Members</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Menu */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    className="h-9 sm:h-[38px]"
                  >
                    <Link href={item.href}>
                      <item.icon
                        className={`size-4 sm:size-5 ${
                          item.isGradient ? "text-[#889def]" : ""
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          item.isGradient
                            ? "text-[#889def] font-medium"
                            : ""
                        }`}
                      >
                        {item.title}
                      </span>
                      {isActive(item.href) && (
                        <ChevronRight className="ml-auto size-4 text-muted-foreground opacity-60" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Recent Projects */}
        <Collapsible open={projectsOpen} onOpenChange={setProjectsOpen}>
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="flex items-center justify-between px-0 text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-pointer">
                  <ChevronDown
                    className={`size-3 sm:size-3.5 transition-transform ${
                      projectsOpen ? "" : "-rotate-90"
                    }`}
                  />
                  RECENT PROJECTS
                </div>
              </CollapsibleTrigger>
              <MoreHorizontal className="size-4 cursor-pointer hover:text-foreground transition-colors" />
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="mt-2">
                  {recentProjects.map((project) => (
                    <SidebarMenuItem key={project.name}>
                      <SidebarMenuButton asChild className="h-9 sm:h-[38px]">
                        <Link href="#">
                          <FolderOpen className="size-4 sm:size-5 text-muted-foreground" />
                          <span className="flex-1 text-muted-foreground text-sm truncate">
                            {project.name}
                          </span>
                          {project.hasNotification && (
                            <div className="size-1.5 rounded-full bg-[#889def] shrink-0" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-9 sm:h-[38px]">
              <Link href="/help">
                <HelpCircle className="size-4 sm:size-5" />
                <span className="text-sm">Help Center</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-9 sm:h-[38px]">
              <Link href="/settings">
                <Settings className="size-4 sm:size-5" />
                <span className="text-sm">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors">
              <Avatar className="size-7 sm:size-8">
                {user?.avatar && <AvatarImage src={user.avatar} />}
                <AvatarFallback className="text-xs bg-[#889def] text-white">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs sm:text-sm">{user?.name || 'User'}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {user?.email || ''}
                </p>
              </div>
              <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserCircle className="size-4 mr-2" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/billing">
                <CreditCard className="size-4 mr-2" />
                Billing
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="size-4 mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive"
              onClick={onSignOut}
            >
              <LogOut className="size-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
