"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  ImageIcon,
  Loader2,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import {
  ADMIN_UPDATE_CONTENT_MEDIA,
  NOTIFY_IMAGE_UPLOADED,
  NOTIFY_VIDEO_UPLOADED,
  REQUEST_IMAGE_UPLOAD,
  REQUEST_VIDEO_UPLOAD,
} from "@/graphql/operations";
import {
  ContentType,
  MediaProcessingStatus,
  type AdminContent,
  type AdminContentMediaItemInput,
  type MediaItem,
} from "@/graphql/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const REFETCH = ["AdminContent", "AdminDashboardStats", "PendingApprovalContent"];

/** Matches the API's MAX_CONTENT_MEDIA. */
const MAX_MEDIA = 10;

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

/**
 * A slot in the working list: either a media item already on the post (tracked
 * by its original index, which is what the API's `keepIndex` refers to) or a
 * freshly uploaded MediaAsset waiting to be attached.
 */
type Slot =
  | { kind: "existing"; keepIndex: number; item: MediaItem }
  | { kind: "new"; mediaAssetId: string; previewUrl: string; fileName: string };

function slotThumb(slot: Slot): string | null {
  if (slot.kind === "new") return slot.previewUrl;
  return slot.item.thumbnailUrl || slot.item.muxMeta?.thumbnailUrl || slot.item.imageUrl || null;
}

/**
 * Media repair dialog.
 *
 * The rescue hatch for posts whose upload never finished — a worker was down, Mux
 * dropped the asset, Sharp never wrote the variants. The admin re-uploads here
 * and the post's media array is replaced wholesale; caption, price, stats and
 * moderation state are untouched.
 */
