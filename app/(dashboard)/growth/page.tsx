"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  Activity,
  ChartColumn,
  Eye,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Store,
  Users,
} from "lucide-react";
import { ADMIN_GROWTH_ANALYTICS } from "@/graphql/operations";
import { type NamedCount } from "@/graphql/types";
import { formatDate, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DonutChart, type DonutDatum } from "@/components/charts/donut-chart";
import {
  HorizontalBarChart,
  type HorizontalBarDatum,
} from "@/components/charts/horizontal-bar-chart";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

function buildDateSeries(items: Array<{ date: string; count: number }>) {
  return items.map((item) => item.date);
}

function alignSeries(dates: string[], items: Array<{ date: string; count: number }>) {
  const byDate = new Map(items.map((item) => [item.date, item.count]));
  return dates.map((date) => byDate.get(date) ?? 0);
}

function pct(value: number, total: number) {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function rangeLabel(days: number) {
  return days === 7 ? "last 7 days" : days === 30 ? "last 30 days" : `last ${days} days`;
}

function chartColor(index: number) {
  return `var(--chart-${(index % 4) + 1})`;
}

function deviceColor(key: string) {
  switch (key.toLowerCase()) {
    case "mobile":
      return "var(--chart-accent)";
    case "desktop":
      return "var(--chart-good)";
    case "tablet":
      return "var(--chart-violet)";
    default:
      return "var(--chart-neutral)";
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
          <Icon className="size-5" />
        </div>
        <div className="mt-5">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
          <p className="mt-2 text-xs text-muted">{hint}</p>
        </div>
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
  const badgeVariant =
    tone === "success" ? "success" : tone === "warning" ? "warning" : "outline";

  return (
    <Card>
      <CardHeader className="pb-3">
        <Badge variant={badgeVariant} className="w-fit">
          Focus
        </Badge>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-6 text-muted">{body}</p>
      </CardContent>
    </Card>
  );
}

function toBars(items: NamedCount[]) {
  return items.map<HorizontalBarDatum>((item, index) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: chartColor(index),
  }));
}

