'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  LayoutGrid,
  Calendar,
  Calculator,
  ArrowLeft,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const agentMenuItems = [
  {
    title: 'Overzicht',
    icon: LayoutGrid,
    href: '/agents',
  },
  {
    title: 'Corvee Schema',
    icon: Calendar,
    href: '/agents/corvee',
    description: 'Wekelijks corveerooster',
  },
  {
    title: 'Account Agent',
    icon: Calculator,
    href: '/agents/budget',
    description: 'Project budgetten',
  },
];

export function AgentsSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" className="lg:border-r-0! transition-all duration-200" {...props}>
      <SidebarHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-md bg-primary flex items-center justify-center">
            <Bot className="size-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">AI Agents</span>
        </div>
        <Link href="/dashboard" className="mt-4">
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Terug naar Dashboard
          </Button>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Agents</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agentMenuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    disabled={item.disabled}
                    tooltip={item.description || item.title}
                  >
                    {item.disabled ? (
                      <span className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                        <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                          Soon
                        </span>
                      </span>
                    ) : (
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
