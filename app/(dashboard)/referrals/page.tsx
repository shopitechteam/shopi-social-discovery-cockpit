"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { AlertTriangle, Gift, RefreshCw, X } from "lucide-react";
import {
  ADMIN_MARK_REFERRAL_REWARD_PAID,
  ADMIN_REFERRAL_OVERVIEW,
  ADMIN_REFERRAL_REWARDS,
  ADMIN_REFERRALS,
  ADMIN_REJECT_REFERRAL,
  ADMIN_RESTORE_REFERRAL,
} from "@/graphql/operations";
import {
  ReferralRewardStatus,
  ReferralStatus,
  type AdminReferralRewardRow,
  type AdminReferralRow,
  type AdminUser,
  type ReferralFlag,
} from "@/graphql/types";
import { displayName, formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/shared/pagination";

/**
 * The invite programme, from the paying side: who is owed a reward, and the
 * referred sellers behind it. Payouts come first — they are the queue someone
 * works through — and every reward links to its referrer's sellers, so the
 * check before paying ("are these five real?") is one click away.
 */

const PAGE_SIZE = 20;
const REFETCH = ["AdminReferralOverview", "AdminReferralRewards", "AdminReferrals"];

const REWARD_TABS: { key: string; label: string; status?: ReferralRewardStatus }[] = [
  { key: "pending", label: "To pay", status: ReferralRewardStatus.PENDING },
  { key: "paid", label: "Paid", status: ReferralRewardStatus.PAID },
  { key: "cancelled", label: "Withdrawn", status: ReferralRewardStatus.CANCELLED },
  { key: "all", label: "All" },
];

const REFERRAL_TABS: { key: string; label: string; status?: ReferralStatus }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Still posting", status: ReferralStatus.PENDING },
  { key: "qualified", label: "Qualified", status: ReferralStatus.QUALIFIED },
  { key: "rejected", label: "Rejected", status: ReferralStatus.REJECTED },
];

const REFERRAL_STATUS: Record<ReferralStatus, { label: string; variant: "secondary" | "success" | "destructive" }> = {
  [ReferralStatus.PENDING]: { label: "Still posting", variant: "secondary" },
  [ReferralStatus.QUALIFIED]: { label: "Qualified", variant: "success" },
  [ReferralStatus.REJECTED]: { label: "Rejected", variant: "destructive" },
};

const REWARD_STATUS: Record<ReferralRewardStatus, { label: string; variant: "warning" | "success" | "secondary" }> = {
  [ReferralRewardStatus.PENDING]: { label: "To pay", variant: "warning" },
  [ReferralRewardStatus.PAID]: { label: "Paid", variant: "success" },
  [ReferralRewardStatus.CANCELLED]: { label: "Withdrawn", variant: "secondary" },
};

