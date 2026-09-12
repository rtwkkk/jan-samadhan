"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { getSocket } from "@/lib/socket-client";
import type { Message, Conversation } from "@/types";

export interface RealtimeEvent<T> {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
}

interface UseRealtimeOptions {
  channelName: string; // Kept for API compatibility, though Socket.IO handles rooms on the backend
  onMessageEvent?: (event: RealtimeEvent<Message>) => void;
  onConversationEvent?: (event: RealtimeEvent<Conversation>) => void;
  enabled?: boolean;
}

export function useRealtime({
  onMessageEvent,
  onConversationEvent,
  enabled = true,
}: UseRealtimeOptions) {
  const [isConnected, setIsConnected] = useState(false);

  // Store latest callbacks in refs to avoid re-subscribing when the
  // parent re-renders with fresh closures.
  const onMessageRef = useRef(onMessageEvent);
  const onConversationRef = useRef(onConversationEvent);
  useEffect(() => {
    onMessageRef.current = onMessageEvent;
    onConversationRef.current = onConversationEvent;
  });

  useEffect(() => {
    if (!enabled) return;

    const socket = getSocket();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    const handleMessage = (payload: any) => {
      onMessageRef.current?.(payload);
    };

    const handleConversation = (payload: any) => {
      onConversationRef.current?.(payload);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('message.event', handleMessage);
    socket.on('conversation.event', handleConversation);

    // If socket is already connected when this mounts
    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('message.event', handleMessage);
      socket.off('conversation.event', handleConversation);
      setIsConnected(false);
    };
  }, [enabled]);

  const unsubscribe = useCallback(() => {
    const socket = getSocket();
    socket.disconnect();
    setIsConnected(false);
  }, []);

  return { isConnected, unsubscribe };
}
