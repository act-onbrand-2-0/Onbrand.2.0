"use client";

import { WelcomeSection } from "./welcome-section";
import { StatsCards } from "./stats-cards";
import { QuickActions } from "./quick-actions";
import { DashboardChatPrompt } from "./chat-prompt";

interface DashboardContentProps {
  user?: {
    name: string;
    email: string;
  };
  quota?: {
    prompt_tokens_used: number;
    prompt_tokens_limit: number;
    image_generation_used: number;
    image_generation_limit: number;
    workflow_executions_used: number;
    workflow_executions_limit: number;
  };
  stats?: {
    newChats?: number;
    pendingTasks?: number;
    contentCount?: number;
  };
}

export function DashboardContent({ user, quota, stats }: DashboardContentProps) {
  return (
    <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 bg-background">
      {/* Welcome + Chat Prompt - Centered */}
      <div className="flex flex-col items-center gap-4 pt-4 sm:pt-8">
        <WelcomeSection userName={user?.name} />
        <DashboardChatPrompt />
      </div>
      
      <StatsCards 
        data={{
          promptTokensUsed: quota?.prompt_tokens_used,
          promptTokensLimit: quota?.prompt_tokens_limit,
          imageGenerationUsed: quota?.image_generation_used,
          imageGenerationLimit: quota?.image_generation_limit,
          contentCount: stats?.contentCount,
          workflowsUsed: quota?.workflow_executions_used,
          workflowsLimit: quota?.workflow_executions_limit,
        }}
      />
      
      <QuickActions />
    </div>
  );
}
