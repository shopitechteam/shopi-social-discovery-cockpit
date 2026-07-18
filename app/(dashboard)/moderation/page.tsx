"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  AlertTriangle,
  Clock3,
  EyeOff,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  ADMIN_CONTENT,
  ADMIN_DASHBOARD_STATS,
  PENDING_APPROVAL_CONTENT,
} from "@/graphql/operations";
import { ContentStatus, type AdminContent } from "@/graphql/types";
import { displayName, formatDate, formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PostActions } from "@/components/posts/post-actions";
import { PostDetailDialog } from "@/components/posts/post-detail-dialog";
import { PostThumb } from "@/components/posts/post-thumb";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 350;

type ModerationTab = "reported" | "pending" | "hidden" | "rejected" | "removed";

const TAB_CONFIG: Array<{
  key: ModerationTab;
  label: string;
  status?: ContentStatus;
  reported?: boolean;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "reported", label: "Reported", reported: true, icon: ShieldAlert },
  { key: "pending", label: "Pending", status: ContentStatus.PENDING_REVIEW, icon: Clock3 },
  { key: "hidden", label: "Hidden", status: ContentStatus.UNDER_REVIEW, icon: EyeOff },
  { key: "rejected", label: "Rejected", status: ContentStatus.REJECTED, icon: AlertTriangle },
  { key: "removed", label: "Removed", status: ContentStatus.REMOVED, icon: Trash2 },
] as const;

