'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardAgentsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the standalone agents section
    router.replace('/agents');
  }, [router]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary mx-auto" />
        <p className="mt-4 text-muted-foreground">Redirecting to Agents...</p>
      </div>
    </div>
  );
}
