"use client";

import { useEffect } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import {
  ADMIN_TEAM_BROADCASTS,
  ADMIN_TEAM_THREADS,
  ADMIN_TEAM_THREAD_MESSAGES,
  ADMIN_TEAM_UNREAD_THREADS,
} from "@/graphql/operations";
import { WS_EVENTS, type TeamThreadUpdatedPayload } from "@/lib/socket/socket-events";
import { useSocket } from "@/hooks/useSocket";

/**
 * Threads with unread member replies, for the "Shopi team" nav badge. Fetched
 * once, then kept current by <TeamInboxSync /> writing socket pushes into the
 * cache — so no polling.
 */
export function useTeamUnreadThreads(): number {
  const { data } = useQuery(ADMIN_TEAM_UNREAD_THREADS, { fetchPolicy: "cache-first" });
  return data?.adminTeamUnreadThreads ?? 0;
}

/**
 * Keeps the Shopi team inbox live across the whole dashboard. Mounted once in
 * the dashboard layout. The team page refetches its own lists on the same
 * event; this only owns the badge count and catch-up after a dropped socket.
 */
export function TeamInboxSync() {
  const client = useApolloClient();
  const { on, onReconnect } = useSocket();

  useEffect(
    () =>
      on<TeamThreadUpdatedPayload>(WS_EVENTS.TEAM_THREAD_UPDATED, ({ unreadThreads }) => {
        client.writeQuery({
          query: ADMIN_TEAM_UNREAD_THREADS,
          data: { adminTeamUnreadThreads: unreadThreads },
        });
      }),
    [on, client],
  );

  // Pushes sent while the socket was down are gone; refresh whatever team
  // data is on screen (only active queries are refetched).
  useEffect(
    () =>
      onReconnect(() => {
        void client.refetchQueries({
          include: [
            ADMIN_TEAM_UNREAD_THREADS,
            ADMIN_TEAM_THREADS,
            ADMIN_TEAM_THREAD_MESSAGES,
            ADMIN_TEAM_BROADCASTS,
          ],
        });
      }),
    [onReconnect, client],
  );

  return null;
}
