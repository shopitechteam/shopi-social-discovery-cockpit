"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import {
  ArrowRight,
  Eye,
  Mail,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
  UserMinus,
  UserRoundCheck,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import {
  ADMIN_CREATORS,
  ADMIN_CREATOR_DETAIL,
  ADMIN_SET_USER_SUSPENDED,
} from "@/graphql/operations";
import type {
  AdminContent,
  AdminCreatorSummary,
} from "@/graphql/types";
import { AdminCreatorSort, ContentStatus } from "@/graphql/types";
import { displayName, formatDate, formatNumber, formatRelative } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { DonutChart, type DonutDatum } from "@/components/charts/donut-chart";
import { HorizontalBarChart, type HorizontalBarDatum } from "@/components/charts/horizontal-bar-chart";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";

const LIST_PAGE_SIZE = 18;
const DETAIL_RANGE_OPTIONS = [
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "180D", days: 180 },
] as const;

const SORT_OPTIONS = [
  { label: "Engagement", value: AdminCreatorSort.ENGAGEMENT },
  { label: "Saves", value: AdminCreatorSort.SAVES },
  { label: "Views", value: AdminCreatorSort.VIEWS },
  { label: "Posts", value: AdminCreatorSort.POSTS },
  { label: "Last posted", value: AdminCreatorSort.LAST_POSTED },
] as const;

function creatorName(creator: AdminCreatorSummary["creator"]) {
  return displayName(creator);
}

function creatorSearchValue(creator: AdminCreatorSummary["creator"]) {
  return creator.email || creator.username || creator.id;
}

function errMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

function statusTone(status: ContentStatus | string): {
  badge: "default" | "secondary" | "success" | "warning" | "destructive" | "accent" | "outline";
  color: string;
  label: string;
} {
  const normalized = status.trim().toUpperCase();

  switch (normalized) {
    case ContentStatus.ACTIVE:
      return { badge: "success", color: "var(--chart-good)", label: "Active" };
    case ContentStatus.PENDING_REVIEW:
      return { badge: "warning", color: "var(--chart-warning)", label: "Pending review" };
    case ContentStatus.PROCESSING:
      return { badge: "accent", color: "var(--chart-violet)", label: "Processing" };
    case ContentStatus.REJECTED:
      return { badge: "destructive", color: "var(--chart-serious)", label: "Rejected" };
    case ContentStatus.REMOVED:
      return { badge: "secondary", color: "var(--chart-critical)", label: "Removed" };
    case ContentStatus.UNDER_REVIEW:
      return { badge: "outline", color: "var(--chart-neutral)", label: "Under review" };
    case ContentStatus.FAILED:
      return { badge: "destructive", color: "var(--chart-critical)", label: "Failed" };
    default:
      return {
        badge: "outline",
        color: "var(--chart-neutral)",
        label: normalized.toLowerCase().replaceAll("_", " "),
      };
  }
}

function RecentPostCard({ post }: { post: AdminContent }) {
  const tone = statusTone(post.status);
  return (
    <div className="rounded-2xl border border-border bg-background px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {post.title || post.caption || "Untitled post"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {formatDate(post.createdAt)}
          </p>
        </div>
        <Badge variant={tone.badge}>{post.status.replaceAll("_", " ")}</Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted">
        <div className="rounded-xl bg-surface px-3 py-2">
          <p>Views</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatNumber(post.stats.views)}
          </p>
        </div>
        <div className="rounded-xl bg-surface px-3 py-2">
          <p>Saves</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatNumber(post.stats.saves)}
          </p>
        </div>
        <div className="rounded-xl bg-surface px-3 py-2">
          <p>Comments</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatNumber(post.stats.comments)}
          </p>
        </div>
      </div>
    </div>
  );
}

