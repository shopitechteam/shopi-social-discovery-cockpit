"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  Bookmark,
  Clock3,
  MapPinned,
  RefreshCw,
  Search,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";
import { ADMIN_LOCATION_ANALYTICS } from "@/graphql/operations";
import type {
  AdminCountyPerformance,
  AdminLocationAnalytics,
} from "@/graphql/types";
import { formatDate, formatNumber, formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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

function chartColor(index: number) {
  return `var(--chart-${(index % 4) + 1})`;
}

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case "active":
      return "var(--chart-good)";
    case "pending_review":
      return "var(--chart-accent)";
    case "processing":
      return "var(--chart-1)";
    case "rejected":
      return "var(--chart-3)";
    case "removed":
      return "var(--chart-neutral)";
    case "failed":
      return "var(--chart-4)";
    default:
      return "var(--chart-2)";
  }
}

function humanize(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function pct(value: number, total: number) {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function toBarData(
  items: AdminCountyPerformance[],
  selector: (item: AdminCountyPerformance) => number,
): HorizontalBarDatum[] {
  return items.map((item, index) => ({
    key: item.countyId,
    label: item.countyName,
    value: selector(item),
    color: chartColor(index),
  }));
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

function CountyCard({ county }: { county: AdminCountyPerformance }) {
  return (
    <div className="rounded-3xl border border-border bg-background p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{county.countyName}</h3>
            <Badge variant={county.activePosts > 0 ? "success" : "outline"}>
              Code {county.countyCode}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {county.topCategory
              ? `Leading category: ${county.topCategory}`
              : "No category concentration yet"}
          </p>
        </div>

        <div className="text-left sm:text-right">
          <p className="text-2xl font-bold tracking-tight text-foreground">
            {formatNumber(county.totalViews)}
          </p>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">views</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Posts</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{formatNumber(county.totalPosts)}</p>
          <p className="text-xs text-muted">
            {formatNumber(county.activePosts)} active • {formatNumber(county.pendingPosts)} pending
          </p>
        </div>
        <div className="rounded-2xl bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Creators</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{formatNumber(county.creatorCount)}</p>
          <p className="text-xs text-muted">
            {formatNumber(county.activeCreatorCount)} with active supply
          </p>
        </div>
        <div className="rounded-2xl bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Saves</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{formatNumber(county.totalSaves)}</p>
          <p className="text-xs text-muted">{county.saveRatePercent}% save rate</p>
        </div>
        <div className="rounded-2xl bg-surface px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">Recent activity</p>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {formatNumber(county.postsInWindow)}
          </p>
          <p className="text-xs text-muted">
            {county.latestPostAt ? `Latest ${formatRelative(county.latestPostAt)}` : "No posts yet"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LocationsPage() {
  const [days, setDays] = useState(30);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const { data, loading, refetch } = useQuery(ADMIN_LOCATION_ANALYTICS, {
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

  const analytics = data?.adminLocationAnalytics;

  const filteredCounties = useMemo(() => {
    const counties = analytics?.countyPerformance ?? [];
    if (!deferredSearch) return counties;

    return counties.filter((county) => {
      const haystack = [
        county.countyName,
        county.countySlug,
        county.topCategory ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(deferredSearch);
    });
  }, [analytics?.countyPerformance, deferredSearch]);

  const statusMix: DonutDatum[] = (analytics?.statusMix ?? [])
    .filter((item) => item.count > 0)
    .map((item) => ({
      key: item.key,
      label: humanize(item.label),
      value: item.count,
      color: statusColor(item.key),
    }));

  const activeCountyLeaders = useMemo(
    () =>
      [...(analytics?.countyPerformance ?? [])]
        .filter((county) => county.activePosts > 0)
        .sort((a, b) => b.activePosts - a.activePosts || b.totalViews - a.totalViews)
        .slice(0, 8),
    [analytics?.countyPerformance],
  );

  const viewCountyLeaders = useMemo(
    () =>
      [...(analytics?.countyPerformance ?? [])]
        .filter((county) => county.totalViews > 0)
        .sort((a, b) => b.totalViews - a.totalViews || b.totalSaves - a.totalSaves)
        .slice(0, 8),
    [analytics?.countyPerformance],
  );

  const strongestCounty = activeCountyLeaders[0];
  const backlogCounty = useMemo(
    () =>
      [...(analytics?.countyPerformance ?? [])]
        .sort((a, b) => b.pendingPosts - a.pendingPosts || b.processingPosts - a.processingPosts)[0],
    [analytics?.countyPerformance],
  );
  const underServedCounty = useMemo(
    () =>
      [...(analytics?.countyPerformance ?? [])]
        .filter((county) => county.totalPosts === 0)
        .sort((a, b) => a.countyCode - b.countyCode)[0],
    [analytics?.countyPerformance],
  );

  const insights = useMemo(() => {
    if (!analytics) return [];

    const saveRate = pct(analytics.totalSaves, analytics.totalViews);

    return [
      strongestCounty
        ? {
            title: `${strongestCounty.countyName} is carrying the strongest visible supply`,
            body: `${formatNumber(strongestCounty.activePosts)} active posts and ${formatNumber(strongestCounty.totalViews)} views are already concentrated there. That is a strong county to feature on landing pages, campaigns, or seller success stories.`,
            tone: "success" as const,
          }
        : null,
      backlogCounty && backlogCounty.pendingPosts > 0
        ? {
            title: `${backlogCounty.countyName} is the clearest moderation bottleneck`,
            body: `${formatNumber(backlogCounty.pendingPosts)} posts are still pending there. Faster approvals in that county should unlock supply sooner and keep creators from stalling after upload.`,
            tone: "warning" as const,
          }
        : {
            title: "Regional moderation backlog looks contained",
            body: "No county is currently carrying a major pending-review pile, which means regional supply is not obviously being blocked by approvals right now.",
            tone: "success" as const,
          },
      underServedCounty
        ? {
            title: `${underServedCounty.countyName} is still a white-space county`,
            body: "There is no visible supply there yet. That makes it a good target for creator acquisition, local partnerships, or a focused onboarding push if you want to expand marketplace coverage.",
            tone: "default" as const,
          }
        : null,
      {
        title: saveRate >= 8 ? "Regional content is earning intent" : "Reach is ahead of intent by county",
        body:
          saveRate >= 8
            ? `${saveRate.toFixed(1)}% of regional views became saves. That is a healthy signal that people are not just browsing, they are bookmarking products worth revisiting.`
            : `Regional save rate is ${saveRate.toFixed(1)}%. Discovery is happening, but the product story inside posts likely needs stronger hooks, clearer pricing, or better creator quality in weaker counties.`,
        tone: saveRate >= 8 ? ("success" as const) : ("default" as const),
      },
    ].filter(Boolean) as Array<{ title: string; body: string; tone: "default" | "success" | "warning" }>;
  }, [analytics, backlogCounty, strongestCounty, underServedCounty]);

  const topCategoryBars = (analytics?.topCategories ?? []).map<HorizontalBarDatum>((item, index) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: chartColor(index),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-strong">
            Locations
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            See exactly which counties are driving supply, reach, and marketplace momentum
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Use this county-level operating map to spot strongholds, weak regions, backlog hotspots, and expansion opportunities before they are obvious elsewhere in the business.
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

      {loading && !analytics ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      ) : analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={MapPinned}
              label="Counties with supply"
              value={formatNumber(analytics.countiesCovered)}
              hint="Counties that already have at least one post in the marketplace."
              tone="success"
            />
            <StatCard
              icon={Store}
              label="Active counties"
              value={formatNumber(analytics.activeCounties)}
              hint="Counties with at least one currently active post."
              tone="success"
            />
            <StatCard
              icon={TrendingUp}
              label="Posts in window"
              value={formatNumber(analytics.postsInWindow)}
              hint="Fresh county-level supply created during the selected range."
            />
            <StatCard
              icon={Users}
              label="Creators represented"
              value={formatNumber(analytics.creatorsRepresented)}
              hint="Distinct sellers already contributing to county-level supply."
            />
            <StatCard
              icon={Bookmark}
              label="Regional saves"
              value={formatNumber(analytics.totalSaves)}
              hint="Total saves earned by county-tagged posts across the marketplace."
            />
            <StatCard
              icon={Clock3}
              label="Pending approval posts"
              value={formatNumber(analytics.pendingApprovalPosts)}
              hint="Backlog still waiting on moderation before going live."
              tone={analytics.pendingApprovalPosts > 0 ? "warning" : "success"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Regional momentum</CardTitle>
                <CardDescription>
                  Track both raw posting activity and how many counties were active each day.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimeSeriesChart
                  dates={analytics.postGrowth.map((item) => item.date)}
                  series={[
                    {
                      name: "Posts created",
                      color: "var(--chart-accent)",
                      values: analytics.postGrowth.map((item) => item.count),
                    },
                    {
                      name: "Counties active",
                      color: "var(--chart-good)",
                      values: analytics.countyActivationByDay.map((item) => item.count),
                    },
                  ]}
                  valueFormatter={(value) => formatNumber(value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content status mix</CardTitle>
                <CardDescription>
                  Spot whether county supply is flowing live or getting stuck in moderation and processing.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statusMix.length > 0 ? (
                  <DonutChart
                    data={statusMix}
                    centerLabel="County posts"
                    centerValue={formatNumber(
                      analytics.statusMix.reduce((sum, item) => sum + item.count, 0),
                    )}
                    centerHint="Across all county-tagged content"
                    valueFormatter={(value) => formatNumber(value)}
                  />
                ) : (
                  <p className="text-sm text-muted">No county-tagged content yet.</p>
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

          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Top counties by active posts</CardTitle>
                <CardDescription>
                  See where visible supply is strongest right now.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeCountyLeaders.length > 0 ? (
                  <HorizontalBarChart
                    data={toBarData(activeCountyLeaders, (county) => county.activePosts)}
                    valueFormatter={(value) => formatNumber(value)}
                  />
                ) : (
                  <p className="text-sm text-muted">No active counties yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top counties by views</CardTitle>
                <CardDescription>
                  Find the regions already earning the most attention.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {viewCountyLeaders.length > 0 ? (
                  <HorizontalBarChart
                    data={toBarData(viewCountyLeaders, (county) => county.totalViews)}
                    valueFormatter={(value) => formatNumber(value)}
                  />
                ) : (
                  <p className="text-sm text-muted">No county view data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category concentration</CardTitle>
                <CardDescription>
                  Understand which product categories dominate county supply.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topCategoryBars.length > 0 ? (
                  <HorizontalBarChart
                    data={topCategoryBars}
                    valueFormatter={(value) => formatNumber(value)}
                  />
                ) : (
                  <p className="text-sm text-muted">No category concentration available yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>County leaderboard</CardTitle>
                <CardDescription>
                  Search any county and inspect its supply health, attention, saves, and creator density.
                </CardDescription>
              </div>
              <div className="relative w-full lg:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search county or category"
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredCounties.length > 0 ? (
                filteredCounties.map((county) => (
                  <CountyCard key={county.countyId} county={county} />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center">
                  <p className="text-sm font-medium text-foreground">No counties matched that search.</p>
                  <p className="mt-2 text-sm text-muted">
                    Try a different county name or clear the category search.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8">
            <p className="text-sm text-muted">Unable to load county analytics right now.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
