'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

const HEARTBEAT_INTERVAL = 60000; // 1 minute
const ACTIVITY_DEBOUNCE = 5000; // 5 seconds

export function usePresence() {
  const supabase = createClient();
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isInitializedRef = useRef(false);

  const updatePresence = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use RPC to update presence
      await supabase.rpc('update_user_presence', { p_user_id: user.id });
    } catch (err) {
      console.error('Failed to update presence:', err);
    }
  }, [supabase]);

  const setOffline = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.rpc('set_user_offline', { p_user_id: user.id });
    } catch (err) {
      console.error('Failed to set offline:', err);
    }
  }, [supabase]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Debounce activity updates
    if (now - lastActivityRef.current > ACTIVITY_DEBOUNCE) {
      lastActivityRef.current = now;
      updatePresence();
    }
  }, [updatePresence]);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Initial presence update
    updatePresence();

    // Set up heartbeat interval
    heartbeatRef.current = setInterval(updatePresence, HEARTBEAT_INTERVAL);

    // Track user activity events
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle page unload - set offline
    const handleBeforeUnload = () => {
      // Use sendBeacon for reliability during page unload
      const user = supabase.auth.getUser();
      user.then(({ data }) => {
        if (data.user) {
          // Can't use RPC during unload, so we'll rely on the 5-minute timeout
          // The presence check already accounts for this
        }
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      
      // Try to set offline on cleanup
      setOffline();
    };
  }, [supabase, updatePresence, handleActivity, setOffline]);

  return { updatePresence, setOffline };
}