function SuspendCreatorDialog({
  creator,
  open,
  onOpenChange,
  onSaved,
}: {
  creator: AdminCreatorSummary["creator"] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [setSuspended, { loading }] = useMutation(ADMIN_SET_USER_SUSPENDED);

  useEffect(() => {
    if (!open) setReason("");
  }, [open]);

  if (!creator) return null;
  const suspending = !creator.isSuspended;
  const creatorId = creator.id;
  const creatorDisplayName = creatorName(creator);

  async function handleConfirm() {
    try {
      await setSuspended({
        variables: {
          userId: creatorId,
          suspended: suspending,
          reason: suspending ? reason.trim() || null : null,
        },
      });
      toast.success(suspending ? "Creator suspended" : "Creator reinstated");
      onOpenChange(false);
      onSaved();
    } catch (error) {
      toast.error(errMessage(error));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {suspending ? "Suspend" : "Reinstate"} {creatorDisplayName}
          </DialogTitle>
          <DialogDescription>
            {suspending
              ? "This blocks sign-in and all seller actions. Their storefront activity will stop until you reinstate them."
              : "This restores the creator account immediately so they can post and engage again."}
          </DialogDescription>
        </DialogHeader>
        {suspending && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Reason</p>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Optional note shown if they try to sign in"
              rows={3}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant={suspending ? "destructive" : "success"}
            onClick={handleConfirm}
            loading={loading}
          >
            {suspending ? "Suspend creator" : "Reinstate creator"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CreatorsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<AdminCreatorSort>(AdminCreatorSort.ENGAGEMENT);
  const [suspendedFilter, setSuspendedFilter] = useState<string>("");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [detailDays, setDetailDays] = useState<number>(30);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const listVariables = {
    page,
    limit: LIST_PAGE_SIZE,
    search: search.trim() || null,
    suspended:
      suspendedFilter === "" ? null : suspendedFilter === "true",
    sort,
  };

  const { data, loading, refetch } = useQuery(ADMIN_CREATORS, {
    variables: listVariables,
    fetchPolicy: "cache-and-network",
  });

  const creators = data?.adminCreators.data ?? [];
  const meta = data?.adminCreators.meta;

  useEffect(() => {
    if (creators.length === 0) {
      setSelectedCreatorId(null);
      return;
    }
    if (!selectedCreatorId || !creators.some((item) => item.creator.id === selectedCreatorId)) {
      setSelectedCreatorId(creators[0].creator.id);
    }
  }, [creators, selectedCreatorId]);

  const {
    data: detailData,
    loading: detailLoading,
    refetch: refetchDetail,
  } = useQuery(ADMIN_CREATOR_DETAIL, {
    variables: { creatorId: selectedCreatorId ?? "", days: detailDays },
    skip: !selectedCreatorId,
    fetchPolicy: "cache-and-network",
  });

  const detail = detailData?.adminCreatorDetail ?? null;
  const selectedSummary =
    creators.find((item) => item.creator.id === selectedCreatorId) ?? detail?.summary ?? null;

  const totalCreators = creators.length;
  const totalViews = creators.reduce((sum, creator) => sum + creator.totalViews, 0);
  const totalSaves = creators.reduce((sum, creator) => sum + creator.totalSaves, 0);
  const activeCreators = creators.filter((creator) => creator.activePostCount > 0).length;
  const pendingPosts = creators.reduce((sum, creator) => sum + creator.pendingPostCount, 0);

  const statusDonutData: DonutDatum[] = (detail?.statusBreakdown ?? []).map((item) => ({
    key: item.key,
    label: statusTone(item.key as ContentStatus).label,
    value: item.count,
    color: statusTone(item.key as ContentStatus).color,
  }));

  const postDates = detail?.postActivity.map((row) => row.date) ?? [];
  const postValues = detail?.postActivity.map((row) => row.count) ?? [];
  const engagementDates = detail?.engagementByDay.map((row) => row.date) ?? [];
  const viewsByDay = detail?.engagementByDay.map((row) => row.views) ?? [];
  const savesByDay = detail?.engagementByDay.map((row) => row.saves) ?? [];

  const topPostBars: HorizontalBarDatum[] = (detail?.topPosts ?? []).map((post, index) => ({
    key: post.id,
    label: post.title || post.caption || `Post ${index + 1}`,
    value: post.stats.saves + post.stats.views,
    color: index % 2 === 0 ? "var(--chart-3)" : "var(--chart-1)",
  }));

  const leader = creators[0] ?? null;

  function resetPaginationAndSetSearch(value: string) {
    setPage(1);
    setSearch(value);
  }

  function resetPaginationAndSetSort(value: AdminCreatorSort) {
    setPage(1);
    setSort(value);
  }

  function resetPaginationAndSetSuspended(value: string) {
    setPage(1);
    setSuspendedFilter(value);
  }

  async function handleMutationRefresh() {
    setRefreshing(true);
    try {
      await refetch();
      if (selectedCreatorId) {
        await refetchDetail({ creatorId: selectedCreatorId, days: detailDays });
      }
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <SuspendCreatorDialog
        creator={detail?.creator ?? selectedSummary?.creator ?? null}
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onSaved={handleMutationRefresh}
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-strong">
            Creators
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Operate the seller base that drives supply and future revenue
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Track who is posting, who is winning attention, whose pipeline is getting stuck,
            and which sellers are strong candidates for featuring, support, or monetization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void handleMutationRefresh()}
            loading={refreshing}
          >
            {!refreshing && <RefreshCw className="size-4" />}
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          {leader && (
            <Button asChild>
              <Link href={`/users?search=${encodeURIComponent(creatorSearchValue(leader.creator))}`}>
                Open current leader
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
              <Users className="size-5" />
            </div>
            <p className="mt-5 text-sm text-muted">Creators on this page</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              {formatNumber(totalCreators)}
            </p>
            <p className="mt-2 text-xs text-muted">
              Current seller cohort after search, suspension filter, and ranking.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-success-soft text-success">
              <TrendingUp className="size-5" />
            </div>
            <p className="mt-5 text-sm text-muted">Active creators</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              {formatNumber(activeCreators)}
            </p>
            <p className="mt-2 text-xs text-muted">
              Sellers with at least one currently active post in the visible cohort.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <Eye className="size-5" />
            </div>
            <p className="mt-5 text-sm text-muted">Views generated</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              {formatNumber(totalViews)}
            </p>
            <p className="mt-2 text-xs text-muted">
              Aggregate reach from the sellers currently surfaced in this workspace.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-warning-soft text-secondary-strong">
              <ShieldAlert className="size-5" />
            </div>
            <p className="mt-5 text-sm text-muted">Pending approval posts</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
              {formatNumber(pendingPosts)}
            </p>
            <p className="mt-2 text-xs text-muted">
              Backlog still waiting on moderation before these sellers can fully convert.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.98fr_1.42fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Creator workspace</CardTitle>
              <CardDescription>
                Search and rank sellers by current business signal, then drill into one profile on the right.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="relative md:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                  <Input
                    value={search}
                    onChange={(event) => resetPaginationAndSetSearch(event.target.value)}
                    placeholder="Search seller, email, username…"
                    className="pl-9"
                  />
                </div>
                <select
                  value={sort}
                  onChange={(event) =>
                    resetPaginationAndSetSort(event.target.value as AdminCreatorSort)
                  }
                  className="h-10 rounded-lg border border-border bg-elevated px-3 text-sm text-foreground"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Sort: {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={suspendedFilter}
                  onChange={(event) => resetPaginationAndSetSuspended(event.target.value)}
                  className="h-10 rounded-lg border border-border bg-elevated px-3 text-sm text-foreground"
                >
                  <option value="">All suspension states</option>
                  <option value="false">Only active accounts</option>
                  <option value="true">Only suspended accounts</option>
                </select>
              </div>

              <div className="space-y-3">
                {loading && creators.length === 0 ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-28 w-full" />
                  ))
                ) : creators.length > 0 ? (
                  creators.map((item) => {
                    const selected = item.creator.id === selectedCreatorId;
                    return (
                      <button
                        key={item.creator.id}
                        type="button"
                        onClick={() => setSelectedCreatorId(item.creator.id)}
                        className={`w-full rounded-3xl border p-4 text-left transition ${
                          selected
                            ? "border-primary/50 bg-primary-soft/40"
                            : "border-border bg-background hover:border-border-strong"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              src={item.creator.profile?.avatar}
                              name={creatorName(item.creator)}
                              className="size-11"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {creatorName(item.creator)}
                                </p>
                                {item.creator.isSuspended ? (
                                  <Badge variant="destructive">Suspended</Badge>
                                ) : item.activePostCount > 0 ? (
                                  <Badge variant="success">Active seller</Badge>
                                ) : (
                                  <Badge variant="outline">Watching</Badge>
                                )}
                              </div>
                              <p className="truncate text-xs text-muted">
                                {item.creator.email ??
                                  (item.creator.username ? `@${item.creator.username}` : item.creator.id)}
                              </p>
                            </div>
                          </div>
                          <ArrowRight className="mt-1 size-4 shrink-0 text-muted" />
                        </div>

                        <div className="mt-4 grid grid-cols-4 gap-2">
                          <div className="rounded-2xl bg-surface px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Posts</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {formatNumber(item.postCount)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-surface px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Saves</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {formatNumber(item.totalSaves)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-surface px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Views</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {formatNumber(item.totalViews)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-surface px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Rate</p>
                            <p className="mt-1 text-sm font-semibold text-foreground">
                              {item.saveRatePercent}%
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
                          <span>Pending {formatNumber(item.pendingPostCount)}</span>
                          <span>Processing {formatNumber(item.processingPostCount)}</span>
                          <span>
                            Last post {item.lastPostedAt ? formatRelative(item.lastPostedAt) : "—"}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-3xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted">
                    No creators match the current filters yet.
                  </div>
                )}
              </div>

              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
                  <p className="text-sm text-muted">
                    Page {meta.page} of {meta.totalPages} · {formatNumber(meta.total)} creators
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!meta.hasPrevPage}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!meta.hasNextPage}
                      onClick={() => setPage((current) => current + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {detailLoading && !detail ? (
            <Skeleton className="h-[920px] w-full" />
          ) : detail ? (
            <>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-[radial-gradient(circle_at_top_left,rgba(var(--color-primary-rgb),0.12),transparent_42%),linear-gradient(135deg,rgba(var(--color-surface-rgb),0.95),rgba(var(--color-surface-rgb),0.65))] p-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar
                          src={detail.creator.profile?.avatar}
                          name={creatorName(detail.creator)}
                          className="size-16"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                              {creatorName(detail.creator)}
                            </h2>
                            {detail.creator.isSuspended ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : (
                              <Badge variant="success">Eligible seller</Badge>
                            )}
                            {detail.creator.isVerified && (
                              <Badge variant="outline">Verified</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted">
                            {detail.creator.email ??
                              (detail.creator.username ? `@${detail.creator.username}` : detail.creator.id)}
                          </p>
                          <p className="mt-3 max-w-2xl text-sm text-muted">
                            Use this panel to decide who deserves featuring, support, moderation follow-up,
                            or direct commercial outreach as Shopi’s seller base grows.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button asChild variant="outline">
                          <Link href={`/users?search=${encodeURIComponent(creatorSearchValue(detail.creator))}`}>
                            <Users className="mr-2 size-4" />
                            Open user record
                          </Link>
                        </Button>
                        {detail.creator.email && (
                          <Button asChild variant="outline">
                            <a href={`mailto:${detail.creator.email}`}>
                              <Mail className="mr-2 size-4" />
                              Email
                            </a>
                          </Button>
                        )}
                        <Button
                          variant={detail.creator.isSuspended ? "success" : "destructive"}
                          onClick={() => setSuspendOpen(true)}
                        >
                          {detail.creator.isSuspended ? (
                            <UserRoundCheck className="mr-2 size-4" />
                          ) : (
                            <UserMinus className="mr-2 size-4" />
                          )}
                          {detail.creator.isSuspended ? "Reinstate" : "Suspend"}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-3xl border border-border bg-background/80 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">Total posts</p>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                          {formatNumber(detail.summary.postCount)}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          {formatNumber(detail.summary.activePostCount)} active ·{" "}
                          {formatNumber(detail.summary.pendingPostCount)} pending
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border bg-background/80 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">Views</p>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                          {formatNumber(detail.summary.totalViews)}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          Avg {formatNumber(detail.summary.averageViewsPerPost)} per post
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border bg-background/80 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">Saves</p>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                          {formatNumber(detail.summary.totalSaves)}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          Avg {formatNumber(detail.summary.averageSavesPerPost)} per post
                        </p>
                      </div>
                      <div className="rounded-3xl border border-border bg-background/80 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted">Save rate</p>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                          {detail.summary.saveRatePercent}%
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          Last posted {detail.summary.lastPostedAt ? formatRelative(detail.summary.lastPostedAt) : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="inline-flex rounded-full border border-border bg-elevated p-1">
                {DETAIL_RANGE_OPTIONS.map((option) => (
                  <Button
                    key={option.days}
                    variant={detailDays === option.days ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setDetailDays(option.days)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Content status mix</CardTitle>
                    <CardDescription>
                      Spot whether this seller is shipping cleanly or getting stuck in moderation and processing.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {statusDonutData.length > 0 ? (
                      <DonutChart
                        data={statusDonutData}
                        height={240}
                        centerValue={formatNumber(detail.summary.postCount)}
                        valueFormatter={formatNumber}
                      />
                    ) : (
                      <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
                        No creator content has been recorded yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top post momentum</CardTitle>
                    <CardDescription>
                      Combined saves and views across the creator’s strongest current listings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {topPostBars.length > 0 ? (
                      <HorizontalBarChart data={topPostBars} valueFormatter={formatNumber} />
                    ) : (
                      <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
                        No standout posts are available yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Posting cadence</CardTitle>
                    <CardDescription>
                      New posts over the selected window. Good for spotting consistency or drop-off.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {postDates.length > 0 ? (
                      <TimeSeriesChart
                        dates={postDates}
                        series={[
                          {
                            name: "Posts",
                            color: "var(--chart-accent)",
                            values: postValues,
                          },
                        ]}
                        kind="bars"
                        valueFormatter={formatNumber}
                      />
                    ) : (
                      <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
                        No posting activity landed in this range.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Audience pull</CardTitle>
                    <CardDescription>
                      Daily views and saves received by this creator in the selected window.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {engagementDates.length > 0 ? (
                      <TimeSeriesChart
                        dates={engagementDates}
                        series={[
                          { name: "Views", color: "var(--chart-1)", values: viewsByDay },
                          { name: "Saves", color: "var(--chart-3)", values: savesByDay },
                        ]}
                        valueFormatter={formatNumber}
                      />
                    ) : (
                      <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
                        No engagement has been recorded in this range.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent posts</CardTitle>
                    <CardDescription>
                      The latest listings from this creator so you can review freshness and execution quality.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {detail.recentPosts.length > 0 ? (
                      detail.recentPosts.map((post) => <RecentPostCard key={post.id} post={post} />)
                    ) : (
                      <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
                        No posts to show yet.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Best-performing posts</CardTitle>
                    <CardDescription>
                      Ranked by saves first, then views, so you can see what kind of inventory is really resonating.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {detail.topPosts.length > 0 ? (
                      detail.topPosts.map((post) => <RecentPostCard key={post.id} post={post} />)
                    ) : (
                      <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
                        No top post data is available yet.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="flex min-h-[440px] items-center justify-center">
                <div className="max-w-md text-center">
                  <Video className="mx-auto size-10 text-muted" />
                  <h2 className="mt-4 text-xl font-semibold text-foreground">
                    Pick a creator to inspect
                  </h2>
                  <p className="mt-2 text-sm text-muted">
                    This panel will show seller health, trend lines, recent listings, and actions like email or suspend.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Why this tab matters</CardTitle>
          <CardDescription>
            These are the sellers creating supply, learning demand, and likely becoming your first monetizable power users.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Feature with confidence</p>
            <p className="mt-2 text-sm text-muted">
              Promote sellers whose save velocity and repeated views show real buyer pull.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Catch revenue risks early</p>
            <p className="mt-2 text-sm text-muted">
              See which creators are piling up pending, rejected, or stalled posts before they churn.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface px-4 py-4">
            <p className="text-sm font-semibold text-foreground">Build your seller playbook</p>
            <p className="mt-2 text-sm text-muted">
              The best creators here become the first candidates for boosting, subscriptions, campaigns, and partnerships.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
