"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  ExternalLink,
  Eye,
  MessageCircle,
  MousePointerClick,
  Phone,
  PhoneCall,
  RefreshCw,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { ADMIN_SOCIAL_PROOF_PERFORMANCE } from "@/graphql/operations";
import type { SellerPerformance, TrafficSource } from "@/graphql/types";
import { formatNumber } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { HorizontalBarChart } from "@/components/charts/horizontal-bar-chart";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { webUrl } from "@/lib/web-url";

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

const SOURCE_LABELS: Record<TrafficSource, string> = {
  SOCIAL_PROOF: "Homepage featured section",
  SEARCH: "Search engines",
  AI: "AI assistants",
  SOCIAL: "Social media",
  INTERNAL: "Inside Shopi",
  DIRECT: "Direct / unknown",
  OTHER: "Other websites",
};

const pct = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;

export default function SocialProofPage() {
  const [days, setDays] = useState<number>(30);
  const { data, loading, refetch, networkStatus } = useQuery(ADMIN_SOCIAL_PROOF_PERFORMANCE, {
    variables: { days },
    notifyOnNetworkStatusChange: true,
  });
  const sellers = data?.adminSocialProofPerformance ?? [];
  const refreshing = networkStatus === 4;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h1 className="text-xl font-bold text-foreground">Featured seller performance</h1>
          <p className="mt-1 text-sm text-muted">
            The funnel for every seller featured on the homepage: seen in the featured section →
            clicked → viewed the storefront or a listing → messaged, revealed the number or called.
            Includes signed-out visitors; bots are excluded and repeats within 30 minutes count once.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.days}
              size="sm"
              variant={days === option.days ? "default" : "ghost"}
              onClick={() => setDays(option.days)}
            >
              {option.label}
            </Button>
          ))}
          <Button
            size="icon"
            variant="ghost"
            aria-label="Refresh"
            onClick={() => void refetch()}
            disabled={refreshing}
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} />
          </Button>
        </div>
      </div>

      {loading && sellers.length === 0 ? (
        <Skeleton className="h-96 w-full rounded-2xl" />
      ) : sellers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Sparkles className="size-6 text-primary" />
            <p className="font-semibold text-foreground">No featured sellers yet</p>
            <p className="max-w-md text-sm text-muted">
              Feature a seller from Users → ⋯ → Social proof. They appear on the homepage within
              24 hours, and tracking starts then.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link href="/users">Go to Users</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        sellers.map((seller) => <SellerPerformanceCard key={seller.sellerId} seller={seller} />)
      )}
    </div>
  );
}

function SellerPerformanceCard({ seller }: { seller: SellerPerformance }) {
  const hasData =
    seller.impressions + seller.profileViews + seller.listingViews + seller.conversions > 0;

  const kpis = [
    { label: "Homepage impressions", value: formatNumber(seller.impressions), icon: Eye },
    {
      label: "Homepage clicks",
      value: formatNumber(seller.clicks),
      hint: `${pct(seller.clickThroughRate)} click-through`,
      icon: MousePointerClick,
    },
    { label: "Unique visitors", value: formatNumber(seller.uniqueVisitors), icon: Users },
    {
      label: "Storefront views",
      value: formatNumber(seller.profileViews),
      hint: `${formatNumber(seller.listingViews)} listing views`,
      icon: Eye,
    },
    {
      label: "Conversions",
      value: formatNumber(seller.conversions),
      hint: `${pct(seller.conversionRate)} of visitors`,
      icon: Target,
    },
  ];

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={seller.avatar} name={seller.displayName} className="size-11" />
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2">
              {seller.displayName}
              {seller.featured ? (
                <Badge variant="success">Featured</Badge>
              ) : (
                <Badge variant="secondary">Not featured</Badge>
              )}
            </CardTitle>
            <CardDescription className="truncate">
              @{seller.username}
              {seller.headline ? ` · ${seller.headline}` : ""}
            </CardDescription>
          </div>
        </div>
        <Button asChild size="sm" variant="outline">
          <a href={webUrl(`/en/@${seller.username}`)} target="_blank" rel="noopener noreferrer">
            View storefront <ExternalLink />
          </a>
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {kpis.map(({ label, value, hint, icon: Icon }) => (
            <div key={label} className="rounded-xl border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
                <Icon className="size-3.5" /> {label}
              </p>
              <p className="mt-1.5 text-2xl font-bold tabular-nums text-foreground">{value}</p>
              {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
            </div>
          ))}
        </div>

        {!hasData ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
            No activity recorded in the last {seller.days} days yet. Events appear here as visitors
            see the homepage section, open the storefront or a listing, and contact the seller.
          </p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Funnel</p>
              <HorizontalBarChart
                valueFormatter={formatNumber}
                data={[
                  { key: "impressions", label: "Saw on homepage", value: seller.impressions },
                  { key: "clicks", label: "Clicked from homepage", value: seller.clicks },
                  { key: "visitors", label: "Visited (any source)", value: seller.uniqueVisitors },
                  { key: "conversions", label: "Contacted the seller", value: seller.conversions },
                ]}
              />
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center">
                {[
                  { label: "Messages", value: seller.messageClicks, icon: MessageCircle },
                  { label: "Number reveals", value: seller.contactReveals, icon: Phone },
                  { label: "Calls", value: seller.callClicks, icon: PhoneCall },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label}>
                    <Icon className="mx-auto size-4 text-muted" />
                    <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
                      {formatNumber(value)}
                    </p>
                    <p className="text-xs text-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Where visitors came from</p>
              {seller.sources.length === 0 ? (
                <p className="text-sm text-muted">No storefront or listing visits yet.</p>
              ) : (
                <div className="space-y-2">
                  {seller.sources.map((source) => (
                    <div
                      key={source.source}
                      className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm odd:bg-subtle"
                    >
                      <span className="text-foreground">{SOURCE_LABELS[source.source]}</span>
                      <span className="shrink-0 tabular-nums text-muted">
                        {formatNumber(source.visits)} visits ·{" "}
                        <span className="font-semibold text-foreground">
                          {formatNumber(source.conversions)}
                        </span>{" "}
                        conv.
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border p-4">
              <p className="mb-3 text-sm font-semibold text-foreground">Daily</p>
              <TimeSeriesChart
                dates={seller.daily.map((day) => day.date)}
                series={[
                  { name: "Visits", color: "var(--chart-1)", values: seller.daily.map((d) => d.visits) },
                  {
                    name: "Homepage clicks",
                    color: "var(--chart-accent)",
                    values: seller.daily.map((d) => d.clicks),
                  },
                  {
                    name: "Conversions",
                    color: "var(--chart-2)",
                    values: seller.daily.map((d) => d.conversions),
                  },
                ]}
                height={200}
                valueFormatter={formatNumber}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
