import { Clapperboard, ImageIcon, Music2, Type } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ContentSource, ContentType, type AdminContent } from "@/graphql/types";

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
