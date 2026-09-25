"use client";

/**
 * useSocket — subscribe to realtime events from the API. Same shape as the main
 * web app's hook; the admin has no first-paint budget to protect, so the client
 * is imported directly instead of lazily.
 *
 * Usage:
 *   const { on } = useSocket();
 *   useEffect(() => on(WS_EVENTS.TEAM_THREAD_UPDATED, handler), [on]);
 */

import { useCallback } from "react";
import { connectSocket, getSocket } from "@/lib/socket/socket-client";

export function useSocket() {
  /**
   * Subscribe to a WebSocket event, connecting the socket if needed.
   * Returns an unsubscribe function — pass directly to useEffect's cleanup.
   */
  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void) => {
    const socket = getSocket();
    socket.on(event, handler);
    connectSocket();
    return () => {
      socket.off(event, handler);
    };
  }, []);

  /**
   * Run `handler` each time the socket comes back after a drop (not on the
   * first connect). Events sent while it was down are lost, so refetch here.
   */
  const onReconnect = useCallback((handler: () => void) => {
    const socket = getSocket();
    let connectedBefore = socket.connected;
    const onConnect = () => {
      if (connectedBefore) handler();
      connectedBefore = true;
    };
    socket.on("connect", onConnect);
    connectSocket();
    return () => {
      socket.off("connect", onConnect);
    };
  }, []);

  return { on, onReconnect };
}
