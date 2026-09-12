"use client";

import { useEffect, useState } from "react";

/**
 * Count of unread notifications for the current user. Used by the
 * sidebar to surface a badge on the Notifications nav entry.
 */
export function useUnreadNotifications(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (cancelled || !res.ok) return;
        const data = await res.json();
        setCount(data.count ?? 0);
      } catch (err) {
        // ignore
      }
    };

    fetchCount();
    
    // Fallback polling to replace Supabase realtime.
    // 15 seconds is a reasonable balance for notification badges.
    const interval = setInterval(fetchCount, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return count;
}
