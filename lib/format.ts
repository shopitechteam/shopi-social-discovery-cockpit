import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function formatDate(value: string | Date | undefined | null): string {
  if (!value) return "—";
  return dayjs(value).format("DD MMM YYYY, HH:mm");
}

export function formatRelative(value: string | Date | undefined | null): string {
  if (!value) return "—";
  return dayjs(value).fromNow();
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export function formatPrice(price?: { amount: number; currency: string } | null): string {
  if (!price) return "—";
  return `${price.currency} ${price.amount.toLocaleString()}`;
}

export function displayName(user?: {
  profile?: { firstName?: string | null; lastName?: string | null } | null;
  username?: string | null;
  email?: string | null;
} | null): string {
  if (!user) return "Unknown";
  const name = [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ");
  return name || user.username || user.email || "Unknown";
}
