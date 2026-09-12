"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getSocket } from "@/lib/socket-client";
import { HEARTBEAT_MS, IDLE_AFTER_MS, type StoredPresence } from "@/lib/presence";

export function PresenceHeartbeat() {
  const { accountId } = useAuth();
  const lastActivityRef = useRef<number>(0);

  useEffect(() => {
    if (!accountId) return;

    const socket = getSocket();
    let cancelled = false;
    let lastBeatAt = 0;
    lastActivityRef.current = Date.now();

    const markActive = () => {
      lastActivityRef.current = Date.now();
    };

    const currentStatus = (): StoredPresence => {
      if (typeof document !== "undefined" && document.hidden) return "away";
      if (Date.now() - lastActivityRef.current > IDLE_AFTER_MS) return "away";
      return "online";
    };

    const beat = () => {
      if (cancelled) return;
      const t = Date.now();
      if (t - lastBeatAt < 1_000) return;
      lastBeatAt = t;
      
      socket.emit('presence.heartbeat', { status: currentStatus() });
    };

    const activityEvents: (keyof DocumentEventMap)[] = [
      "mousemove",
      "keydown",
      "pointerdown",
      "scroll",
    ];
    activityEvents.forEach((e) =>
      document.addEventListener(e, markActive, { passive: true }),
    );

    const onReturn = () => {
      if (!document.hidden) markActive();
      beat();
    };
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);

    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      activityEvents.forEach((e) =>
        document.removeEventListener(e, markActive),
      );
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
    };
  }, [accountId]);

  return null;
}
