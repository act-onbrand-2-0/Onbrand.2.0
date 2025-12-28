'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TopNav } from '@/components/dashboard/top-nav';
import { DashboardContent } from '@/components/dashboard/content';

interface BrandUser {
  brand_id: string;
  role: string;
  created_at: string;
}

interface Quota {
  prompt_tokens_limit: number;
  prompt_tokens_used: number;
  image_generation_limit: number;
  image_generation_used: number;
  workflow_executions_limit: number;
  workflow_executions_used: number;
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [brandUser, setBrandUser] = useState<BrandUser | null>(null);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    async function loadUserData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          window.location.href = '/login';
          return;
        }

        const currentUser = session.user;
        setUser(currentUser);
        setUserName(currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User');
        
        let brandId = 'act';
        
        if (currentUser.email) {
          const emailParts = currentUser.email.split('@');
          if (emailParts.length > 1) {
            const domain = emailParts[1];
            const domainParts = domain.split('.');
            if (domainParts.length > 0) {
              brandId = domainParts[0];
            }
          }
        }

        const { data: brandUserData, error: brandUserError } = await supabase
          .from('brand_users')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (brandUserError) {
          console.error('Error fetching brand user:', brandUserError);
          return;
        }

        if (brandUserData) {
          setBrandUser(brandUserData);
          brandId = brandUserData.brand_id;

          const { data: quotaData, error: quotaError } = await supabase
            .from('brand_quotas')
            .select('*')
            .eq('brand_id', brandUserData.brand_id)
            .maybeSingle();

          if (quotaError) {
            console.error('Error fetching quota:', quotaError);
          }

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

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNav 
        user={{
          name: userName,
          email: user?.email || '',
          avatar: user?.user_metadata?.avatar_url,
        }}
        onSignOut={handleSignOut}
      />
      <main className="container mx-auto px-4 py-6">
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
    </div>
  );
}
