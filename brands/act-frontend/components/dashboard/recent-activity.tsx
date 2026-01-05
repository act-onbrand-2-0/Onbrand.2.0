"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Image as ImageIcon, FileText, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: 'chat' | 'image' | 'content' | 'check';
  title: string;
  description?: string;
  timestamp: Date;
  status?: 'completed' | 'pending' | 'failed';
}

interface RecentActivityProps {
  activities?: Activity[];
}

const typeIcons = {
  chat: MessageSquare,
  image: ImageIcon,
  content: FileText,
  check: CheckCircle2,
};

const typeColors = {
  chat: "bg-[#063EF8]/20 text-[#063EF8] dark:bg-[#063EF8]/20 dark:text-[#063EF8]",
  image: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  content: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  check: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
};

const defaultActivities: Activity[] = [
  {
    id: "1",
    type: "chat",
    title: "Brand Strategy Discussion",
    description: "Discussed Q1 marketing approach",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    status: "completed",
  },
  {
    id: "2",
    type: "image",
    title: "Social Media Banner",
    description: "Generated Instagram story template",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    status: "completed",
  },
  {
    id: "3",
    type: "content",
    title: "Blog Post Draft",
    description: "AI-assisted article creation",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    status: "pending",
  },
  {
    id: "4",
    type: "check",
    title: "Brand Compliance Check",
    description: "Validated newsletter design",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    status: "completed",
  },
];

export function RecentActivity({ activities = defaultActivities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <CardDescription>Your latest actions and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = typeIcons[activity.type];
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <div className={`rounded-lg p-2 ${typeColors[activity.type]}`}>
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{activity.title}</p>
                    {activity.status && (
                      <Badge
                        variant={activity.status === "completed" ? "default" : "secondary"}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                  {activity.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {activity.description}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
