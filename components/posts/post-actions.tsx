"use client";

import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { Check, EyeOff, Eye, Trash2, X } from "lucide-react";
import {
  APPROVE_CONTENT,
  REJECT_CONTENT,
  SET_CONTENT_LIVE,
  ADMIN_REMOVE_CONTENT,
} from "@/graphql/operations";
import { ContentStatus, type AdminContent } from "@/graphql/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Queries to refresh after any moderation action. */
const REFETCH = ["AdminContent", "AdminDashboardStats", "PendingApprovalContent"];

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

export function PostActions({ post }: { post: AdminContent }) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [removeReason, setRemoveReason] = useState("");

  const [approve, { loading: approving }] = useMutation(APPROVE_CONTENT, {
    refetchQueries: REFETCH,
  });
  const [reject, { loading: rejecting }] = useMutation(REJECT_CONTENT, {
    refetchQueries: REFETCH,
  });
  const [setLive, { loading: togglingLive }] = useMutation(SET_CONTENT_LIVE, {
    refetchQueries: REFETCH,
  });
  const [remove, { loading: removing }] = useMutation(ADMIN_REMOVE_CONTENT, {
    refetchQueries: REFETCH,
  });

  async function handleApprove() {
    try {
      const { data } = await approve({ variables: { contentId: post.id } });
      const approved = data?.approveContent;
      if (approved?.approval.isApproved && approved.status === ContentStatus.PROCESSING) {
        toast.success("Post approved. It will go live once media processing finishes.");
        return;
      }
      toast.success("Post approved");
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      toast.error("A rejection reason is required — the creator will see it");
      return;
    }
    try {
      await reject({ variables: { contentId: post.id, reason: rejectReason.trim() } });
      toast.success("Post rejected");
      setRejectOpen(false);
      setRejectReason("");
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function handleSetLive(live: boolean) {
    try {
      await setLive({ variables: { contentId: post.id, live } });
      toast.success(live ? "Post is now live" : "Post hidden from feeds");
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  async function handleRemove() {
    try {
      await remove({
        variables: { contentId: post.id, reason: removeReason.trim() || null },
      });
      toast.success("Post removed");
      setRemoveOpen(false);
      setRemoveReason("");
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  const status = post.status;
  const canApprove =
    status === ContentStatus.PENDING_REVIEW || status === ContentStatus.REJECTED;
  const canReject = status === ContentStatus.PENDING_REVIEW;
  const canHide = status === ContentStatus.ACTIVE;
  const canMakeLive =
    (status === ContentStatus.UNDER_REVIEW || status === ContentStatus.REMOVED) &&
    post.approval.isApproved;
  const canRemove = status !== ContentStatus.REMOVED;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {canApprove && (
        <Button size="sm" variant="success" onClick={handleApprove} loading={approving}>
          <Check />
          Approve
        </Button>
      )}
      {canReject && (
        <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)}>
          <X />
          Reject
        </Button>
      )}
      {canHide && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleSetLive(false)}
          loading={togglingLive}
        >
          <EyeOff />
          Hide
        </Button>
      )}
      {canMakeLive && (
        <Button
          size="sm"
          variant="success"
          onClick={() => handleSetLive(true)}
          loading={togglingLive}
        >
          <Eye />
          Make live
        </Button>
      )}
      {canRemove && (
        <Button
          size="sm"
          variant="ghost"
          className="text-error hover:bg-error-soft"
          onClick={() => setRemoveOpen(true)}
          aria-label="Remove post"
        >
          <Trash2 />
        </Button>
      )}

      {/* Reject dialog */}
      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => {
          setRejectOpen(open);
          if (!open) setRejectReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject “{post.title}”</DialogTitle>
            <DialogDescription>
              The post will be hidden and the creator will receive an email with your reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reject-reason">Reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Images are too blurry to verify the product"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} loading={rejecting}>
              Reject post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove dialog */}
      <Dialog
        open={removeOpen}
        onOpenChange={(open) => {
          setRemoveOpen(open);
          if (!open) setRemoveReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove “{post.title}”</DialogTitle>
            <DialogDescription>
              Takes the post down from the platform entirely. You can restore it later with “Make
              live” since its approval record is kept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="remove-reason">Reason (optional)</Label>
            <Textarea
              id="remove-reason"
              value={removeReason}
              onChange={(e) => setRemoveReason(e.target.value)}
              placeholder="Internal note / shown to the creator"
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} loading={removing}>
              Remove post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
