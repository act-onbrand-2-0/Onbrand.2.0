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
  Sun,
  Moon,
  Check,
  Plus,
} from "lucide-react";
import { useTheme } from "next-themes";
import { NotificationBell } from "@/components/notifications";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutGrid,
    href: "/dashboard",
  },
  {
    title: "Chat",
    icon: Sparkles,
    href: "/dashboard/chat",
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

// Placeholder brands for UI - feature not built yet
const placeholderBrands = [
  { id: '1', name: 'ACT.onbrand', initials: 'AO', color: 'bg-primary' },
  { id: '2', name: 'Oddido', initials: 'OD', color: 'bg-blue-500' },
  { id: '3', name: 'Zwinc', initials: 'ZW', color: 'bg-orange-500' },
];

interface DashboardSidebarProps extends React.ComponentProps<typeof Sidebar> {
  userName: string;
  userEmail: string;
  brandName?: string;
}

export function DashboardSidebar({
  userName,
  userEmail,
  brandName = 'ACT.onbrand',
  ...props
}: DashboardSidebarProps) {
  const [foldersOpen, setFoldersOpen] = React.useState(true);
  const pathname = usePathname();
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { setTheme, theme } = useTheme();
  const isDark = theme === "dark";
  
  // Get current brand info (use brandName prop or default)
  const currentBrand = placeholderBrands.find(b => b.name === brandName) || placeholderBrands[0];

  return (
    <Sidebar collapsible="icon" className="lg:border-r-0! transition-all duration-200" {...props}>
      {!isCollapsed && (
        <SidebarHeader className="p-3 sm:p-4 lg:p-5 pb-0">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center gap-2 hover:bg-accent rounded-md px-2 py-1.5 -ml-2 transition-colors cursor-pointer"
                  title="Switch brand"
                >
                  <div className={`size-6 rounded-md ${currentBrand.color} flex items-center justify-center text-white text-xs font-semibold`}>
                    {currentBrand.initials}
                  </div>
                  <span className="font-semibold text-base sm:text-lg">{brandName}</span>
                  <ChevronsUpDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-[220px]">
                {placeholderBrands.map((brand) => (
                  <DropdownMenuItem 
                    key={brand.id}
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      // TODO: Implement brand switching
                      console.log('Switch to brand:', brand.name);
                    }}
                  >
                    <div className={`size-6 rounded-md ${brand.color} flex items-center justify-center text-white text-xs font-semibold`}>
                      {brand.initials}
                    </div>
                    <span className="flex-1">{brand.name}</span>
                    {brand.name === brandName && <Check className="size-4" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    // TODO: Implement add new brand
                    console.log('Add new brand');
                  }}
                >
                  <Plus className="size-4" />
                  <span>Add new brand</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-auto flex items-center gap-1">
              <NotificationBell />
              <button 
                onClick={toggleSidebar}
                className="p-1 hover:bg-accent rounded transition-colors"
                title="Collapse sidebar"
              >
                <PanelLeft className="size-4 text-muted-foreground" />
              </button>
            </div>
          </div>
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
          <SidebarMenuItem className={isCollapsed ? "w-auto" : ""}>
            <SidebarMenuButton 
              className={isCollapsed ? "h-10 w-10 !p-0" : "h-9 sm:h-[38px]"}
              tooltip={isDark ? "Light Mode" : "Dark Mode"}
              onClick={() => setTheme(isDark ? "light" : "dark")}
            >
              {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
              {!isCollapsed && <span className="text-sm">{isDark ? "Light Mode" : "Dark Mode"}</span>}
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
