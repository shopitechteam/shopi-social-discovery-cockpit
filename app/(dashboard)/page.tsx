"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  ArrowRight,
  ChartColumn,
  Clock,
  Eye,
  Flag,
  MapPinned,
  Mail,
  RefreshCw,
  Shapes,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import {
  ADMIN_ANALYTICS,
  ADMIN_DASHBOARD_STATS,
  PENDING_APPROVAL_CONTENT,
} from "@/graphql/operations";
import { formatNumber, formatRelative, displayName, formatPrice } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { DonutChart, type DonutDatum } from "@/components/charts/donut-chart";
import {
  HorizontalBarChart,
  type HorizontalBarDatum,
} from "@/components/charts/horizontal-bar-chart";
import type { TopCreatorStat } from "@/graphql/types";

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

function pctChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatPct(value: number) {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}

function rangeLabel(days: number) {
  return days === 7 ? "last 7 days" : days === 30 ? "last 30 days" : `last ${days} days`;
}

function creatorSearchValue(creator: TopCreatorStat) {
  return creator.email || creator.username || creator.creatorId;
}

function buildDateSeries(items: Array<{ date: string; count: number }>) {
  return items.map((item) => item.date);
}

function alignSeries(
  dates: string[],
  items: Array<{ date: string; count: number }>,
) {
  const byDate = new Map(items.map((item) => [item.date, item.count]));
  return dates.map((date) => byDate.get(date) ?? 0);
}

