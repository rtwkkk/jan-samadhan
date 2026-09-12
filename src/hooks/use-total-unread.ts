"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import type { Conversation } from "@/types";
import { RealtimeEvent } from "./use-realtime";

export function useTotalUnread(): number {
  const [total, setTotal] = useState(0);

  // Keep a live local mirror of {id: unread_count} so INSERT/UPDATE/DELETE
  // events can adjust the total in O(1) without refetching.
  const countsRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    let cancelled = false;

    // Initial load.
    (async () => {
      try {
        const map = new Map<string, number>();
        let sum = 0;
        let nextCursor: string | null = null;
        
        do {
          const fetchResponse: Response = await window.fetch(`/api/v1/conversations${nextCursor ? `?cursor=${nextCursor}` : ''}`);
          if (cancelled || !fetchResponse.ok) return;
          const jsonBody: any = await fetchResponse.json();
          for (const row of jsonBody.items) {
            const n = row.unread_count ?? 0;
            map.set(row.id, n);
            if (n > 0) sum += 1;
          }
          nextCursor = jsonBody.next_cursor;
        } while (nextCursor);

        countsRef.current = map;
        setTotal(sum);
      } catch (err) {
        // ignore
      }
    })();

    const socket = getSocket();

    const handleConversationEvent = (payload: RealtimeEvent<Conversation>) => {
      const map = countsRef.current;
      if (payload.eventType === "DELETE") {
        const oldRow = payload.old as Partial<Conversation>;
        if (oldRow.id) map.delete(oldRow.id);
      } else {
        const row = payload.new as Conversation;
        map.set(row.id, row.unread_count ?? 0);
      }
      // Recompute
      let sum = 0;
      for (const n of map.values()) if (n > 0) sum += 1;
      setTotal(sum);
    };

    socket.on('conversation.event', handleConversationEvent);

    return () => {
      cancelled = true;
      socket.off('conversation.event', handleConversationEvent);
    };
  }, []);

  return total;
}
