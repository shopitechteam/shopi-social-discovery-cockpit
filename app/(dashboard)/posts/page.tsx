"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Search, Flag } from "lucide-react";
import { ADMIN_CONTENT, ADMIN_DASHBOARD_STATS } from "@/graphql/operations";
import { ContentStatus, type AdminContent } from "@/graphql/types";
import { formatRelative, formatNumber, formatPrice, displayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import { PostThumb } from "@/components/posts/post-thumb";
import { PostActions } from "@/components/posts/post-actions";
import { PostDetailDialog } from "@/components/posts/post-detail-dialog";

type TabKey = "pending" | "all" | ContentStatus;

const TABS: { key: TabKey; label: string; status?: ContentStatus }[] = [
  { key: "pending", label: "Pending", status: ContentStatus.PENDING_REVIEW },
  { key: "all", label: "All posts" },
  { key: ContentStatus.ACTIVE, label: "Live", status: ContentStatus.ACTIVE },
  { key: ContentStatus.PROCESSING, label: "Processing", status: ContentStatus.PROCESSING },
  { key: ContentStatus.UNDER_REVIEW, label: "Hidden", status: ContentStatus.UNDER_REVIEW },
  { key: ContentStatus.REJECTED, label: "Rejected", status: ContentStatus.REJECTED },
  { key: ContentStatus.REMOVED, label: "Removed", status: ContentStatus.REMOVED },
  { key: ContentStatus.FAILED, label: "Failed", status: ContentStatus.FAILED },
];

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

export default function PostsPage() {
  const [tab, setTab] = useState<TabKey>("pending");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [selected, setSelected] = useState<AdminContent | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const { data, loading } = useQuery(ADMIN_CONTENT, {
    variables: {
      page,
      limit: PAGE_SIZE,
      status: activeTab.status ?? null,
      search: submittedSearch || null,
    },
  });

  const { data: statsData } = useQuery(ADMIN_DASHBOARD_STATS);
  const pendingCount = statsData?.adminDashboardStats.pendingReviewContent ?? 0;

  const posts = useMemo(() => data?.adminContent.data ?? [], [data]);
  const meta = data?.adminContent.meta;

  // Keep the detail dialog's post in sync with refetched data after an action.
  const selectedFresh = useMemo(
    () => (selected ? (posts.find((p) => p.id === selected.id) ?? selected) : null),
    [selected, posts],
  );

  function switchTab(next: TabKey) {
    setTab(next);
    setPage(1);
  }

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

  return (
    <div className="space-y-4">
      {/* Tabs + search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                tab === key
                  ? "bg-primary text-on-brand"
                  : "bg-subtle text-muted hover:text-foreground",
              )}
            >
              {label}
              {key === "pending" && pendingCount > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs font-bold",
                    tab === key ? "bg-white/25" : "bg-primary text-on-brand",
                  )}
                >
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or caption…"
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading && posts.length === 0 ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted">
              {submittedSearch
                ? "No posts match your search"
                : tab === "pending"
                  ? "Nothing waiting for approval — all caught up 🎉"
                  : "No posts here yet"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Engagement</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow
                    key={post.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelected(post);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <PostThumb post={post} />
                        <div className="min-w-0 max-w-[220px]">
                          <p className="truncate text-sm font-medium text-foreground">
                            {post.title}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {post.type.toLowerCase()}
                            {post.moderation.isReported && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-error">
                                <Flag className="size-3" />
                                {post.moderation.reportCount}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={post.creator?.profile?.avatar}
                          name={displayName(post.creator)}
                          className="size-7"
                        />
                        <span className="max-w-[140px] truncate text-sm text-foreground">
                          {displayName(post.creator)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatPrice(post.price)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <StatusBadge status={post.status} />
                        {post.status === ContentStatus.PROCESSING && post.approval.isApproved && (
                          <Badge variant="secondary">approved · awaiting media</Badge>
                        )}
                        {post.status === ContentStatus.ACTIVE && !post.isLive && (
                          <Badge variant="secondary">not live</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted">
                      {formatNumber(post.stats.views)} views · {formatNumber(post.stats.saves)} saves
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted">
                      {formatRelative(post.createdAt)}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <PostActions post={post} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && <Pagination meta={meta} onPageChange={setPage} />}

      <PostDetailDialog post={selectedFresh} open={detailOpen} onOpenChange={setDetailOpen} />
    </div>
  );
}
