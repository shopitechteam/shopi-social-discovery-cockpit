"use client";

import { useQuery } from "@apollo/client/react";
import { ADMIN_PENDING_REVIEW_COUNT } from "@/graphql/operations";

/** How often the Posts badge rechecks for newly submitted posts. */
const POLL_MS = 60_000;

/**
 * Posts waiting for approval, for the Posts nav badge and the Pending tab.
 * Reads the cache that <PendingReviewSync /> keeps fresh, so the sidebar,
 * mobile nav and posts page share one poll.
 */
export function usePendingReviewCount(): number {
  const { data } = useQuery(ADMIN_PENDING_REVIEW_COUNT, { fetchPolicy: "cache-first" });
  return data?.adminPendingReviewCount ?? 0;
}

/**
 * Keeps the pending-review count current across the dashboard. Mounted once in
 * the dashboard layout. Unlike the team inbox there is no socket push when a
 * seller submits a post, so this polls — skipped while the tab is hidden.
 * Moderation actions refetch "AdminPendingReviewCount" by name, so approving
 * or rejecting updates the badge straight away.
 */
export function PendingReviewSync() {
  useQuery(ADMIN_PENDING_REVIEW_COUNT, {
    pollInterval: POLL_MS,
    skipPollAttempt: () => document.hidden,
  });
  return null;
}
