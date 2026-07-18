"use client";

/* eslint-disable @next/next/no-img-element */
import { ExternalLink, Flag } from "lucide-react";
import { ContentSource, type AdminContent } from "@/graphql/types";
import { formatDate, formatNumber, formatPrice, displayName } from "@/lib/format";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PostActions } from "./post-actions";
import { postThumbUrl } from "./post-thumb";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right text-foreground">{children}</span>
    </div>
  );
}

export function PostDetailDialog({
  post,
  open,
  onOpenChange,
}: {
  post: AdminContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!post) return null;

  const playbackId = post.media?.[0]?.muxMeta?.playbackId;
  const thumb = postThumbUrl(post);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <StatusBadge status={post.status} />
            {post.status === "PROCESSING" && post.approval.isApproved && (
              <Badge variant="secondary">Approved · awaiting media</Badge>
            )}
            {post.moderation.isReported && (
              <Badge variant="destructive">
                <Flag className="mr-1 size-3" />
                {post.moderation.reportCount} reports
              </Badge>
            )}
          </div>
          <DialogTitle className="pr-6">{post.title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Avatar
              src={post.creator?.profile?.avatar}
              name={displayName(post.creator)}
              className="size-6"
            />
            {displayName(post.creator)}
            {post.creator?.email ? ` · ${post.creator.email}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-[200px_1fr]">
          {/* Media preview */}
          <div className="space-y-2">
            {playbackId ? (
              <video
                controls
                poster={thumb ?? undefined}
                className="aspect-[9/16] w-full rounded-lg border border-border bg-black object-contain"
                src={`https://stream.mux.com/${playbackId}/low.mp4`}
              />
            ) : thumb ? (
              <img
                src={thumb}
                alt={post.title}
                className="w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex aspect-[9/16] items-center justify-center rounded-lg border border-border bg-subtle text-sm text-muted">
                No preview
              </div>
            )}
            {post.source === ContentSource.TIKTOK_EMBED && post.tiktokEmbed?.shareUrl && (
              <a
                href={post.tiktokEmbed.shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium text-foreground hover:bg-subtle"
              >
                <ExternalLink className="size-3.5" />
                View on TikTok
              </a>
            )}
            {post.media.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {post.media.slice(1, 5).map((m, i) => {
                  const url = m.thumbnailUrl || m.imageUrl;
                  return url ? (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="size-12 rounded-md border border-border object-cover"
                    />
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="min-w-0">
            {post.caption && (
              <p className="mb-3 whitespace-pre-wrap text-sm text-foreground">{post.caption}</p>
            )}
            {post.hashtags.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1">
                {post.hashtags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            <div className="divide-y divide-border rounded-lg border border-border px-3 py-1">
              <Row label="Price">{formatPrice(post.price)}</Row>
              <Row label="Type">
                {post.type}
                {post.source === ContentSource.TIKTOK_EMBED ? " · TikTok embed" : ""}
              </Row>
              <Row label="Location">
                {[post.location?.placeName, post.location?.subregion, post.location?.county]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </Row>
              <Row label="Posted">{formatDate(post.createdAt)}</Row>
              <Row label="Engagement">
                {formatNumber(post.stats.views)} views · {formatNumber(post.stats.saves)} saves ·{" "}
                {formatNumber(post.stats.comments)} comments
              </Row>
              <Row label="Approved">
                {post.approval.isApproved ? `Yes · ${formatDate(post.approval.approvedAt)}` : "No"}
              </Row>
              {post.approval.rejectionReason && (
                <Row label="Rejection reason">{post.approval.rejectionReason}</Row>
              )}
              {post.processingError && <Row label="Processing error">{post.processingError}</Row>}
            </div>

            <div className="mt-4">
              <PostActions post={post} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