function statusColor(key: string) {
  switch (key.trim().toUpperCase()) {
    case "ACTIVE":
    case "LIVE":
      return "var(--chart-good)";
    case "PENDING_REVIEW":
      return "var(--chart-warning)";
    case "PROCESSING":
      return "var(--chart-violet)";
    case "UNDER_REVIEW":
      return "var(--chart-neutral)";
    case "REJECTED":
      return "var(--chart-serious)";
    case "REMOVED":
    case "FAILED":
      return "var(--chart-critical)";
    default:
      return "var(--chart-neutral)";
  }
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  delta,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  delta?: string;
  tone?: "default" | "warning" | "success" | "danger";
}) {
  const iconTone = {
    default: "bg-primary-soft text-primary-strong",
    warning: "bg-warning-soft text-secondary-strong",
    success: "bg-success-soft text-success",
    danger: "bg-error-soft text-error",
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}>
            <Icon className="size-5" />
          </div>
          {delta && <Badge variant="outline">{delta}</Badge>}
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

export default function OverviewPage() {
  const [days, setDays] = useState<number>(30);
  const [refreshing, setRefreshing] = useState(false);

  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useQuery(ADMIN_DASHBOARD_STATS);
  const { data: analyticsData, loading: analyticsLoading, refetch: refetchAnalytics } = useQuery(ADMIN_ANALYTICS, {
    variables: { days },
  });
  const { data: pendingData, loading: pendingLoading, refetch: refetchPending } = useQuery(PENDING_APPROVAL_CONTENT, {
    variables: { limit: 5, offset: 0 },
  });

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchStats(),
        refetchAnalytics({ days }),
        refetchPending({ limit: 5, offset: 0 }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const stats = statsData?.adminDashboardStats;
  const analytics = analyticsData?.adminAnalytics;
  const pending = pendingData?.pendingApprovalContent ?? [];

  const growthDates = analytics ? buildDateSeries(analytics.userGrowth) : [];
  const userGrowthValues = analytics ? alignSeries(growthDates, analytics.userGrowth) : [];
  const postGrowthValues = analytics ? alignSeries(growthDates, analytics.postGrowth) : [];
  const activeUserValues = analytics ? alignSeries(growthDates, analytics.activeUsers) : [];
  const viewsByDay = analytics
    ? growthDates.map((date) => analytics.engagementByDay.find((item) => item.date === date)?.views ?? 0)
    : [];
  const savesByDay = analytics
    ? growthDates.map((date) => analytics.engagementByDay.find((item) => item.date === date)?.saves ?? 0)
    : [];

  const contentStatusData: DonutDatum[] = (analytics?.contentByStatus ?? []).map((item) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: statusColor(item.key),
  }));

  const topCategories: HorizontalBarDatum[] = (analytics?.topCategories ?? []).slice(0, 6).map((item, index) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: `var(--chart-${(index % 4) + 1})`,
  }));

  const topCounties: HorizontalBarDatum[] = (analytics?.topCounties ?? []).slice(0, 6).map((item, index) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: index % 2 === 0 ? "var(--chart-accent)" : "var(--chart-violet)",
  }));
  const topCreators = analytics?.topCreators ?? [];

  const totalUsersDelta = stats && analytics
    ? formatPct(pctChange(stats.totalUsers, analytics.usersBefore))
    : undefined;
  const totalPostsDelta = stats && analytics
    ? formatPct(pctChange(stats.totalContent, analytics.postsBefore))
    : undefined;

  const activeUsersTotal = activeUserValues.reduce((sum, value) => sum + value, 0);
  const engagementTotal = analytics
    ? analytics.engagementByDay.reduce(
        (sum, item) => sum + item.views + item.likes + item.comments + item.shares + item.saves,
        0,
      )
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-strong">
            Overview
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Platform health at a glance
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Track growth, moderation pressure, and where supply is concentrating across the marketplace.
          </p>
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

      {statsLoading && !stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total users"
            value={formatNumber(stats.totalUsers)}
            hint={`${formatNumber(stats.adminCount)} admins · ${formatNumber(stats.suspendedUsers)} suspended`}
            delta={totalUsersDelta}
          />
          <StatCard
            icon={ChartColumn}
            label="Total posts"
            value={formatNumber(stats.totalContent)}
            hint={`${formatNumber(stats.activeContent)} live · ${formatNumber(stats.processingContent)} processing`}
            delta={totalPostsDelta}
            tone="success"
          />
          <StatCard
            icon={Clock}
            label="Pending review"
            value={formatNumber(stats.pendingReviewContent)}
            hint={`${formatNumber(stats.reportedContent)} reported · ${formatNumber(stats.underReviewContent)} hidden`}
            tone={stats.pendingReviewContent > 0 ? "warning" : "success"}
          />
          <StatCard
            icon={Eye}
            label={`Engagement in ${rangeLabel(days)}`}
            value={formatNumber(engagementTotal)}
            hint={`${formatNumber(stats.totalViews)} lifetime views`}
          />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Growth trends</CardTitle>
            <CardDescription>
              New users and posts created across the {rangeLabel(days)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading && !analytics ? (
              <Skeleton className="h-[280px] w-full" />
            ) : analytics ? (
              <TimeSeriesChart
                dates={growthDates}
                series={[
                  { name: "Users", color: "var(--chart-1)", values: userGrowthValues },
                  { name: "Posts", color: "var(--chart-accent)", values: postGrowthValues },
                ]}
                height={280}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Content status mix</CardTitle>
            <CardDescription>
              Current distribution of content across moderation and live states.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading && !analytics ? (
              <Skeleton className="h-[280px] w-full" />
            ) : contentStatusData.length > 0 ? (
              <DonutChart
                data={contentStatusData}
                height={280}
                centerLabel="Tracked posts"
                centerValue={formatNumber(contentStatusData.reduce((sum, item) => sum + item.value, 0))}
                valueFormatter={formatNumber}
              />
            ) : (
              <p className="py-12 text-center text-sm text-muted">No status data available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Engagement trend</CardTitle>
            <CardDescription>
              Views and saves captured per day in the selected range.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading && !analytics ? (
              <Skeleton className="h-[260px] w-full" />
            ) : analytics ? (
              <TimeSeriesChart
                dates={growthDates}
                series={[
                  { name: "Views", color: "var(--chart-1)", values: viewsByDay },
                  { name: "Saves", color: "var(--chart-3)", values: savesByDay },
                ]}
                height={260}
                kind="line"
                valueFormatter={formatNumber}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Active users</CardTitle>
                <CardDescription>
                  Daily active-user signal over the {rangeLabel(days)}.
                </CardDescription>
              </div>
              <Badge variant="outline">{formatNumber(activeUsersTotal)} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading && !analytics ? (
              <Skeleton className="h-[260px] w-full" />
            ) : analytics ? (
              <TimeSeriesChart
                dates={growthDates}
                series={[{ name: "Active users", color: "var(--chart-2)", values: activeUserValues }]}
                height={260}
                kind="bars"
                valueFormatter={formatNumber}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-primary-soft p-2 text-primary-strong">
                <Shapes className="size-5" />
              </div>
              <div>
                <CardTitle>Top categories</CardTitle>
                <CardDescription>
                  Categories attracting the most new posts in the selected range.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading && !analytics ? (
              <Skeleton className="h-[220px] w-full" />
            ) : topCategories.length > 0 ? (
              <HorizontalBarChart data={topCategories} valueFormatter={formatNumber} />
            ) : (
              <p className="py-10 text-center text-sm text-muted">No category activity yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-accent-soft p-2 text-accent">
                <MapPinned className="size-5" />
              </div>
              <div>
                <CardTitle>Top counties</CardTitle>
                <CardDescription>
                  Counties with the heaviest posting volume in the selected range.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {analyticsLoading && !analytics ? (
              <Skeleton className="h-[220px] w-full" />
            ) : topCounties.length > 0 ? (
              <HorizontalBarChart data={topCounties} valueFormatter={formatNumber} />
            ) : (
              <p className="py-10 text-center text-sm text-muted">No county activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-warning-soft p-2 text-secondary-strong">
                <Trophy className="size-5" />
              </div>
              <div>
                <CardTitle>Top sellers to feature</CardTitle>
                <CardDescription>
                  The top 5 creators ranked by saves first, then views, across live public posts.
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline">
              <Sparkles className="size-3.5" />
              good for homepage promos
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {analyticsLoading && !analytics ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-36 w-full" />
              ))}
            </div>
          ) : topCreators.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {topCreators.map((creator, index) => (
                <div
                  key={creator.creatorId}
                  className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-brand">
                        #{index + 1}
                      </div>
                      <Avatar
                        src={creator.profile?.avatar}
                        name={displayName({
                          profile: creator.profile,
                          username: creator.username,
                          email: creator.email,
                        })}
                        className="size-11"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {displayName({
                            profile: creator.profile,
                            username: creator.username,
                            email: creator.email,
                          })}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {creator.email ?? (creator.username ? `@${creator.username}` : creator.creatorId)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-elevated px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Saves</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatNumber(creator.totalSaves)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-elevated px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Views</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatNumber(creator.totalViews)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-elevated px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">Posts</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatNumber(creator.postCount)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-elevated px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted">All engagement</p>
                      <p className="mt-1 text-lg font-semibold text-foreground">
                        {formatNumber(creator.totalEngagement)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/users?search=${encodeURIComponent(creatorSearchValue(creator))}`}>
                        Check user
                      </Link>
                    </Button>
                    {creator.email && (
                      <Button asChild variant="ghost" size="sm">
                        <a href={`mailto:${creator.email}`}>
                          <Mail />
                          Contact
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted">
              No featured sellers available yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Approval queue</CardTitle>
            <CardDescription>The most recent posts waiting for human review.</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/posts">
              Review all
              <ArrowRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-1">
          {pendingLoading && pending.length === 0 ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nothing waiting for approval right now.
            </p>
          ) : (
            pending.map((post) => (
              <Link
                key={post.id}
                href="/posts"
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-subtle"
              >
                <Avatar
                  src={post.creator?.profile?.avatar}
                  name={displayName(post.creator)}
                  className="size-9"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{post.title}</p>
                  <p className="truncate text-xs text-muted">
                    {displayName(post.creator)} · {formatPrice(post.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning">{formatRelative(post.createdAt)}</Badge>
                  {post.moderation.isReported && (
                    <Badge variant="destructive">
                      <Flag className="size-3" />
                      {post.moderation.reportCount}
                    </Badge>
                  )}
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
