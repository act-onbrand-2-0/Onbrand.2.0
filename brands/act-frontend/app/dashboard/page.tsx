'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DashboardContent } from '@/components/dashboard-new/content';

export default function DashboardPage() {
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User');
      }
    });
  }, []);

  return <DashboardContent userName={userName} />;
}
