"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  BadgeAlert,
  CheckCheck,
  Clock3,
  MessageCircle,
  RefreshCw,
  Reply,
  Search,
  Store,
  Users,
} from "lucide-react";
import {
  ADMIN_CONVERSATION_ANALYTICS,
  ADMIN_CONVERSATIONS,
} from "@/graphql/operations";
import type {
  AdminConversationQueue,
  AdminConversationSummary,
} from "@/graphql/types";
import { displayName, formatDate, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Pagination } from "@/components/shared/pagination";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart, type DonutDatum } from "@/components/charts/donut-chart";
import {
  HorizontalBarChart,
  type HorizontalBarDatum,
} from "@/components/charts/horizontal-bar-chart";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 350;

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

const QUEUES: Array<{
  key: AdminConversationQueue;
  label: string;
  description: string;
}> = [
  {
    key: "REPORTED",
    label: "Reported",
    description: "Trust and safety issues raised by users.",
  },
  {
    key: "SELLER_NEEDS_REPLY",
    label: "Seller owes reply",
    description: "Buyer sent the latest unread message to the seller.",
  },
  {
    key: "BUYER_NEEDS_REPLY",
    label: "Buyer owes reply",
    description: "Seller sent the latest unread message to the buyer.",
  },
  {
    key: "CLOSED_DEALS",
    label: "Closed deals",
    description: "Conversations explicitly marked as successful deals.",
  },
  {
    key: "OPEN_DEALS",
    label: "Open conversations",
    description: "Commerce conversations still active and unresolved.",
  },
  {
    key: "ALL",
    label: "All",
    description: "All conversation threads with at least one message.",
  },
] as const;

function chartColor(index: number) {
  return `var(--chart-${(index % 4) + 1})`;
}

function queueColor(key: string) {
  switch (key) {
    case "reported":
      return "var(--chart-3)";
    case "seller_needs_reply":
      return "var(--chart-accent)";
    case "buyer_needs_reply":
      return "var(--chart-good)";
    case "closed_deals":
      return "var(--chart-1)";
    case "open_deals":
      return "var(--chart-2)";
    default:
      return "var(--chart-4)";
  }
}

