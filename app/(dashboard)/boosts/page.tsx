"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { RefreshCw, Rocket } from "lucide-react";
import { ADMIN_BOOSTS, ADMIN_CANCEL_BOOST, BOOST_PACKAGES } from "@/graphql/operations";
import { BoostStatus, BoostTier, type BoostListItem } from "@/graphql/types";
import { formatDate, formatRelative, displayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";
import { PostThumb } from "@/components/posts/post-thumb";

const PAGE_SIZE = 20;

const TABS: { key: string; label: string; status?: BoostStatus }[] = [
  { key: "active", label: "Running", status: BoostStatus.ACTIVE },
  { key: "all", label: "All campaigns" },
  { key: "expired", label: "Expired", status: BoostStatus.EXPIRED },
  { key: "cancelled", label: "Cancelled", status: BoostStatus.CANCELLED },
];

const STATUS_VARIANT: Record<BoostStatus, "success" | "secondary" | "warning"> = {
  [BoostStatus.ACTIVE]: "success",
  [BoostStatus.EXPIRED]: "secondary",
  [BoostStatus.CANCELLED]: "warning",
};

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Campaign ledger: what is promoted right now, by whom, until when. */
export default function BoostsPage() {
  const [tab, setTab] = useState("active");
  const [page, setPage] = useState(1);
  const [tierFilter, setTierFilter] = useState<BoostTier | null>(null);

  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const { data, loading, refetch } = useQuery(ADMIN_BOOSTS, {
    variables: {
      page,
      limit: PAGE_SIZE,
      status: activeTab.status ?? null,
      tier: tierFilter,
    },
  });
  const { data: packageData } = useQuery(BOOST_PACKAGES);
  const [cancelBoost, { loading: cancelling }] = useMutation(ADMIN_CANCEL_BOOST, {
    refetchQueries: ["AdminBoosts", "AdminContent"],
  });

  const rows: BoostListItem[] = data?.adminBoosts.data ?? [];
  const meta = data?.adminBoosts.meta;
  const packages = packageData?.boostPackages ?? [];

  async function handleCancel(boostId: string) {
    try {
      await cancelBoost({ variables: { boostId } });
      toast.success("Boost ended");
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {packages.map((pkg) => (
          <Card key={pkg.tier}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{pkg.name}</p>
                <Badge variant="accent">×{pkg.multiplier}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted">{pkg.description}</p>
              <p className="mt-2 text-xs text-muted">
                {pkg.durationDays} days · {formatKes(pkg.priceKes)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.key
                ? "bg-primary text-white"
                : "bg-subtle text-muted hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {Object.values(BoostTier).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTierFilter((current) => (current === t ? null : t));
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                tierFilter === t
                  ? "bg-accent-soft text-accent"
                  : "bg-subtle text-muted hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
          <Button variant="ghost" size="icon" onClick={() => void refetch()} aria-label="Refresh">
            <RefreshCw />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <Rocket className="size-6 text-muted" />
              <p className="text-sm text-muted">
                No campaigns here yet. Boost a post from the Posts tab to start one.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Runs until</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ boost, content, creator }) => (
                  <TableRow key={boost.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {content ? (
                          <PostThumb post={content} />
                        ) : (
                          <div className="h-14 w-10 shrink-0 rounded-md border border-border bg-subtle" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {content?.title ?? "Post deleted"}
                          </p>
                          <p className="text-xs text-muted">
                            started {formatRelative(boost.startsAt)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {creator ? (
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={creator.profile?.avatar ?? undefined}
                            name={displayName(creator)}
                            className="size-7"
                          />
                          <span className="text-sm">{displayName(creator)}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="accent" className="capitalize">
                          {boost.tier}
                        </Badge>
                        <span className="text-xs text-muted">×{boost.multiplier}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[boost.status]} className="capitalize">
                        {boost.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="whitespace-nowrap text-sm text-muted"
                      title={formatDate(boost.endsAt)}
                    >
                      {formatRelative(boost.endsAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {boost.status === BoostStatus.ACTIVE && (
                        <Button
                          variant="outline"
                          onClick={() => void handleCancel(boost.id)}
                          loading={cancelling}
                        >
                          End boost
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && <Pagination meta={meta} onPageChange={setPage} />}
    </div>
  );
}
