"use client";

import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { LifeBuoy } from "lucide-react";
import { ADMIN_TRIGGER_MEDIA_RECOVERY } from "@/graphql/operations";
import { Button } from "@/components/ui/button";

/** Posts whose status may change once recovered media finishes processing. */
const REFETCH = ["AdminContent", "AdminDashboardStats", "PendingApprovalContent"];

/**
 * Runs the same recovery sweep the API does on boot: re-queues R2 image
 * processing and Mux sync for uploads stuck 10+ minutes. Safe to press
 * repeatedly — it only enqueues work for assets that are still stranded.
 */
export function MediaRecoveryButton() {
  const [trigger, { loading }] = useMutation(ADMIN_TRIGGER_MEDIA_RECOVERY, {
    refetchQueries: REFETCH,
  });

  async function handleTrigger() {
    try {
      const { data } = await trigger();
      const summary = data?.adminTriggerMediaRecovery;
      if (!summary) return;

      const queued = summary.imageJobs + summary.videoJobs + summary.tiktokJobs;
      if (queued === 0 && summary.replayed === 0) {
        toast.success("Media recovery ran — nothing was stuck");
        return;
      }

      toast.success("Media recovery triggered", {
        description: [
          `${summary.imageJobs} image${summary.imageJobs === 1 ? "" : "s"} → R2`,
          `${summary.videoJobs} video${summary.videoJobs === 1 ? "" : "s"} → Mux`,
          summary.tiktokJobs > 0 && `${summary.tiktokJobs} TikTok`,
          summary.replayed > 0 && `${summary.replayed} post${summary.replayed === 1 ? "" : "s"} reconciled`,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Media recovery failed");
    }
  }

  return (
    <Button
      variant="outline"
      onClick={() => void handleTrigger()}
      loading={loading}
      title="Re-queue R2 and Mux processing for uploads stuck 10+ minutes"
    >
      {!loading && <LifeBuoy />}
      {loading ? "Recovering..." : "Trigger media recovery"}
    </Button>
  );
}
