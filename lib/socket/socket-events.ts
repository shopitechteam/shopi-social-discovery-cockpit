/**
 * Mirror of the backend event constants — keep in sync with
 * src/services/websocket/socket-events.ts on the API.
 *
 * Only copy what the admin needs; don't import server-only code.
 */

export const WS_EVENTS = {
  TEAM_THREAD_UPDATED: "team:thread:updated",
} as const;

/** The Shopi team inbox changed. Carries no message content — refetch what's shown. */
export interface TeamThreadUpdatedPayload {
  /** `read` = the team read a member's replies; `member_read` = the member read the team's. */
  reason: "member_reply" | "member_read" | "team_reply" | "read" | "broadcast";
  /** The member whose thread changed; absent for a broadcast (many threads). */
  userId?: string;
  /** Threads holding member replies the team hasn't read. */
  unreadThreads: number;
}
