'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardContent } from '@/components/dashboard/content';

interface Quota {
  prompt_tokens_limit: number;
  prompt_tokens_used: number;
  image_generation_limit: number;
  image_generation_used: number;
  workflow_executions_limit: number;
  workflow_executions_used: number;
}

export default function CreatePage() {
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) return;

        const currentUser = session.user;
        setUser(currentUser);
        setUserName(currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User');

        const { data: brandUserData } = await supabase
          .from('brand_users')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (brandUserData) {
          const { data: quotaData } = await supabase
            .from('brand_quotas')
            .select('*')
            .eq('brand_id', brandUserData.brand_id)
            .maybeSingle();

          if (quotaData) {
            setQuota(quotaData);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
      <DashboardContent 
        user={{
          name: userName,
          email: user?.email || '',
        }}
        quota={quota || undefined}
        stats={{
          newChats: 3,
          pendingTasks: 2,
          contentCount: 12,
        }}
      />
    </main>
  );
}