export function PostMediaDialog({
  post,
  open,
  onOpenChange,
}: {
  post: AdminContent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [requestImageUpload] = useMutation(REQUEST_IMAGE_UPLOAD);
  const [requestVideoUpload] = useMutation(REQUEST_VIDEO_UPLOAD);
  const [notifyImageUploaded] = useMutation(NOTIFY_IMAGE_UPLOADED);
  const [notifyVideoUploaded] = useMutation(NOTIFY_VIDEO_UPLOADED);
  const [updateMedia, { loading: saving }] = useMutation(ADMIN_UPDATE_CONTENT_MEDIA, {
    refetchQueries: REFETCH,
  });

  const isVideo = post?.type === ContentType.VIDEO;

  useEffect(() => {
    if (!open || !post) return;
    setSlots(
      (post.media ?? []).map((item, index) => ({ kind: "existing", keepIndex: index, item })),
    );
  }, [open, post]);

  // Object URLs for the local previews of pending uploads.
  useEffect(() => {
    return () => {
      slots.forEach((slot) => {
        if (slot.kind === "new") URL.revokeObjectURL(slot.previewUrl);
      });
    };
    // Revoke only on unmount — mid-session revocation would blank live previews.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(() => {
    if (!post) return false;
    const original = post.media ?? [];
    if (slots.length !== original.length) return true;
    return slots.some((slot, index) => slot.kind !== "existing" || slot.keepIndex !== index);
  }, [slots, post]);

  if (!post) return null;

  async function handleFiles(files: FileList | null) {
    if (!files?.length || !post) return;
    const remaining = (isVideo ? 1 : MAX_MEDIA) - slots.length;
    if (remaining <= 0) {
      toast.error(isVideo ? "A video post holds one media item" : `Limit is ${MAX_MEDIA} items`);
      return;
    }

    const picked = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      for (const file of picked) {
        const wantsVideo = file.type.startsWith("video/");
        if (wantsVideo !== isVideo) {
          toast.error(
            `This is a ${post.type} post — pick ${isVideo ? "a video" : "image"} file${isVideo ? "" : "s"}`,
          );
          continue;
        }

        const mediaAssetId = isVideo
          ? await uploadVideo(file)
          : await uploadImage(file);

        setSlots((prev) => [
          ...prev,
          {
            kind: "new",
            mediaAssetId,
            previewUrl: URL.createObjectURL(file),
            fileName: file.name,
          },
        ]);
      }
    } catch (err) {
      toast.error(errMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function uploadImage(file: File): Promise<string> {
    const { data } = await requestImageUpload({ variables: { mimeType: file.type } });
    const session = data?.requestImageUpload;
    if (!session) throw new Error("Could not start the image upload");

    const res = await fetch(session.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!res.ok) throw new Error(`Upload to storage failed (${res.status})`);

    await notifyImageUploaded({ variables: { mediaAssetId: session.mediaAssetId } });
    return session.mediaAssetId;
  }

  async function uploadVideo(file: File): Promise<string> {
    const { data } = await requestVideoUpload({
      variables: { corsOrigin: window.location.origin },
    });
    const session = data?.requestVideoUpload;
    if (!session) throw new Error("Could not start the video upload");

    const res = await fetch(session.uploadUrl, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    if (!res.ok) throw new Error(`Upload to Mux failed (${res.status})`);

    await notifyVideoUploaded({ variables: { mediaAssetId: session.mediaAssetId } });
    return session.mediaAssetId;
  }

  function move(index: number, delta: number) {
    setSlots((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeAt(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!post) return;
    if (!slots.length) {
      toast.error("Keep at least one media item — remove the post instead if it has none");
      return;
    }
    const items: AdminContentMediaItemInput[] = slots.map((slot) =>
      slot.kind === "existing"
        ? { keepIndex: slot.keepIndex }
        : { mediaAssetId: slot.mediaAssetId },
    );
    try {
      await updateMedia({ variables: { contentId: post.id, items } });
      toast.success("Media updated — new uploads go live as processing finishes");
      onOpenChange(false);
    } catch (err) {
      toast.error(errMessage(err));
    }
  }

  const atLimit = slots.length >= (isVideo ? 1 : MAX_MEDIA);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Media for “{post.title}”</DialogTitle>
          <DialogDescription>
            Re-upload, reorder or drop media when processing failed. Nothing else on the post
            changes. New uploads attach immediately and finish processing in the background.
          </DialogDescription>
        </DialogHeader>

        {post.processingError && (
          <div className="flex items-start gap-2 rounded-xl border border-error/40 bg-error-soft p-3 text-sm text-error">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>{post.processingError}</span>
          </div>
        )}

        <div className="space-y-2">
          {slots.length === 0 && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
              This post has no media. Add {isVideo ? "a video" : "an image"} below.
            </p>
          )}

          {slots.map((slot, index) => {
            const thumb = slotThumb(slot);
            const status =
              slot.kind === "new"
                ? "Uploaded — processing"
                : (slot.item.processingStatus as MediaProcessingStatus);
            const failed = status === MediaProcessingStatus.ERRORED;
            return (
              <div
                key={slot.kind === "new" ? slot.mediaAssetId : `existing-${slot.keepIndex}`}
                className="flex items-center gap-3 rounded-xl border border-border p-2"
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="size-14 shrink-0 rounded-lg border border-border object-cover"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg border border-border bg-subtle text-muted">
                    {isVideo ? <Clapperboard className="size-4" /> : <ImageIcon className="size-4" />}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {slot.kind === "new" ? slot.fileName : `Item ${slot.keepIndex + 1}`}
                  </p>
                  <p className={`text-xs ${failed ? "text-error" : "text-muted"}`}>{status}</p>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label="Move down"
                    disabled={index === slots.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 text-error hover:bg-error-soft"
                    aria-label="Remove media"
                    onClick={() => removeAt(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept={isVideo ? "video/*" : "image/*"}
          multiple={!isVideo}
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || atLimit}
          className="w-full"
        >
          {uploading ? <Loader2 className="animate-spin" /> : <Plus />}
          {uploading
            ? "Uploading…"
            : atLimit
              ? isVideo
                ? "Remove the current video to replace it"
                : `Limit of ${MAX_MEDIA} items reached`
              : isVideo
                ? "Add video"
                : "Add images"}
        </Button>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={!dirty || uploading}>
            Save media
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
