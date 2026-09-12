"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getSocket } from "@/lib/socket-client";
import {
  derivePresence,
  type PresenceRow,
  type PresenceStatus,
  type StoredPresence,
} from "@/lib/presence";

const RE_DERIVE_MS = 15_000;

type PresenceMap = Map<string, PresenceRow>;

interface UsePresenceResult {
  getPresence: (userId: string) => PresenceStatus;
  getRow: (userId: string) => PresenceRow | undefined;
  now: number;
}

export function usePresence(enabled = true): UsePresenceResult {
  const { accountId } = useAuth();
  const [rows, setRows] = useState<PresenceMap>(() => new Map());
  const [now, setNow] = useState(() => Date.now());

  const active = enabled && !!accountId;

  useEffect(() => {
    if (!active || !accountId) return;

    let cancelled = false;
    const socket = getSocket();

    const applyRow = (row: {
      user_id: string;
      status: StoredPresence;
      last_seen_at: string;
    }) => {
      setRows((prev) => {
        const next = new Map(prev);
        next.set(row.user_id, {
          status: row.status,
          last_seen_at: row.last_seen_at,
        });
        return next;
      });
    };

    const onPresenceUpdate = (payload: { user_id: string; status: StoredPresence; last_seen_at: string }) => {
      if (cancelled) return;
      applyRow(payload);
    };

    socket.on('presence.update', onPresenceUpdate);

    // Initial sync
    socket.emit('presence.sync', (data: any[]) => {
      if (cancelled) return;
      setRows((prev) => {
        const next = new Map(prev);
        for (const r of data ?? []) {
          const incoming: PresenceRow = {
            status: r.status as StoredPresence,
            last_seen_at: r.last_seen_at as string,
          };
          const existing = next.get(r.user_id);
          if (!existing || new Date(incoming.last_seen_at) >= new Date(existing.last_seen_at)) {
            next.set(r.user_id, incoming);
          }
        }
        return next;
      });
    });

    const tick = setInterval(() => setNow(Date.now()), RE_DERIVE_MS);

    return () => {
      cancelled = true;
      clearInterval(tick);
      socket.off('presence.update', onPresenceUpdate);
    };
  }, [active, accountId]);

  const getRow = useCallback(
    (userId: string): PresenceRow | undefined => rows.get(userId),
    [rows],
  );

  const getPresence = useCallback(
    (userId: string): PresenceStatus => {
      const row = rows.get(userId);
      return derivePresence(row?.status, row?.last_seen_at, now);
    },
    [rows, now],
  );

  return { getPresence, getRow, now };
}
