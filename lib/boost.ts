import type { BoostState } from "@/graphql/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How long the campaign was bought for, derived from its own window rather than
 * the package default — an admin can override the duration at purchase, and the
 * post carries the dates, not the number of days.
 */
export function boostDurationDays(boost?: BoostState | null): number | null {
  if (!boost?.startsAt || !boost.expiresAt) return null;
  const days = Math.round(
    (new Date(boost.expiresAt).getTime() - new Date(boost.startsAt).getTime()) / DAY_MS,
  );
  return days > 0 ? days : null;
}

/** Whole days left before the campaign expires; 0 once it has run out. */
export function boostDaysRemaining(boost?: BoostState | null, now = Date.now()): number | null {
  if (!boost?.expiresAt) return null;
  const remaining = new Date(boost.expiresAt).getTime() - now;
  return remaining > 0 ? Math.ceil(remaining / DAY_MS) : 0;
}

/** "3 of 14 days left" — the whole campaign state in one line. */
export function boostRunLabel(boost?: BoostState | null): string | null {
  const remaining = boostDaysRemaining(boost);
  if (remaining === null) return null;
  const total = boostDurationDays(boost);
  if (remaining === 0) return "expiring";
  const left = remaining === 1 ? "1 day left" : `${remaining} days left`;
  return total ? `${left} of ${total}` : left;
}