const FLAG_LABELS: Record<ReferralFlag, string> = {
  SAME_PHONE_AS_REFERRER: "Same phone as referrer",
  LISTINGS_REMOVED: "Listings since removed",
  REFEREE_SUSPENDED: "Seller suspended",
  REFERRER_SUSPENDED: "Referrer suspended",
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

/** 254712345678 → +254 712 345 678 */
function formatPhone(phone?: string | null): string {
  if (!phone || !/^254\d{9}$/.test(phone)) return phone ?? "—";
  return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6, 9)} ${phone.slice(9)}`;
}

export default function ReferralsPage() {
  const [view, setView] = useState<"payouts" | "referrals">("payouts");
  const [referrerFilter, setReferrerFilter] = useState<AdminUser | null>(null);
  const { data: overviewData, refetch: refetchOverview } = useQuery(ADMIN_REFERRAL_OVERVIEW);
  const overview = overviewData?.adminReferralOverview;

  function showSellersOf(referrer: AdminUser) {
    setReferrerFilter(referrer);
    setView("referrals");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Referred sellers"
          value={overview?.totalReferrals}
          hint={
            overview
              ? `${overview.pending} still posting · ${overview.rejected} rejected · ${overview.referrers} referrers`
              : undefined
          }
        />
        <StatCard
          label="Qualified"
          value={overview?.qualified}
          hint={
            overview && overview.totalReferrals > 0
              ? `${Math.round((overview.qualified / overview.totalReferrals) * 100)}% of referred sellers`
              : overview
                ? `${overview.terms.minListings}+ live listings each`
                : undefined
          }
        />
        <StatCard
          label="To pay"
          value={overview ? formatKes(overview.rewardsPendingKes) : undefined}
          hint={overview ? `${overview.rewardsPending} rewards waiting` : undefined}
          highlight={!!overview && overview.rewardsPending > 0}
        />
        <StatCard
          label="Paid out"
          value={overview ? formatKes(overview.rewardsPaidKes) : undefined}
          hint={overview ? `${overview.rewardsPaid} rewards` : undefined}
        />
      </div>

      {overview && (
        <p className="text-xs text-muted">
          Terms: {formatKes(overview.terms.rewardKes)} for every {overview.terms.sellersPerReward}{" "}
          new sellers who reach {overview.terms.minListings} live listings. Codes can be added by
          hand up to {overview.terms.claimWindowDays} days after signup.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-border">
        {(
          [
            ["payouts", "Payouts"],
            ["referrals", "Referred sellers"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
              view === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {label}
            {key === "payouts" && overview && overview.rewardsPending > 0 && (
              <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs font-bold text-on-brand">
                {overview.rewardsPending}
              </span>
            )}
          </button>
        ))}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          aria-label="Refresh"
          onClick={() => void refetchOverview()}
        >
          <RefreshCw />
        </Button>
      </div>

      {view === "payouts" ? (
        <PayoutsView onShowSellers={showSellersOf} />
      ) : (
        <ReferralsView referrer={referrerFilter} onClearReferrer={() => setReferrerFilter(null)} />
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value?: number | string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(highlight && "border-primary/40")}>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted">{label}</p>
        {value === undefined ? (
          <Skeleton className="mt-2 h-7 w-20" />
        ) : (
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        )}
        {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function FilterChips<T extends { key: string; label: string }>({
  tabs,
  active,
  onChange,
}: {
  tabs: T[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            active === tab.key ? "bg-primary text-white" : "bg-subtle text-muted hover:text-foreground",
          )}
        >
          {tab.label}
        </button>
      ))}
    </>
  );
}

function Person({ user, fallback }: { user?: AdminUser | null; fallback: string }) {
  if (!user) return <span className="text-sm text-muted">{fallback}</span>;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Avatar src={user.profile?.avatar ?? undefined} name={displayName(user)} className="size-8" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{displayName(user)}</p>
        <p className="truncate text-xs text-muted">
          {user.username ? `@${user.username}` : user.email ?? user.id}
        </p>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

// ── Payouts ──────────────────────────────────────────────────────────────────

function PayoutsView({ onShowSellers }: { onShowSellers: (referrer: AdminUser) => void }) {
  const [tab, setTab] = useState("pending");
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<AdminReferralRewardRow | null>(null);
  const activeTab = REWARD_TABS.find((t) => t.key === tab) ?? REWARD_TABS[0];

  const { data, loading } = useQuery(ADMIN_REFERRAL_REWARDS, {
    variables: { page, limit: PAGE_SIZE, status: activeTab.status ?? null },
  });
  const rows = data?.adminReferralRewards.data ?? [];
  const meta = data?.adminReferralRewards.meta;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          tabs={REWARD_TABS}
          active={tab}
          onChange={(key) => {
            setTab(key);
            setPage(1);
          }}
        />
        {tab === "pending" && (
          <p className="ml-auto text-xs text-muted">Oldest first — whoever has waited longest.</p>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <Gift className="size-6 text-muted" />
              <p className="text-sm text-muted">
                {tab === "pending" ? "Nothing to pay right now." : "No rewards here yet."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Referrer</TableHead>
                  <TableHead>Reward</TableHead>
                  <TableHead>Qualified sellers</TableHead>
                  <TableHead>M-Pesa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const { reward, referrer } = row;
                  const status = REWARD_STATUS[reward.status];
                  return (
                    <TableRow key={reward.id}>
                      <TableCell>
                        <Person user={referrer} fallback="Deleted account" />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold text-foreground">{formatKes(reward.amountKes)}</p>
                        <p className="text-xs text-muted" title={formatDate(reward.createdAt)}>
                          #{reward.sequence} · earned {formatRelative(reward.createdAt)}
                        </p>
                      </TableCell>
                      <TableCell>
                        {referrer ? (
                          <button
                            type="button"
                            onClick={() => onShowSellers(referrer)}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            {row.qualifiedCount} qualified — review
                          </button>
                        ) : (
                          <span className="text-sm text-muted">{row.qualifiedCount}</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {reward.status === ReferralRewardStatus.PAID ? (
                          <>
                            <p className="text-foreground">{formatPhone(reward.paidToPhone)}</p>
                            <p className="text-xs text-muted">{reward.mpesaReference}</p>
                          </>
                        ) : row.payoutPhone ? (
                          formatPhone(row.payoutPhone)
                        ) : (
                          <span className="text-muted">No number yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {reward.status === ReferralRewardStatus.PAID && reward.paidAt && (
                          <p className="mt-1 text-xs text-muted">{formatRelative(reward.paidAt)}</p>
                        )}
                        {reward.status === ReferralRewardStatus.CANCELLED && reward.cancelReason && (
                          <p className="mt-1 max-w-48 text-xs text-muted">{reward.cancelReason}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {reward.status === ReferralRewardStatus.PENDING && (
                          <Button size="sm" onClick={() => setPaying(row)}>
                            Mark paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && <Pagination meta={meta} onPageChange={setPage} />}

      <MarkPaidDialog row={paying} onClose={() => setPaying(null)} />
    </div>
  );
}

function MarkPaidDialog({ row, onClose }: { row: AdminReferralRewardRow | null; onClose: () => void }) {
  const [reference, setReference] = useState("");
  const [phone, setPhone] = useState("");
  const [markPaid, { loading }] = useMutation(ADMIN_MARK_REFERRAL_REWARD_PAID, {
    refetchQueries: REFETCH,
  });

  function close() {
    setReference("");
    setPhone("");
    onClose();
  }

  async function handleConfirm() {
    if (!row) return;
    try {
      await markPaid({
        variables: {
          rewardId: row.reward.id,
          mpesaReference: reference,
          // Blank keeps the number on file.
          phone: phone.trim() || null,
        },
      });
      toast.success("Marked paid — the referrer has been notified");
      close();
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && !loading && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record M-Pesa payout</DialogTitle>
          <DialogDescription>
            Send {row ? formatKes(row.reward.amountKes) : ""} to{" "}
            {row?.referrer ? displayName(row.referrer) : "the referrer"} first, then record the
            transaction here. They get a notification with the M-Pesa code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mpesa-ref">M-Pesa transaction code</Label>
            <Input
              id="mpesa-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value.toUpperCase())}
              placeholder="SGR7K2LQ9P"
              autoComplete="off"
              className="font-mono uppercase"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mpesa-phone">Sent to</Label>
            <Input
              id="mpesa-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={row?.payoutPhone ? formatPhone(row.payoutPhone) : "0712 345 678"}
              inputMode="tel"
            />
            <p className="text-xs text-muted">
              {row?.payoutPhone
                ? "Leave blank if you sent it to the number on file."
                : "No number on file — enter the one you paid."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            loading={loading}
            disabled={reference.trim().length < 8 || (!row?.payoutPhone && !phone.trim())}
          >
            Mark paid
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Referred sellers ─────────────────────────────────────────────────────────

function ReferralsView({
  referrer,
  onClearReferrer,
}: {
  referrer: AdminUser | null;
  onClearReferrer: () => void;
}) {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<AdminReferralRow | null>(null);
  const activeTab = REFERRAL_TABS.find((t) => t.key === tab) ?? REFERRAL_TABS[0];

  const { data, loading } = useQuery(ADMIN_REFERRALS, {
    variables: {
      page,
      limit: PAGE_SIZE,
      status: activeTab.status ?? null,
      referrerId: referrer?.id ?? null,
    },
  });
  const [restore, { loading: restoring }] = useMutation(ADMIN_RESTORE_REFERRAL, {
    refetchQueries: REFETCH,
  });

  const rows = data?.adminReferrals.data ?? [];
  const meta = data?.adminReferrals.meta;

  async function handleRestore(referralId: string) {
    try {
      await restore({ variables: { referralId } });
      toast.success("Referral restored and rechecked");
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips
          tabs={REFERRAL_TABS}
          active={tab}
          onChange={(key) => {
            setTab(key);
            setPage(1);
          }}
        />
        {referrer && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-medium text-accent">
            Invited by {displayName(referrer)}
            <button
              type="button"
              onClick={() => {
                onClearReferrer();
                setPage(1);
              }}
              aria-label="Show every referrer"
              className="rounded-full hover:opacity-70"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <TableSkeleton />
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-12 text-center">
              <Gift className="size-6 text-muted" />
              <p className="text-sm text-muted">No referred sellers here yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Invited by</TableHead>
                  <TableHead>Live listings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const { referral } = row;
                  const status = REFERRAL_STATUS[referral.status];
                  return (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <Person user={row.referee} fallback="Deleted account" />
                      </TableCell>
                      <TableCell>
                        <Person user={row.referrer} fallback="Deleted account" />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-semibold tabular-nums text-foreground">
                          {row.liveListingCount}
                        </p>
                        {referral.status === ReferralStatus.QUALIFIED &&
                          referral.listingCount !== row.liveListingCount && (
                            <p className="text-xs text-muted">{referral.listingCount} at qualifying</p>
                          )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {row.flags.length > 0 && (
                          <div className="mt-1 flex flex-col gap-0.5">
                            {row.flags.map((flag) => (
                              <span
                                key={flag}
                                className="inline-flex items-center gap-1 text-xs font-medium text-secondary-strong"
                              >
                                <AlertTriangle className="size-3" />
                                {FLAG_LABELS[flag] ?? flag}
                              </span>
                            ))}
                          </div>
                        )}
                        {referral.status === ReferralStatus.REJECTED && referral.rejectionReason && (
                          <p className="mt-1 max-w-48 text-xs text-muted">{referral.rejectionReason}</p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted">
                        <span title={formatDate(referral.createdAt)}>{formatRelative(referral.createdAt)}</span>
                        <p className="text-xs">{referral.source === "CODE" ? `typed code ${referral.code}` : "via link"}</p>
                      </TableCell>
                      <TableCell className="text-right">
                        {referral.status === ReferralStatus.REJECTED ? (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={restoring}
                            onClick={() => void handleRestore(referral.id)}
                          >
                            Restore
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setRejecting(row)}>
                            Reject
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {meta && <Pagination meta={meta} onPageChange={setPage} />}

      <RejectDialog row={rejecting} onClose={() => setRejecting(null)} />
    </div>
  );
}

function RejectDialog({ row, onClose }: { row: AdminReferralRow | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [reject, { loading }] = useMutation(ADMIN_REJECT_REFERRAL, { refetchQueries: REFETCH });

  function close() {
    setReason("");
    onClose();
  }

  async function handleConfirm() {
    if (!row) return;
    try {
      await reject({ variables: { referralId: row.referral.id, reason } });
      toast.success("Referral rejected");
      close();
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && !loading && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject this referral?</DialogTitle>
          <DialogDescription>
            {row?.referee ? displayName(row.referee) : "This seller"} will stop counting for{" "}
            {row?.referrer ? displayName(row.referrer) : "the referrer"}. If that leaves an unpaid
            reward short, it is withdrawn. Paid rewards are never touched. The reason is only shown
            to admins.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="reject-reason">Reason</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Same person as the referrer; listings copied from another seller"
            rows={3}
            maxLength={300}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleConfirm()}
            loading={loading}
            disabled={reason.trim().length < 3}
          >
            Reject referral
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
