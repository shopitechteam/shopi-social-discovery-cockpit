"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Eye,
  Minus,
  MousePointerClick,
  RefreshCw,
  Smartphone,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import { ADMIN_GROWTH_ANALYTICS, ADMIN_GROWTH_PULSE } from "@/graphql/operations";
import type { GrowthComparison, GrowthDirection, NamedCount } from "@/graphql/types";
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

const MONTHS_BACK = 12;

/**
 * Series colours are categorical slots 1 and 2 in fixed order — signups always
 * blue, posts always green, on every chart on this page. Both pass the palette
 * checks against the light and dark chart surfaces, including the colour-vision
 * separation floor.
 */
const SIGNUP_COLOR = "var(--chart-1)";
const POST_COLOR = "var(--chart-2)";
const SELLER_COLOR = "var(--chart-3)";

function rangeLabel(days: number) {
  return days === 7 ? "last 7 days" : days === 30 ? "last 30 days" : `last ${days} days`;
}

function pct(value: number, total: number) {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

/** "+34.2%" · "-8%" · "0%" */
function formatChange(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

/**
 * Rolling mean over the trailing `window` buckets.
 *
 * At a few signups a day the raw series is mostly noise — one busy Saturday
 * looks like a trend. The average is what a direction should be read off, so it
 * is offered as a toggle on the daily chart and is the default.
 */
function rollingAverage(values: number[], window = 7): number[] {
  return values.map((_, index) => {
    const slice = values.slice(Math.max(0, index - window + 1), index + 1);
    const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    return Math.round(mean * 10) / 10;
  });
}

const DIRECTION_TONE: Record<GrowthDirection, "success" | "warning" | "destructive"> = {
  UP: "success",
  FLAT: "warning",
  DOWN: "destructive",
};

const DIRECTION_ICON: Record<GrowthDirection, React.ComponentType<{ className?: string }>> = {
  UP: ArrowUpRight,
  FLAT: Minus,
  DOWN: ArrowDownRight,
};

/**
 * The headline read of the page.
 *
 * A marketplace has two sides and they fail differently, so one combined
 * sentence beats two separate percentages. Demand growing while supply stays
 * flat is the failure worth naming out loud, because on a signups chart alone
 * it looks like success.
 */
function verdict(signups?: GrowthComparison, posts?: GrowthComparison) {
  if (!signups || !posts) return null;

  const up = (c: GrowthComparison) => c.direction === "UP";
  const down = (c: GrowthComparison) => c.direction === "DOWN";

  if (up(signups) && up(posts)) {
    return {
      tone: "success" as const,
      title: "Both sides are growing",
      body: "Signups and posts are each up more than 20% on the previous window. This is what compounding looks like. Keep doing whatever changed, and watch that activation does not slide as volume rises.",
    };
  }
  if (down(signups) && down(posts)) {
    return {
      tone: "destructive" as const,
      title: "The marketplace is shrinking",
      body: "Signups and posts are both below the previous window. Treat this as the only thing that matters this week. Check whether acquisition dried up, whether the post flow broke, and what shipped recently that could have caused it.",
    };
  }
  if (up(signups) && !up(posts)) {
    return {
      tone: "warning" as const,
      title: "People are joining but not posting",
      body: "Signups are up while posts are not. New accounts arrive and stop before they publish, so the work is in the post flow and the first-listing experience, not in more traffic.",
    };
  }
  if (up(posts) && !up(signups)) {
    return {
      tone: "warning" as const,
      title: "Existing sellers are carrying supply",
      body: "Posts are up while signups are not. The sellers you already have are doing the work. That is healthy retention on a thin top of funnel, so the constraint is acquisition.",
    };
  }
  if (down(signups) || down(posts)) {
    return {
      tone: "destructive" as const,
      title: down(signups) ? "Signups are falling" : "Supply is falling",
      body: down(signups)
        ? "New accounts are down on the previous window while supply holds. Look at where signups were coming from before and what changed."
        : "Posting is down on the previous window while signups hold. Sellers are arriving and going quiet, which usually points at the post flow or at what happens after a listing goes live.",
    };
  }
  return {
    tone: "warning" as const,
    title: "Flat, and flat needs effort",
    body: "Neither signups nor posts moved more than 20% against the previous window. This early, flat is the same as stalled: nothing currently running is compounding, so this is the moment to change something rather than wait.",
  };
}

function MetricCard({
  icon: Icon,
  label,
  comparison,
  windowDays,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  comparison?: GrowthComparison;
  windowDays: number;
  hint?: string;
}) {
  if (!comparison) return null;
  const tone = DIRECTION_TONE[comparison.direction];
  const DirectionIcon = DIRECTION_ICON[comparison.direction];
  const iconTone = {
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-secondary-strong",
    destructive: "bg-error-soft text-error",
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${iconTone}`}
          >
            <Icon className="size-5" />
          </div>
          {/* Direction is never colour alone — the arrow and the sign both
              carry it, so the card still reads without colour vision. */}
          <Badge variant={tone} className="flex items-center gap-1">
            <DirectionIcon className="size-3.5" />
            {formatChange(comparison.changePercent)}
          </Badge>
        </div>
        <div className="mt-5">
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-foreground tabular-nums">
            {formatNumber(comparison.current)}
          </p>
          <p className="mt-2 text-xs text-muted">
            {formatNumber(comparison.previous)} in the previous {windowDays} days
            {hint ? ` · ${hint}` : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function toBars(items: NamedCount[]) {
  return items.map<HorizontalBarDatum>((item, index) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: `var(--chart-${(index % 4) + 1})`,
  }));
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

const VERDICT_SURFACE = {
  success: "border-success/40 bg-success-soft",
  warning: "border-warning/40 bg-warning-soft",
  destructive: "border-error/40 bg-error-soft",
};

const VERDICT_BADGE = {
  success: "On track",
  warning: "Needs effort",
  destructive: "Act now",
};

export default function GrowthPage() {
  const [days, setDays] = useState(30);
  const [smoothed, setSmoothed] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: pulseData,
    loading: pulseLoading,
    refetch: refetchPulse,
  } = useQuery(ADMIN_GROWTH_PULSE, {
    variables: { days, months: MONTHS_BACK },
    fetchPolicy: "cache-and-network",
  });
  const { data: engagementData, refetch: refetchEngagement } = useQuery(ADMIN_GROWTH_ANALYTICS, {
    variables: { days },
    fetchPolicy: "cache-and-network",
  });

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchPulse({ days, months: MONTHS_BACK }),
        refetchEngagement({ days }),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  const pulse = pulseData?.adminGrowthPulse;
  const analytics = engagementData?.adminGrowthAnalytics;

  const byKey = useMemo(
    () => new Map((pulse?.comparisons ?? []).map((item) => [item.key, item])),
    [pulse],
  );
  const signupChange = byKey.get("signups");
  const postChange = byKey.get("posts");
  const sellerChange = byKey.get("postingSellers");
  const newSellerChange = byKey.get("newSellers");

  const read = verdict(signupChange, postChange);

  const dailyKeys = pulse?.daily.map((bucket) => bucket.key) ?? [];
  const dailySignups = useMemo(
    () => pulse?.daily.map((bucket) => bucket.signups) ?? [],
    [pulse],
  );
  const dailyPosts = useMemo(() => pulse?.daily.map((bucket) => bucket.posts) ?? [], [pulse]);

  const dailySeries = useMemo(
    () =>
      smoothed
        ? [
            {
              name: "Signups (7-day avg)",
              color: SIGNUP_COLOR,
              values: rollingAverage(dailySignups),
            },
            { name: "Posts (7-day avg)", color: POST_COLOR, values: rollingAverage(dailyPosts) },
          ]
        : [
            { name: "Signups", color: SIGNUP_COLOR, values: dailySignups },
            { name: "Posts", color: POST_COLOR, values: dailyPosts },
          ],
    [smoothed, dailySignups, dailyPosts],
  );

  const activation = pulse?.activation;
  const activationFunnel: HorizontalBarDatum[] = activation
    ? [
        {
          key: "signups",
          label: "Signed up",
          value: activation.cohortSignups,
          color: SIGNUP_COLOR,
        },
        {
          key: "posted",
          label: "Posted at least once",
          value: activation.cohortActivated,
          color: POST_COLOR,
        },
        {
          key: "repeat",
          label: "Posted twice or more",
          value: activation.repeatSellers,
          color: SELLER_COLOR,
        },
      ]
    : [];

  const timeToFirstPost =
    activation?.medianHoursToFirstPost == null
      ? "Nobody in this cohort has posted yet"
      : activation.medianHoursToFirstPost < 48
        ? `Typically ${activation.medianHoursToFirstPost} hours from signing up to a first post`
        : `Typically ${Math.round(activation.medianHoursToFirstPost / 24)} days from signing up to a first post`;

  const deviceData: DonutDatum[] = (analytics?.deviceTypes ?? []).map((item) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: deviceColor(item.key),
  }));
  const funnelBars = (analytics?.funnel ?? []).map<HorizontalBarDatum>((item, index) => ({
    key: item.key,
    label: item.label,
    value: item.count,
    color: index === 0 ? "var(--chart-accent)" : `var(--chart-${(index % 4) + 1})`,
  }));
  const saveRate = analytics ? pct(analytics.totalSaves, analytics.totalViews) : 0;
  const repeatRate = analytics ? pct(analytics.repeatActiveUsers, analytics.trackedSessions) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-strong">
            Growth
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Are signups and supply compounding?
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Every number here is measured against the same length of time immediately before it, so
            a 30-day view is judged against the 30 days before it. Growth is called at +20%,
            shrinkage at -5%, and everything between is flat.
          </p>
          {pulse ? (
            <p className="mt-3 text-xs text-muted">
              {formatDate(pulse.from)} to {formatDate(pulse.to)}, against{" "}
              {formatDate(pulse.previousFrom)} to {formatDate(pulse.previousTo)}
            </p>
          ) : null}
        </div>

        {/* Filters sit in one row above the charts. */}
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

      {pulseLoading && !pulse ? (
        <div className="space-y-6">
          <Skeleton className="h-28 w-full" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-44 w-full" />
            ))}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      ) : pulse ? (
        <>
          {read ? (
            <div className={`rounded-2xl border p-5 ${VERDICT_SURFACE[read.tone]}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Badge variant={read.tone} className="w-fit shrink-0 sm:mt-0.5">
                  {VERDICT_BADGE[read.tone]}
                </Badge>
                <div>
                  <p className="text-lg font-bold text-foreground">{read.title}</p>
                  <p className="mt-1 max-w-4xl text-sm leading-6 text-muted">{read.body}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={UserPlus}
              label="New signups"
              comparison={signupChange}
              windowDays={pulse.windowDays}
              hint={`${formatNumber(pulse.totalUsers)} all time`}
            />
            <MetricCard
              icon={Store}
              label="New posts"
              comparison={postChange}
              windowDays={pulse.windowDays}
              hint={`${formatNumber(pulse.totalPosts)} all time`}
            />
            <MetricCard
              icon={Users}
              label="Sellers who posted"
              comparison={sellerChange}
              windowDays={pulse.windowDays}
              hint={`${activation?.postsPerPostingSeller ?? 0} posts each`}
            />
            <MetricCard
              icon={Activity}
              label="First-time sellers"
              comparison={newSellerChange}
              windowDays={pulse.windowDays}
              hint="first post ever"
            />
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
              <div>
                <CardTitle>Signups and posts, day by day</CardTitle>
                <CardDescription>
                  Both series are counts on one shared scale, across the {rangeLabel(days)}.
                </CardDescription>
              </div>
              <div className="inline-flex w-fit shrink-0 rounded-full border border-border bg-elevated p-1">
                <Button
                  variant={smoothed ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSmoothed(true)}
                >
                  7-day avg
                </Button>
                <Button
                  variant={smoothed ? "ghost" : "default"}
                  size="sm"
                  onClick={() => setSmoothed(false)}
                >
                  Daily
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart dates={dailyKeys} series={dailySeries} height={300} />
              <p className="mt-3 text-xs text-muted">
                {smoothed
                  ? "Each point averages that day and the six before it. Read direction off this, not off single days."
                  : "Raw daily counts. Expect these to jump around at low volume — the 7-day average is the trend."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Month by month</CardTitle>
              <CardDescription>
                Signups and posts per calendar month over the last {MONTHS_BACK} months. The current
                month is still filling up, so it will look short until it closes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimeSeriesChart
                dates={pulse.monthly.map((bucket) => bucket.key)}
                labels={pulse.monthly.map((bucket) => bucket.label)}
                kind="grouped-bars"
                height={300}
                series={[
                  {
                    name: "Signups",
                    color: SIGNUP_COLOR,
                    values: pulse.monthly.map((bucket) => bucket.signups),
                  },
                  {
                    name: "Posts",
                    color: POST_COLOR,
                    values: pulse.monthly.map((bucket) => bucket.posts),
                  },
                ]}
              />
            </CardContent>
          </Card>

          {activation ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>From signup to seller</CardTitle>
                  <CardDescription>
                    Of the {formatNumber(activation.cohortSignups)} accounts opened in the{" "}
                    {rangeLabel(days)}, how many went on to publish something.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HorizontalBarChart data={activationFunnel} valueFormatter={formatNumber} />
                  <p className="mt-4 text-sm text-muted">{timeToFirstPost}.</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-5">
                  <p className="text-sm text-muted">Activation in this window</p>
                  <p className="mt-1 text-4xl font-bold tracking-tight text-foreground tabular-nums">
                    {activation.cohortActivationPercent}%
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {formatNumber(activation.cohortActivated)} of{" "}
                    {formatNumber(activation.cohortSignups)} new accounts have posted.
                  </p>

                  <div className="mt-6 border-t border-border pt-4">
                    <p className="text-sm text-muted">Activation all time</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                      {activation.lifetimeActivationPercent}%
                    </p>
                    <p className="mt-2 text-xs text-muted">
                      {formatNumber(activation.lifetimeActivated)} of{" "}
                      {formatNumber(activation.lifetimeUsers)} accounts have ever posted.
                    </p>
                  </div>

                  <p className="mt-6 text-xs leading-5 text-muted">
                    A signup that never posts is a browser, not supply. This is the number to move
                    when posts stay flat while signups climb.
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-sm text-muted">
            Growth data is not available yet.
          </CardContent>
        </Card>
      )}

      {analytics ? (
        <>
          <div className="pt-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Demand side</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted">
              Supply only matters if somebody is looking at it. This is what the {rangeLabel(days)}{" "}
              of attention turned into.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>From views to conversations</CardTitle>
                <CardDescription>
                  Where attention drops on its way to a buyer actually messaging a seller.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart data={funnelBars} valueFormatter={formatNumber} />
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <Card>
                <CardContent className="p-5">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
                    <Eye className="size-5" />
                  </div>
                  <p className="mt-5 text-sm text-muted">Views turning into saves</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-foreground tabular-nums">
                    {saveRate.toFixed(1)}%
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {formatNumber(analytics.totalSaves)} saves from{" "}
                    {formatNumber(analytics.totalViews)} views.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
                    <MousePointerClick className="size-5" />
                  </div>
                  <p className="mt-5 text-sm text-muted">Came back on another day</p>
                  <p className="mt-1 text-3xl font-bold tracking-tight text-foreground tabular-nums">
                    {formatNumber(analytics.repeatActiveUsers)}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {repeatRate.toFixed(1)}% of tracked sessions became a repeat visit.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="pt-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Technical mix</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted">
              Not a growth signal. Useful when deciding where to spend QA time, or when debugging
              upload, playback or sign-in problems by surface.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="size-4" />
                  Device mix
                </CardTitle>
                <CardDescription>Sessions by device class.</CardDescription>
              </CardHeader>
              <CardContent>
                <DonutChart
                  data={deviceData}
                  height={240}
                  centerValue={formatNumber(analytics.trackedSessions)}
                  centerHint="tracked sessions"
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Operating systems</CardTitle>
                <CardDescription>Where the user base actually shows up.</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  data={toBars(analytics.operatingSystems)}
                  valueFormatter={formatNumber}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Browsers</CardTitle>
                <CardDescription>Useful when a bug is reported on one surface.</CardDescription>
              </CardHeader>
              <CardContent>
                <HorizontalBarChart
                  data={toBars(analytics.browsers)}
                  valueFormatter={formatNumber}
                />
              </CardContent>
            </Card>
          </div>

          <p className="flex items-center gap-2 pb-2 text-xs text-muted">
            <ArrowRight className="size-3.5" />
            Pending approvals are supply that cannot reach a buyer yet:{" "}
            {formatNumber(analytics.pendingApprovalPosts)} waiting.
          </p>
        </>
      ) : null}
    </div>
  );
}
