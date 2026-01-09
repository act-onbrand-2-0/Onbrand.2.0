'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { DashboardSidebar } from '@/components/dashboard-new/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { usePresence } from '@/hooks/use-presence';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  
  // Track user presence for notification routing (push vs email)
  usePresence();

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
        
        const { data: brandUserData, error: brandUserError } = await supabase
          .from('brand_users')
          .select('*')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (brandUserError) {
          console.error('Error fetching brand user:', brandUserError);
          return;
        }

        if (brandUserData && !brandUserData.job_function) {
          router.push('/onboarding/function');
          return;
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadUserData();
  }, [router]);

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
    <SidebarProvider className="bg-sidebar">
      <DashboardSidebar userName={userName} userEmail={user?.email || ''} />
      <div className="h-svh overflow-hidden lg:p-2 w-full relative">
        <div className="lg:border lg:rounded-md overflow-hidden flex flex-col h-full w-full bg-background">
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