function queueCount(
  key: ModerationTab,
  stats?: {
    pendingReviewContent: number;
    underReviewContent: number;
    rejectedContent: number;
    removedContent: number;
    reportedContent: number;
  },
) {
  if (!stats) return 0;
  switch (key) {
    case "reported":
      return stats.reportedContent;
    case "pending":
      return stats.pendingReviewContent;
    case "hidden":
      return stats.underReviewContent;
    case "rejected":
      return stats.rejectedContent;
    case "removed":
      return stats.removedContent;
  }
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
  tone?: "default" | "warning" | "danger";
}) {
  const iconTone = {
    default: "bg-primary-soft text-primary-strong",
    warning: "bg-warning-soft text-secondary-strong",
    danger: "bg-error-soft text-error",
  }[tone];

  return (
    <Card>
      <CardContent className="p-5">
        <div className={`flex size-11 items-center justify-center rounded-2xl ${iconTone}`}>
          <Icon className="size-5" />
        </div>
        <p className="mt-5 text-sm text-muted">{label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-2 text-xs text-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}

export default function ModerationPage() {
  const [tab, setTab] = useState<ModerationTab>("reported");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selected, setSelected] = useState<AdminContent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: statsData, loading: statsLoading } = useQuery(ADMIN_DASHBOARD_STATS);
  const { data: urgentData, loading: urgentLoading } = useQuery(PENDING_APPROVAL_CONTENT, {
    variables: { limit: 6, offset: 0 },
  });

  const activeTab = TAB_CONFIG.find((item) => item.key === tab) ?? TAB_CONFIG[0];

  const { data, loading } = useQuery(ADMIN_CONTENT, {
    variables: {
      page,
      limit: PAGE_SIZE,
      status: activeTab.status ?? null,
      search: submittedSearch || null,
      reported: activeTab.reported ?? null,
    },
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

  const stats = statsData?.adminDashboardStats;
  const urgentQueue = urgentData?.pendingApprovalContent ?? [];
  const posts = data?.adminContent.data ?? [];
  const meta = data?.adminContent.meta;
  const selectedFresh = useMemo(
    () => (selected ? (posts.find((post) => post.id === selected.id) ?? selected) : null),
    [posts, selected],
  );

  function openDetail(post: AdminContent) {
    setSelected(post);
    setDetailOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-strong">
            Moderation
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Review risk, approve content, and document outcomes
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            This workspace centralizes the moderation-heavy post flows that were previously scattered through the posts tab. Rejections always capture a creator-facing reason, and reported listings can now be reviewed as a dedicated queue.
          </p>
        </div>
      </div>

      {statsLoading && !stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={ShieldAlert}
            label="Reported posts"
            value={formatNumber(stats.reportedContent)}
            hint="Listings flagged by users and ready for closer inspection."
            tone={stats.reportedContent > 0 ? "danger" : "default"}
          />
          <StatCard
            icon={Clock3}
            label="Pending approval"
            value={formatNumber(stats.pendingReviewContent)}
            hint="New posts waiting for an explicit moderation decision."
            tone={stats.pendingReviewContent > 0 ? "warning" : "default"}
          />
          <StatCard
            icon={EyeOff}
            label="Hidden"
            value={formatNumber(stats.underReviewContent)}
            hint="Previously approved posts currently kept out of feeds."
          />
          <StatCard
            icon={AlertTriangle}
            label="Rejected + removed"
            value={formatNumber(stats.rejectedContent + stats.removedContent)}
            hint={`${formatNumber(stats.rejectedContent)} rejected · ${formatNumber(stats.removedContent)} removed`}
            tone={stats.rejectedContent + stats.removedContent > 0 ? "warning" : "default"}
          />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Oldest pending approvals</CardTitle>
            <CardDescription>
              Longest-waiting posts first so the backlog gets worked down fairly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {urgentLoading && urgentQueue.length === 0 ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full" />
                ))}
              </div>
            ) : urgentQueue.length > 0 ? (
              <div className="space-y-3">
                {urgentQueue.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    onClick={() => openDetail(post)}
                    className="flex w-full items-center gap-3 rounded-[22px] border border-border bg-background px-3 py-3 text-left transition-colors hover:bg-subtle"
                  >
                    <PostThumb post={post} className="h-16 w-12" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {post.title}
                        </p>
                        <StatusBadge status={post.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-muted">
                        {displayName(post.creator)} · {formatRelative(post.createdAt)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs text-muted">
                        {post.caption || "No caption provided"}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right lg:block">
                      <p className="text-xs uppercase tracking-[0.12em] text-muted">Waiting</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {formatRelative(post.createdAt)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted">
                No posts are currently waiting for approval.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Moderation notes</CardTitle>
            <CardDescription>
              Current moderation behavior already enforced through the API and UI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "Rejecting a post requires a written reason and stores it on the approval record.",
              "Rejected creators receive the rejection reason via email and it remains visible in post detail.",
              "Removing a post keeps the approval history intact so a moderator can still restore it later if needed.",
              "The posts tab still has moderation actions, but this page is now the dedicated queueing workspace.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Moderation queues</CardTitle>
            <CardDescription>
              Switch between reported, pending, hidden, rejected, and removed content. Search filters the active queue.
            </CardDescription>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or caption…"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TAB_CONFIG.map(({ key, label, icon: Icon }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTab(key);
                    setPage(1);
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary text-on-brand"
                      : "bg-subtle text-muted hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs font-bold",
                      active ? "bg-white/20" : "bg-elevated text-foreground",
                    )}
                  >
                    {formatNumber(queueCount(key, stats))}
                  </span>
                </button>
              );
            })}
          </div>

          {loading && posts.length === 0 ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-3">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex flex-col gap-4 rounded-[26px] border border-border bg-background px-4 py-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <button
                      type="button"
                      onClick={() => openDetail(post)}
                      className="flex min-w-0 flex-1 items-start gap-4 text-left"
                    >
                      <PostThumb post={post} className="h-20 w-14" />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {post.title}
                          </p>
                          <StatusBadge status={post.status} />
                          {post.moderation.isReported && (
                            <Badge variant="destructive">
                              {formatNumber(post.moderation.reportCount)} reports
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted">
                          {displayName(post.creator)}
                          {post.creator?.email ? ` · ${post.creator.email}` : ""}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-muted">
                          {post.caption || "No caption provided"}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span>Posted {formatDate(post.createdAt)}</span>
                          <span>•</span>
                          <span>{formatNumber(post.stats.views)} views</span>
                          <span>•</span>
                          <span>{formatNumber(post.stats.saves)} saves</span>
                        </div>
                      </div>
                    </button>

                    <div className="min-w-0 xl:w-[320px]">
                      <div className="rounded-2xl border border-border bg-elevated px-3 py-3 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                          Moderator context
                        </p>
                        <div className="mt-2 space-y-1.5 text-muted">
                          {post.moderation.isReported ? (
                            <p>
                              Flagged by users {formatNumber(post.moderation.reportCount)} time
                              {post.moderation.reportCount === 1 ? "" : "s"}.
                            </p>
                          ) : null}
                          {post.approval.rejectionReason ? (
                            <p className="text-foreground">
                              Rejection reason: {post.approval.rejectionReason}
                            </p>
                          ) : null}
                          {!post.moderation.isReported && !post.approval.rejectionReason ? (
                            <p>No extra moderation notes recorded yet.</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border pt-3">
                    <PostActions post={post} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted">
              {submittedSearch
                ? "No posts match your search in this moderation queue."
                : "This moderation queue is currently empty."}
            </div>
          )}

          {meta && <Pagination meta={meta} onPageChange={setPage} />}
        </CardContent>
      </Card>

      <PostDetailDialog post={selectedFresh} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
