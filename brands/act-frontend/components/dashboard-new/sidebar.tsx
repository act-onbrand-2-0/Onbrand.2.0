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
  useSidebar,
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
import {
  LayoutGrid,
  Folder,
  Settings,
  ChevronRight,
  ChevronDown,
  Sparkles,
  MoreHorizontal,
  ChevronsUpDown,
  LogOut,
  UserCircle,
  CreditCard,
  PanelLeft,
} from "lucide-react";

const menuItems = [
  {
    title: "Chat",
    icon: Sparkles,
    href: "/dashboard/chat",
  },
  {
    title: "Dashboard",
    icon: LayoutGrid,
    href: "/dashboard",
  },
  {
    title: "Brand Config",
    icon: Settings,
    href: "/dashboard/brand-configuration",
  },
];

const folders = [
  { name: "TechCorp Upgrade", hasNotification: true },
  { name: "Fintra Expansion", hasNotification: true },
  { name: "Nova Redesign", hasNotification: true },
];

interface DashboardSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userName: string;
  userEmail: string;
}

export function DashboardSidebar({
  userName,
  userEmail,
  ...props
}: DashboardSidebarProps) {
  const [foldersOpen, setFoldersOpen] = React.useState(true);
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="lg:border-r-0! transition-all duration-200" {...props}>
      {!isCollapsed && (
        <SidebarHeader className="p-3 sm:p-4 lg:p-5 pb-0">
          <button 
            onClick={toggleSidebar}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity cursor-pointer"
            title="Collapse sidebar"
          >
            <span className="font-semibold text-base sm:text-lg">ACT.onbrand</span>
          </button>
        </SidebarHeader>
      )}

      <SidebarContent className={isCollapsed ? "px-0 pt-4" : "px-3 sm:px-4 lg:px-5"}>
        <SidebarGroup className={isCollapsed ? "p-0 w-full flex flex-col items-center" : "p-0"}>
          <SidebarGroupContent className={isCollapsed ? "w-full" : ""}>
            <SidebarMenu className={isCollapsed ? "w-full flex flex-col items-center gap-1" : ""}>
              {/* Expand button - only when collapsed, as first menu item */}
              {isCollapsed && (
                <SidebarMenuItem className="w-auto">
                  <SidebarMenuButton
                    className="h-10 w-10 !p-0"
                    tooltip="Expand sidebar"
                    onClick={toggleSidebar}
                  >
                    <PanelLeft className="size-5" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {menuItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.title} className={isCollapsed ? "w-auto" : ""}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={isCollapsed ? "h-10 w-10 !p-0" : "h-9 sm:h-[38px]"}
                      tooltip={item.title}
                    >
                      <Link href={item.href} className={isCollapsed ? "flex items-center justify-center w-full h-full" : ""}>
                        <item.icon className="size-5" />
                        {!isCollapsed && (
                          <>
                            <span className="text-sm">
                              {item.title}
                            </span>
                            {isActive && (
                              <ChevronRight className="ml-auto size-4 text-muted-foreground opacity-60" />
                            )}
                          </>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

      </SidebarContent>

      <SidebarFooter className={isCollapsed ? "px-0 pb-3 w-full" : "px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5"}>
        <SidebarMenu className={isCollapsed ? "w-full flex flex-col items-center gap-1" : ""}>
          <SidebarMenuItem className={isCollapsed ? "w-auto" : ""}>
            <SidebarMenuButton 
              asChild 
              className={isCollapsed ? "h-10 w-10 !p-0" : "h-9 sm:h-[38px]"}
              tooltip="Settings"
            >
              <Link href="/dashboard/settings" className={isCollapsed ? "flex items-center justify-center w-full h-full" : ""}>
                <Settings className="size-5" />
                {!isCollapsed && <span className="text-sm">Settings</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className={`flex items-center ${isCollapsed ? "justify-center w-full" : "gap-2 sm:gap-3 p-2 sm:p-3"} rounded-lg cursor-pointer hover:bg-accent transition-colors`}>
              <Avatar className={isCollapsed ? "size-8" : "size-7 sm:size-8"}>
                <AvatarImage src={`https://api.dicebear.com/9.x/glass/svg?seed=${userName}`} />
                <AvatarFallback className="text-xs">{userName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs sm:text-sm">{userName}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {userEmail}
                    </p>
                  </div>
                  <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
                </>
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem>
              <UserCircle className="size-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard className="size-4 mr-2" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="size-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => {
              const supabase = require('@/lib/supabase/client').createClient();
              supabase.auth.signOut();
              window.location.href = '/login';
            }}>
              <LogOut className="size-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