function pretty(value?: string | null) {
  if (!value) return "Unknown";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success-soft text-success"
      : tone === "warning"
        ? "bg-warning-soft text-secondary-strong"
        : "bg-primary-soft text-primary-strong";

  return (
    <Card>
      <CardContent className="p-5">
        <div className={`flex size-11 items-center justify-center rounded-2xl ${toneClass}`}>
          <Icon className="size-5" />
        </div>
        <p className="mt-5 text-sm text-muted">{label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-2 text-xs text-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}

function InsightCard({
  title,
  body,
  tone = "default",
}: {
  title: string;
  body: string;
  tone?: "default" | "success" | "warning";
}) {
  const variant = tone === "success" ? "success" : tone === "warning" ? "warning" : "outline";

  return (
    <Card>
      <CardHeader className="pb-3">
        <Badge variant={variant} className="w-fit">
          Insight
        </Badge>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted">{body}</p>
      </CardContent>
    </Card>
  );
}

function ConversationCard({ item }: { item: AdminConversationSummary }) {
  const sellerName = displayName(item.seller);
  const buyerName = displayName(item.buyer);
  const contentTitle = item.content?.title || item.content?.caption || "Untitled listing";

  return (
    <div className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{contentTitle}</h3>
            {item.isReported ? <Badge variant="destructive">Reported</Badge> : null}
            {item.dealClosed ? <Badge variant="success">Deal closed</Badge> : null}
            {item.needsSellerReply ? <Badge variant="warning">Seller owes reply</Badge> : null}
            {item.needsBuyerReply ? <Badge variant="accent">Buyer owes reply</Badge> : null}
          </div>
          <p className="mt-2 text-sm text-muted">
            Seller: {sellerName} • Buyer: {buyerName}
          </p>
        </div>

        <div className="text-left lg:text-right">
          <p className="text-sm font-semibold text-foreground">
            {formatNumber(item.conversation.messageCount)} messages
          </p>
          <p className="text-xs text-muted">
            {item.conversation.lastMessageAt
              ? `Last activity ${formatRelative(item.conversation.lastMessageAt)}`
              : "No recent activity"}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Participants</p>
          <div className="mt-2 flex items-center gap-2">
            <Avatar src={item.seller?.profile?.avatar} name={sellerName} />
            <Avatar src={item.buyer?.profile?.avatar} name={buyerName} />
          </div>
          <p className="mt-2 text-xs text-muted">Seller and buyer involved in this thread.</p>
        </div>
        <div className="rounded-2xl bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Unread pressure</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatNumber(item.conversation.sellerUnreadCount + item.conversation.buyerUnreadCount)}
          </p>
          <p className="text-xs text-muted">
            Seller unread {formatNumber(item.conversation.sellerUnreadCount)} • Buyer unread {formatNumber(item.conversation.buyerUnreadCount)}
          </p>
        </div>
        <div className="rounded-2xl bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Latest message</p>
          <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">
            {item.conversation.lastMessageText || pretty(item.conversation.lastMessageType)}
          </p>
          <p className="text-xs text-muted">
            {item.conversation.lastMessageAt
              ? formatDate(item.conversation.lastMessageAt)
              : "No timestamp"}
          </p>
        </div>
        <div className="rounded-2xl bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Report state</p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {item.isReported ? pretty(item.reportReason) : "No report"}
          </p>
          <p className="text-xs text-muted">
            {item.isReported
              ? `${formatNumber(item.reportCount)} report${item.reportCount === 1 ? "" : "s"}${item.reportedAt ? ` • latest ${formatRelative(item.reportedAt)}` : ""}`
              : "Clean conversation so far"}
          </p>
        </div>
      </div>

      {item.reportDetails ? (
        <div className="mt-4 rounded-2xl border border-border bg-elevated px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Report details</p>
          <p className="mt-2 text-sm text-foreground">{item.reportDetails}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function ConversationsPage() {
  const [days, setDays] = useState(30);
  const [queue, setQueue] = useState<AdminConversationQueue>("REPORTED");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: analyticsData, loading: analyticsLoading, refetch: refetchAnalytics } = useQuery(
    ADMIN_CONVERSATION_ANALYTICS,
    {
      variables: { days },
      fetchPolicy: "cache-and-network",
    },
  );

  const { data, loading, refetch } = useQuery(ADMIN_CONVERSATIONS, {
    variables: {
      page,
      limit: PAGE_SIZE,
      queue,
      search: submittedSearch || null,
    },
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    const nextSearch = search.trim();
    const handle = window.setTimeout(() => {
      setSubmittedSearch((current) => {
        if (current === nextSearch) return current;
        setPage(1);
        return nextSearch;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [search]);

  const analytics = analyticsData?.adminConversationAnalytics;
  const items = data?.adminConversations.data ?? [];
  const meta = data?.adminConversations.meta;
  const activeQueue = QUEUES.find((item) => item.key === queue) ?? QUEUES[0];

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        refetch({
          page,
          limit: PAGE_SIZE,
          queue,
          search: submittedSearch || null,
        }),
        refetchAnalytics({ days }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const queueMix: DonutDatum[] = (analytics?.queueMix ?? [])
    .filter((item) => item.count > 0)
    .map((item) => ({
      key: item.key,
      label: item.label,
      value: item.count,
      color: queueColor(item.key),
    }));

  const reportReasonBars = (analytics?.reportReasons ?? []).map<HorizontalBarDatum>((item, index) => ({
    key: item.key,
    label: pretty(item.label),
    value: item.count,
    color: chartColor(index),
  }));

  const topSellerBars = (analytics?.topSellers ?? []).map<HorizontalBarDatum>((item, index) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: chartColor(index),
  }));

  const insights = useMemo(() => {
    if (!analytics) return [];

    const replyGap =
      analytics.sellerNeedsReply > analytics.buyerNeedsReply
        ? {
            title: "Seller responsiveness needs the closest watch",
            body: `${formatNumber(analytics.sellerNeedsReply)} threads currently need a seller reply, which is more than the buyer-side wait queue. That means supply-side follow-through is the bigger commercial risk right now.`,
            tone: "warning" as const,
          }
        : {
            title: "Buyers are the side most likely to stall",
            body: `${formatNumber(analytics.buyerNeedsReply)} threads currently need a buyer reply. That suggests discovery may be working, but some conversations are cooling before they convert.`,
            tone: "default" as const,
          };

    const reportPressure =
      analytics.reportedConversations > 0
        ? {
            title: "Reported conversations need active triage",
            body: `${formatNumber(analytics.reportedConversations)} conversation threads have been reported. This queue should stay small so trust issues do not linger in your core commerce channel.`,
            tone: "warning" as const,
          }
        : {
            title: "Trust pressure in conversations is low right now",
            body: "There are currently no reported direct-message threads in the admin queue, which is a good signal that the commerce channel is not under obvious abuse pressure.",
            tone: "success" as const,
          };

    const dealSignal =
      analytics.closedDeals > 0
        ? {
            title: "Closed deals are showing real commerce happening",
            body: `${formatNumber(analytics.closedDeals)} conversations were marked as closed deals in this window. Even at small volume, that is one of the clearest proof points that the marketplace is translating into transactions.`,
            tone: "success" as const,
          }
        : {
            title: "Conversation volume has not translated into closed deals yet",
            body: "People are talking, but there is not yet enough explicit deal closure in the selected window. That makes reply speed, listing quality, and trust signals the areas to tighten first.",
            tone: "default" as const,
          };

    return [replyGap, reportPressure, dealSignal];
  }, [analytics]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-strong">
            Conversations
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Watch where buyer intent is growing, stalling, or becoming risky
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Direct messages are where listing interest turns into real commerce. This workspace helps you monitor reply pressure, closed deals, abuse reports, and which sellers are driving the heaviest conversation volume.
          </p>
          {analytics ? (
            <p className="mt-3 text-xs text-muted">
              Window: {formatDate(analytics.from)} to {formatDate(analytics.to)}
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
          <Button variant="outline" onClick={() => void handleRefresh()} loading={refreshing}>
            {!refreshing && <RefreshCw className="size-4" />}
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <div className="inline-flex w-full rounded-full border border-border bg-elevated p-1 sm:w-auto">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.days}
                variant={days === option.days ? "default" : "ghost"}
                className="rounded-full"
                onClick={() => setDays(option.days)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {analyticsLoading && !analytics ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      ) : analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={MessageCircle}
              label="Total conversations"
              value={formatNumber(analytics.totalConversations)}
              hint="Threads with at least one message across the marketplace."
            />
            <StatCard
              icon={Users}
              label="Started in window"
              value={formatNumber(analytics.startedInWindow)}
              hint="Fresh conversation demand created in the selected range."
            />
            <StatCard
              icon={CheckCheck}
              label="Closed deals"
              value={formatNumber(analytics.closedDeals)}
              hint="Conversations marked as successful deals."
              tone={analytics.closedDeals > 0 ? "success" : "default"}
            />
            <StatCard
              icon={BadgeAlert}
              label="Reported conversations"
              value={formatNumber(analytics.reportedConversations)}
              hint="Threads that need trust-and-safety attention."
              tone={analytics.reportedConversations > 0 ? "warning" : "success"}
            />
            <StatCard
              icon={Store}
              label="Seller needs reply"
              value={formatNumber(analytics.sellerNeedsReply)}
              hint="Threads where the buyer has the latest unread message."
              tone={analytics.sellerNeedsReply > 0 ? "warning" : "success"}
            />
            <StatCard
              icon={Reply}
              label="Seller replied in 1 hour"
              value={`${analytics.sellerReplyRate1hPercent}%`}
              hint={`${analytics.sellerReplyRate24hPercent}% replied within 24 hours.`}
              tone={analytics.sellerReplyRate1hPercent >= 70 ? "success" : "warning"}
            />
            <StatCard
              icon={Clock3}
              label="Median seller first reply"
              value={
                analytics.medianSellerFirstResponseMinutes > 0
                  ? `${formatNumber(analytics.medianSellerFirstResponseMinutes)} min`
                  : "N/A"
              }
              hint={`${formatNumber(analytics.staleConversations)} conversations are currently stale.`}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Conversation flow</CardTitle>
                <CardDescription>
                  Compare new thread creation with closed-deal confirmations over time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  dates={analytics.conversationStarts.map((item) => item.date)}
                  series={[
                    {
                      name: "Conversations started",
                      color: "var(--chart-accent)",
                      values: analytics.conversationStarts.map((item) => item.count),
                    },
                    {
                      name: "Deals closed",
                      color: "var(--chart-good)",
                      values: analytics.dealsClosedByDay.map((item) => item.count),
                    },
                  ]}
                  valueFormatter={(value) => formatNumber(value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Queue mix</CardTitle>
                <CardDescription>
                  See whether the admin pressure is mostly commercial follow-up or trust and safety.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {queueMix.length > 0 ? (
                  <DonutChart
                    data={queueMix}
                    centerLabel="Admin queues"
                    centerValue={formatNumber(queueMix.reduce((sum, item) => sum + item.value, 0))}
                    centerHint="Conversation operational load"
                    valueFormatter={(value) => formatNumber(value)}
                  />
                ) : (
                  <p className="text-sm text-muted">No conversation queue signals yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {insights.map((insight) => (
              <InsightCard
                key={insight.title}
                title={insight.title}
                body={insight.body}
                tone={insight.tone}
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Report reasons</CardTitle>
                <CardDescription>
                  Understand the main causes of trust-and-safety pressure in direct messages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportReasonBars.length > 0 ? (
                  <HorizontalBarChart
                    data={reportReasonBars}
                    valueFormatter={(value) => formatNumber(value)}
                  />
                ) : (
                  <p className="text-sm text-muted">No reported conversation reasons in this window.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top sellers by conversation volume</CardTitle>
                <CardDescription>
                  See which sellers are generating the most buyer contact right now.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topSellerBars.length > 0 ? (
                  <HorizontalBarChart
                    data={topSellerBars}
                    valueFormatter={(value) => formatNumber(value)}
                  />
                ) : (
                  <p className="text-sm text-muted">No seller conversation leaders in this window.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>Conversation queues</CardTitle>
                <CardDescription>
                  {activeQueue.description} Search works across participants, listing titles, message preview, and conversation id.
                </CardDescription>
              </div>
              <div className="relative w-full lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search seller, buyer, listing, or message"
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap gap-1.5">
                {QUEUES.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setQueue(item.key);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                      queue === item.key
                        ? "bg-primary text-on-brand"
                        : "bg-subtle text-muted hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {loading && items.length === 0 ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-44 w-full" />
                  ))}
                </div>
              ) : items.length > 0 ? (
                <div className="space-y-4">
                  {items.map((item) => (
                    <ConversationCard key={item.conversation.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
                  <p className="text-sm font-medium text-foreground">
                    {submittedSearch
                      ? "No conversations matched that search."
                      : "This conversation queue is currently empty."}
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {submittedSearch
                      ? "Try a different participant, listing, or message search."
                      : "Once activity reaches this queue, it will appear here automatically."}
                  </p>
                </div>
              )}

              {meta ? <Pagination meta={meta} onPageChange={setPage} /> : null}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8">
            <p className="text-sm text-muted">Unable to load conversation analytics right now.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