export default function GrowthPage() {
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);

  const { data, loading, refetch } = useQuery(ADMIN_GROWTH_ANALYTICS, {
    variables: { days },
    fetchPolicy: "cache-and-network",
  });

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await refetch({ days });
    } finally {
      setRefreshing(false);
    }
  }

  const analytics = data?.adminGrowthAnalytics;
  const dates = analytics ? buildDateSeries(analytics.userGrowth) : [];
  const signups = analytics ? alignSeries(dates, analytics.userGrowth) : [];
  const activeUsers = analytics ? alignSeries(dates, analytics.activeUsers) : [];
  const creatorPosts = analytics ? alignSeries(dates, analytics.creatorPosts) : [];
  const conversationStarts = analytics ? alignSeries(dates, analytics.conversationStarts) : [];

  const deviceData: DonutDatum[] = (analytics?.deviceTypes ?? []).map((item) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: deviceColor(item.key),
  }));

  const osBars = toBars(analytics?.operatingSystems ?? []);
  const browserBars = toBars(analytics?.browsers ?? []);
  const funnelBars = (analytics?.funnel ?? []).map<HorizontalBarDatum>((item, index) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: index === 0 ? "var(--chart-accent)" : chartColor(index),
  }));

  const mobileSessions =
    analytics?.deviceTypes.find((item) => item.key.toLowerCase() === "mobile")?.count ?? 0;
  const saveRate = analytics ? pct(analytics.totalSaves, analytics.totalViews) : 0;
  const conversationRate = analytics ? pct(analytics.conversationsStarted, analytics.totalSaves) : 0;
  const repeatRate = analytics ? pct(analytics.repeatActiveUsers, analytics.trackedSessions) : 0;

  const insights = useMemo(() => {
    if (!analytics) return [];

    const items = [
      {
        title: mobileSessions >= analytics.trackedSessions * 0.6 ? "Double down on mobile polish" : "Desktop is still meaningful",
        body:
          mobileSessions >= analytics.trackedSessions * 0.6
            ? `${formatNumber(mobileSessions)} tracked sessions came from phones in the ${rangeLabel(days)}. Prioritize mobile feed speed, media upload smoothness, and creator tools first.`
            : "Your traffic is more mixed than mobile-first. Keep testing both larger-screen workflows and phone ergonomics before over-optimizing one surface.",
        tone: "success" as const,
      },
      {
        title: repeatRate >= 25 ? "Repeat usage is starting to show" : "Retention needs more pull",
        body:
          repeatRate >= 25
            ? `${formatNumber(analytics.repeatActiveUsers)} people were active on at least two days in this window. That is a strong early sign the product has reasons to bring people back.`
            : `Only ${repeatRate.toFixed(1)}% of tracked sessions turned into repeat active users. Focus on better follow-up loops like saved posts, inbox replies, and stronger creator posting cadence.`,
        tone: repeatRate >= 25 ? ("success" as const) : ("warning" as const),
      },
      {
        title:
          analytics.pendingApprovalPosts > analytics.activeCreators
            ? "Moderation is becoming a growth bottleneck"
            : "Supply is moving without major moderation drag",
        body:
          analytics.pendingApprovalPosts > analytics.activeCreators
            ? `${formatNumber(analytics.pendingApprovalPosts)} posts are still waiting approval. If quality is already acceptable, reducing review lag will help sellers stay motivated and keep inventory flowing.`
            : "The current approval backlog is smaller than the active seller base in this window, which means creators are more likely to see momentum after posting.",
        tone:
          analytics.pendingApprovalPosts > analytics.activeCreators
            ? ("warning" as const)
            : ("success" as const),
      },
      {
        title: saveRate >= 8 ? "Content is earning intent, not just views" : "View volume is ahead of intent",
        body:
          saveRate >= 8
            ? `${saveRate.toFixed(1)}% of views became saves in this window. That usually means content feels worth coming back to and is a good base for monetization experiments later.`
            : `Save rate is ${saveRate.toFixed(1)}% right now. That suggests discovery may be working better than purchase intent, so improve hooks, product clarity, and creator quality on top posts.`,
        tone: saveRate >= 8 ? ("success" as const) : ("default" as const),
      },
    ];

    return items;
  }, [analytics, days, mobileSessions, repeatRate, saveRate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-strong">
            Growth
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Know whether the marketplace is actually compounding
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Track repeat usage, seller momentum, device mix, and the funnel from attention to intent so you can see where product-market fit is strengthening or stalling.
          </p>
          {analytics ? (
            <p className="mt-3 text-xs text-muted">
              Window: {formatDate(analytics.from)} to {formatDate(analytics.to)}
            </p>
          ) : null}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:w-auto">
          <Button
            variant="outline"
            onClick={() => void handleRefresh()}
            loading={refreshing}
          >
            {!refreshing && <RefreshCw className="size-4" />}
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <div className="inline-flex w-full rounded-full border border-border bg-elevated p-1 sm:w-auto">
            {RANGE_OPTIONS.map((option) => (
              <Button
                key={option.days}
                variant={days === option.days ? "default" : "ghost"}
                size="sm"
                onClick={() => setDays(option.days)}
                className="flex-1 sm:flex-none"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {loading && !analytics ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-40 w-full" />
          ))}
        </div>
      ) : analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Smartphone}
              label="Tracked sessions"
              value={formatNumber(analytics.trackedSessions)}
              hint={`Authenticated device sessions captured in the ${rangeLabel(days)}.`}
            />
            <StatCard
              icon={Users}
              label="Repeat active users"
              value={formatNumber(analytics.repeatActiveUsers)}
              hint={`${repeatRate.toFixed(1)}% came back on at least two separate days.`}
            />
            <StatCard
              icon={Store}
              label="Active creators"
              value={formatNumber(analytics.activeCreators)}
              hint={`${formatNumber(analytics.creatorCount)} total creators currently exist.`}
            />
            <StatCard
              icon={Activity}
              label="Conversations started"
              value={formatNumber(analytics.conversationsStarted)}
              hint={`${conversationRate.toFixed(1)}% of saves progressed into chat.`}
            />
            <StatCard
              icon={Eye}
              label="Views generated"
              value={formatNumber(analytics.totalViews)}
              hint="Top-of-funnel attention in the selected window."
            />
            <StatCard
              icon={MousePointerClick}
              label="Product clicks"
              value={formatNumber(analytics.totalProductClicks)}
              hint="Higher click-through usually means stronger shopping intent."
            />
            <StatCard
              icon={ChartColumn}
              label="Saves"
              value={formatNumber(analytics.totalSaves)}
              hint={`${saveRate.toFixed(1)}% of views turned into saves.`}
            />
            <StatCard
              icon={RefreshCw}
              label="Pending approvals"
              value={formatNumber(analytics.pendingApprovalPosts)}
              hint="Supply waiting on moderation before it can contribute to growth."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Demand and retention curve</CardTitle>
                <CardDescription>
                  New signups versus daily active users across the {rangeLabel(days)}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  dates={dates}
                  series={[
                    { name: "Signups", color: "var(--chart-accent)", values: signups },
                    { name: "Active users", color: "var(--chart-good)", values: activeUsers },
                  ]}
                  height={280}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device mix</CardTitle>
                <CardDescription>
                  See which device class deserves the most product attention first.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={deviceData}
                  height={280}
                  centerValue={formatNumber(analytics.trackedSessions)}
                  centerHint="tracked sessions"
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Seller posting velocity</CardTitle>
                <CardDescription>
                  Distinct creators posting per day in the {rangeLabel(days)}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  dates={dates}
                  series={[{ name: "Creators posting", color: "var(--chart-violet)", values: creatorPosts }]}
                  kind="bars"
                  height={260}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversation starts</CardTitle>
                <CardDescription>
                  Measure whether marketplace activity is turning into real buyer-seller contact.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  dates={dates}
                  series={[{ name: "Conversations", color: "var(--chart-accent)", values: conversationStarts }]}
                  kind="area"
                  height={260}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Commerce funnel</CardTitle>
                <CardDescription>
                  Follow the drop from awareness into intent and seller contact.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={funnelBars} valueFormatter={formatNumber} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Operating systems</CardTitle>
                <CardDescription>
                  Prioritize QA and polish where the user base is actually showing up.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={osBars} valueFormatter={formatNumber} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Browsers</CardTitle>
                <CardDescription>
                  Useful when debugging upload, playback, or auth issues by surface.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={browserBars} valueFormatter={formatNumber} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {insights.map((insight) => (
              <InsightCard
                key={insight.title}
                title={insight.title}
                body={insight.body}
                tone={insight.tone}
              />
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-sm text-muted">
            Growth analytics are not available yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
