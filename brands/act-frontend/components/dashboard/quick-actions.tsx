"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Image as ImageIcon, FileText, Settings, Upload, Palette } from "lucide-react";
import Link from "next/link";

const actions = [
  {
    title: "Start Chat",
    description: "Chat with AI assistant",
    icon: MessageSquare,
    href: "/chat",
    color: "from-[#889def] to-[#6b7fd4]",
  },
  {
    title: "Generate Image",
    description: "Create brand visuals",
    icon: ImageIcon,
    href: "/images",
    color: "from-blue-500 to-purple-500",
  },
  {
    title: "Upload Document",
    description: "Add brand guidelines",
    icon: Upload,
    href: "/documents",
    color: "from-green-500 to-emerald-500",
  },
  {
    title: "Brand Check",
    description: "Validate content",
    icon: Palette,
    href: "/brand-check",
    color: "from-violet-500 to-purple-500",
  },
  {
    title: "Create Content",
    description: "Generate on-brand copy",
    icon: FileText,
    href: "/content",
    color: "from-cyan-500 to-blue-500",
  },
  {
    title: "Settings",
    description: "Manage preferences",
    icon: Settings,
    href: "/settings",
    color: "from-gray-500 to-gray-600",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
        <CardDescription>Get started with common tasks</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {actions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="group flex flex-col items-center gap-3 rounded-lg border border-dashed border-border p-4 text-center transition-all hover:border-primary hover:bg-accent"
            >
              <div className={`rounded-lg bg-gradient-to-br ${action.color} p-2.5`}>
                <action.icon className="size-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  {action.title}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
