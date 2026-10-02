import { Clapperboard, Gift, ImageIcon, Music2, Type } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { displayName } from "@/lib/format";
import {
  ContentSource,
  ContentType,
  ReferralStatus,
  type AdminContent,
  type AdminReferredBy,
} from "@/graphql/types";

/** "by Jane Doe", or a note that the inviter's account is gone. */
export function referrerLabel(referredBy: AdminReferredBy): string {
  return referredBy.referrer ? `by ${displayName(referredBy.referrer)}` : "by a deleted account";
}

/**
 * Whether the post's seller joined through someone's invite, with the inviter
 * underneath. A referred seller's live listings count toward that inviter's
 * reward, so it is worth knowing while approving.
 */
export function ReferredBadge({ post }: { post: Pick<AdminContent, "creator"> }) {
  if (!post.creator) {
    return (
      <span className="text-sm text-muted" title="Creator account not found">
        —
      </span>
    );
  }

  const referredBy = post.creator.referredBy;
  if (!referredBy) return <span className="text-sm text-muted">No</span>;

  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge className="flex w-fit items-center gap-1">
        <Gift className="size-3.5" />
        Yes
      </Badge>
      <span
        className="max-w-[140px] truncate text-[11px] text-muted"
        title={referredBy.referrer?.email ?? undefined}
      >
        {referrerLabel(referredBy)}
      </span>
      {referredBy.status === ReferralStatus.REJECTED && (
        <span className="text-[11px] text-error">referral rejected</span>
      )}
    </div>
  );
}

/** The media type. Always VIDEO or IMAGE — a TikTok import is still a video. */
export function PostTypeBadge({ post }: { post: Pick<AdminContent, "type"> }) {
  const { label, Icon } =
    post.type === ContentType.VIDEO
      ? { label: "Video", Icon: Clapperboard }
      : post.type === ContentType.IMAGE
        ? { label: "Image", Icon: ImageIcon }
        : { label: "Text", Icon: Type };
  return (
    <Badge variant="secondary" className="flex w-fit items-center gap-1">
      <Icon className="size-3.5" />
      {label}
    </Badge>
  );
}

/**
 * Whether the post was made from a TikTok video.
 *
 * `true`/`false` come from `isTiktokImport`. TIKTOK_EMBED posts predate the flag
 * but are TikTok imports by definition, so they read as true. Anything else
 * with no stored value was published before this was recorded, so it is
 * `null` ("not recorded") rather than a guessed false.
 */
export function isTiktokImport(
  post: Pick<AdminContent, "source" | "isTiktokImport">,
): boolean | null {
  if (post.isTiktokImport === true || post.source === ContentSource.TIKTOK_EMBED) return true;
  if (post.isTiktokImport === false) return false;
  return null;
}

export function TiktokImportBadge({
  post,
}: {
  post: Pick<AdminContent, "source" | "isTiktokImport">;
}) {
  const value = isTiktokImport(post);
  if (value === true) {
    return (
      <Badge className="flex w-fit items-center gap-1">
        <Music2 className="size-3.5" />
        Yes
      </Badge>
    );
  }
  if (value === false) return <span className="text-sm text-muted">No</span>;
  return (
    <span className="text-sm text-muted" title="Posted before this was recorded">
      —
    </span>
  );
}
