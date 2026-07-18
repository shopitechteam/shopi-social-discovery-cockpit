"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  ArrowRight,
  Bookmark,
  Eye,
  Mail,
  Search,
  Sparkles,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { ADMIN_ANALYTICS } from "@/graphql/operations";
import type { TopCreatorStat } from "@/graphql/types";
import { displayName, formatNumber } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const RANGE_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
] as const;

function creatorSearchValue(creator: TopCreatorStat): string {
  return creator.email || creator.username || creator.creatorId;
}

function creatorLabel(creator: TopCreatorStat): string {
  return displayName({
    profile: creator.profile,
    username: creator.username,
    email: creator.email,
  });
}

function matchesCreator(creator: TopCreatorStat, query: string): boolean {
  if (!query) return true;
  const haystack = [
    creatorLabel(creator),
    creator.email,
    creator.username,
    creator.creatorId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function RankCard({
  creator,
  rank,
}: {
  creator: TopCreatorStat;
  rank: number;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={creator.profile?.avatar}
              name={creatorLabel(creator)}
              className="size-12"
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{creatorLabel(creator)}</p>
                <Badge variant={rank === 1 ? "default" : "outline"}>#{rank}</Badge>
              </div>
              <p className="text-xs text-muted">
                {creator.email ?? (creator.username ? `@${creator.username}` : creator.creatorId)}
              </p>
            </div>
          </div>
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
            <Trophy className="size-4" />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-border bg-background px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Saves</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatNumber(creator.totalSaves)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Views</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatNumber(creator.totalViews)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-background px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Posts</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatNumber(creator.postCount)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CreatorsPage() {
  const [days, setDays] = useState<number>(30);
  const [search, setSearch] = useState("");

  const { data, loading } = useQuery(ADMIN_ANALYTICS, {
    variables: { days },
  });

  const creators = data?.adminAnalytics.topCreators ?? [];
  const filteredCreators = useMemo(
    () => creators.filter((creator) => matchesCreator(creator, search.trim())),
    [creators, search],
  );

  const totalViews = filteredCreators.reduce((sum, creator) => sum + creator.totalViews, 0);
  const totalSaves = filteredCreators.reduce((sum, creator) => sum + creator.totalSaves, 0);
  const totalPosts = filteredCreators.reduce((sum, creator) => sum + creator.postCount, 0);
  const avgEngagement =
    filteredCreators.length > 0
      ? Math.round(
          filteredCreators.reduce((sum, creator) => sum + creator.totalEngagement, 0) /
            filteredCreators.length,
        )
      : 0;

  const leader = filteredCreators[0] ?? null;
  const podium = filteredCreators.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-strong">
            Creators
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Identify sellers worth featuring and backing
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Rank Shopi creators by saves, views, and overall engagement so you can promote the right sellers, spot rising talent, and intervene early when momentum drops.
          </p>
        </div>

        <div className="inline-flex w-full rounded-full border border-border bg-elevated p-1 lg:w-auto">
          {RANGE_OPTIONS.map((option) => (
            <Button
              key={option.days}
              variant={days === option.days ? "default" : "ghost"}
              size="sm"
              onClick={() => setDays(option.days)}
              className="flex-1 lg:flex-none"
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {loading && creators.length === 0 ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36 w-full" />)
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
                    <Users className="size-5" />
                  </div>
                  <Badge variant="outline">{days} days</Badge>
                </div>
                <p className="mt-5 text-sm text-muted">Tracked creators</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                  {formatNumber(filteredCreators.length)}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Ranked from the current top-performer set in admin analytics.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-success-soft text-success">
                  <Bookmark className="size-5" />
                </div>
                <p className="mt-5 text-sm text-muted">Total saves</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                  {formatNumber(totalSaves)}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Strongest signal for content that people want to come back to.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
                  <Eye className="size-5" />
                </div>
                <p className="mt-5 text-sm text-muted">Total views</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                  {formatNumber(totalViews)}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Reach generated by the featured creator cohort in this window.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-warning-soft text-secondary-strong">
                  <Sparkles className="size-5" />
                </div>
                <p className="mt-5 text-sm text-muted">Avg engagement</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                  {formatNumber(avgEngagement)}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Average combined interaction volume per creator across the list.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Feature candidate of the window</CardTitle>
                <CardDescription>
                  Your current top-ranked creator based primarily on saves, then views and engagement.
                </CardDescription>
              </div>
              <Badge variant="default">Ranked leader</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading && !leader ? (
              <Skeleton className="h-64 w-full" />
            ) : leader ? (
              <div className="rounded-[28px] border border-border bg-[radial-gradient(circle_at_top_left,rgba(var(--color-primary-rgb),0.12),transparent_45%),linear-gradient(135deg,rgba(var(--color-surface-rgb),0.9),rgba(var(--color-surface-rgb),0.55))] p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar
                      src={leader.profile?.avatar}
                      name={creatorLabel(leader)}
                      className="size-16"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                          {creatorLabel(leader)}
                        </h2>
                        <Badge variant="outline">#1 creator</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted">
                        {leader.email ?? (leader.username ? `@${leader.username}` : leader.creatorId)}
                      </p>
                      <p className="mt-3 max-w-2xl text-sm text-muted">
                        High save velocity and broad reach make this creator the strongest candidate for homepage featuring, seller promotion, or direct partnership outreach this cycle.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/users?search=${encodeURIComponent(creatorSearchValue(leader))}`}>
                        Check user
                        <ArrowRight />
                      </Link>
                    </Button>
                    {leader.email ? (
                      <Button asChild size="sm">
                        <a href={`mailto:${leader.email}`}>
                          <Mail />
                          Contact
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-background/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Posts</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {formatNumber(leader.postCount)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Saves</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {formatNumber(leader.totalSaves)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Views</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {formatNumber(leader.totalViews)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/80 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted">Engagement</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">
                      {formatNumber(leader.totalEngagement)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted">
                No creator performance data is available for this range yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Promotion shortlist</CardTitle>
            <CardDescription>
              Quick-glance leaderboard for the three strongest creator profiles in this range.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading && podium.length === 0 ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-36 w-full" />)
            ) : podium.length > 0 ? (
              podium.map((creator, index) => (
                <RankCard key={creator.creatorId} creator={creator} rank={index + 1} />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted">
                No shortlisted creators match your current search.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Creator leaderboard</CardTitle>
            <CardDescription>
              Filter the current ranked cohort and jump into the matching user record.
            </CardDescription>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creator, email, username…"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading && filteredCreators.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredCreators.length > 0 ? (
            <div className="space-y-3">
              {filteredCreators.map((creator, index) => (
                <div
                  key={creator.creatorId}
                  className="flex flex-col gap-4 rounded-[24px] border border-border bg-background px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-10 items-center justify-center rounded-2xl bg-subtle text-sm font-bold text-foreground">
                      #{index + 1}
                    </div>
                    <Avatar
                      src={creator.profile?.avatar}
                      name={creatorLabel(creator)}
                      className="size-12"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {creatorLabel(creator)}
                        </p>
                        <Badge variant="accent">Creator</Badge>
                      </div>
                      <p className="truncate text-xs text-muted">
                        {creator.email ?? (creator.username ? `@${creator.username}` : creator.creatorId)}
                      </p>
                    </div>
                  </div>

                  <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-border px-3 py-2">
                      <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-muted">
                        <Video className="size-3" />
                        Posts
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatNumber(creator.postCount)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border px-3 py-2">
                      <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-muted">
                        <Bookmark className="size-3" />
                        Saves
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatNumber(creator.totalSaves)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border px-3 py-2">
                      <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-muted">
                        <Eye className="size-3" />
                        Views
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatNumber(creator.totalViews)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border px-3 py-2">
                      <p className="flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-muted">
                        <Sparkles className="size-3" />
                        Engagement
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatNumber(creator.totalEngagement)}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/users?search=${encodeURIComponent(creatorSearchValue(creator))}`}>
                        Check user
                      </Link>
                    </Button>
                    {creator.email ? (
                      <Button asChild size="sm">
                        <a href={`mailto:${creator.email}`}>
                          <Mail />
                          Contact
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted">
              No creators match your search in this date range.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What this tab is using right now</CardTitle>
          <CardDescription>
            Built on the existing admin analytics query so you can use it immediately while we expand the dedicated creator APIs later.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Ranking signal</p>
            <p className="mt-1 text-sm text-muted">
              Saves are weighted first, then views and total engagement, matching the backend creator ranking logic.
            </p>
          </div>
          <div className="rounded-2xl border border-border px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Best immediate use</p>
            <p className="mt-1 text-sm text-muted">
              Feature these creators on the landing page, shortlist them for campaigns, or reach out directly by email.
            </p>
          </div>
          <div className="rounded-2xl border border-border px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Next backend upgrade</p>
            <p className="mt-1 text-sm text-muted">
              A paginated admin creators query will let this scale beyond the current top cohort into a full creators management surface.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
