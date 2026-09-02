"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { toast } from "sonner";
import { Rocket, Sparkles } from "lucide-react";
import {
  ADMIN_BOOST_CONTENT,
  ADMIN_CANCEL_BOOST,
  BOOST_PACKAGES,
} from "@/graphql/operations";
import { BoostTier, type AdminContent, type BoostPackage } from "@/graphql/types";
import { boostDurationDays, boostRunLabel } from "@/lib/boost";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const REFETCH = ["AdminContent", "AdminBoosts", "AdminDashboardStats", "PendingApprovalContent"];

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

/**
 * Grant or end a post's promotion.
 *
 * Picking a package writes the multiplier onto the post's stored feed score, so
 * the lift shows up in For You, Following, Nearby and Explore on the next query
 * — there is no separate "sponsored" rail to populate.
 */
export function PostBoostDialog({
  post,
  open,
  onOpenChange,
}: {
  post: AdminContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tier, setTier] = useState<BoostTier | null>(null);
  const [durationDays, setDurationDays] = useState<string>("");
  const [note, setNote] = useState("");

  const { data: packageData, loading: loadingPackages } = useQuery(BOOST_PACKAGES, {
    skip: !open,
  });
  const [boostContent, { loading: boosting }] = useMutation(ADMIN_BOOST_CONTENT, {
    refetchQueries: REFETCH,
  });
  const [cancelBoost, { loading: cancelling }] = useMutation(ADMIN_CANCEL_BOOST, {
    refetchQueries: REFETCH,
  });

  const packages: BoostPackage[] = packageData?.boostPackages ?? [];
  const activeBoost = post?.boost?.isBoosted ? post.boost : null;

  // Reopening on a boosted post shows the campaign as it actually stands — the
  // tier bought and the duration it was bought for — rather than resetting to
  // the package default, which would silently shorten a custom run on save.
  useEffect(() => {
    if (!open) return;
    setTier(activeBoost?.tier ?? null);
    setDurationDays(activeBoost ? (boostDurationDays(activeBoost)?.toString() ?? "") : "");
    setNote("");
  }, [open, activeBoost]);

  if (!post) return null;

  const selected = packages.find((pkg) => pkg.tier === tier) ?? null;

  async function handleBoost() {
    if (!post || !tier) {
      toast.error("Pick a package first");
      return;
    }
    const days = durationDays.trim() ? Number(durationDays) : null;
    if (days !== null && (!Number.isFinite(days) || days < 1)) {
      toast.error("Duration must be a whole number of days");
      return;
    }
    try {
      await boostContent({
        variables: { contentId: post.id, tier, durationDays: days, note: note.trim() || null },
      });
      toast.success(`Boosted — ${selected?.name ?? tier} promotion is live`);
      onOpenChange(false);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function handleCancel() {
    const boostId = post?.boost?.boostId;
    if (!boostId) return;
    try {
      await cancelBoost({ variables: { boostId } });
      toast.success("Boost ended — the post is back to organic ranking");
      onOpenChange(false);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Boost “{post.title}”</DialogTitle>
          <DialogDescription>
            A boost multiplies the post&apos;s feed score, so it climbs For You, Following, Nearby
            and Explore for the length of the campaign. The stronger the package, the bigger the
            lift.
          </DialogDescription>
        </DialogHeader>

        {activeBoost && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-subtle p-3">
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 text-accent" />
              <span className="font-medium capitalize text-foreground">{activeBoost.tier}</span>
              <span className="text-muted">
                ×{activeBoost.multiplier} · {boostRunLabel(activeBoost) ?? "running"} · ends{" "}
                {activeBoost.expiresAt
                  ? new Date(activeBoost.expiresAt).toLocaleDateString()
                  : "—"}
              </span>
            </div>
            <Button variant="outline" onClick={handleCancel} loading={cancelling}>
              End boost
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {loadingPackages && <p className="text-sm text-muted">Loading packages…</p>}
          {packages.map((pkg) => {
            const checked = tier === pkg.tier;
            return (
              <label
                key={pkg.tier}
                className={`flex cursor-pointer items-start justify-between gap-3 rounded-xl border p-3 transition-colors ${
                  checked ? "border-primary/50 bg-primary-soft" : "border-border hover:bg-subtle"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{pkg.name}</p>
                    <Badge variant="accent">×{pkg.multiplier} reach</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted">{pkg.description}</p>
                  <p className="mt-1 text-xs text-muted">
                    {pkg.durationDays} days · {formatKes(pkg.priceKes)}
                  </p>
                </div>
                <input
                  type="radio"
                  name="boost-tier"
                  className="mt-1 size-4 shrink-0 accent-[#d81470]"
                  checked={checked}
                  onChange={() => setTier(pkg.tier)}
                />
              </label>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="boost-duration">
              Duration in days {selected && `(package default ${selected.durationDays})`}
            </Label>
            <Input
              id="boost-duration"
              type="number"
              min={1}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder={selected ? String(selected.durationDays) : "Package default"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="boost-note">Internal note (optional)</Label>
            <Textarea
              id="boost-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid via M-Pesa, ref QWE123"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleBoost} loading={boosting} disabled={!tier}>
            <Rocket />
            {activeBoost ? "Replace boost" : "Start boost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
