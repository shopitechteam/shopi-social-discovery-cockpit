/* eslint-disable @next/next/no-img-element */
import { Clapperboard, ImageIcon } from "lucide-react";
import { ContentType, type AdminContent } from "@/graphql/types";

export function postThumbUrl(post: AdminContent): string | null {
  const media = post.media?.[0];
  return (
    media?.thumbnailUrl ||
    media?.muxMeta?.thumbnailUrl ||
    media?.imageUrl ||
    post.tiktokEmbed?.coverImageUrl ||
    null
  );
}

export function PostThumb({ post, className = "h-14 w-10" }: { post: AdminContent; className?: string }) {
  const url = postThumbUrl(post);
  if (url) {
    return (
      <img
        src={url}
        alt={post.title}
        className={`${className} shrink-0 rounded-md border border-border object-cover`}
      />
    );
  }
  const Icon = post.type === ContentType.VIDEO ? Clapperboard : ImageIcon;
  return (
    <div
      className={`${className} flex shrink-0 items-center justify-center rounded-md border border-border bg-subtle text-muted`}
    >
      <Icon className="size-4" />
    </div>
  );
}
