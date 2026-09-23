"use client";

import { ExternalLink } from "lucide-react";
import type { AdminContent } from "@/graphql/types";
import { postPublicState, postPublicUrl } from "@/lib/post-url";
import { cn } from "@/lib/utils";

/**
 * Opens the post on the customer-facing site in a new tab.
 *
 * "icon" sits beside the title in the posts table; "button" is the full-width
 * control in the detail dialog. Posts the public can't see yet render disabled
 * with the reason on hover, rather than linking to a "not found" page.
 */
export function ViewPostLink({
  post,
  variant = "icon",
}: {
  post: AdminContent;
  variant?: "icon" | "button";
}) {
  const { isPublic, reason } = postPublicState(post);
  const label = "View on Shopi";

  const className =
    variant === "icon"
      ? "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-muted transition-colors"
      : "flex items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium transition-colors";

  if (!isPublic) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={`${label} (${reason})`}
        title={reason}
        onClick={(event) => event.stopPropagation()}
        className={cn(className, "cursor-not-allowed opacity-40", variant === "button" && "text-muted")}
      >
        <ExternalLink className="size-3.5" />
        {variant === "button" && label}
      </span>
    );
  }

  return (
    <a
      href={postPublicUrl(post)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      // The table row opens the detail dialog on click; this link must not.
      onClick={(event) => event.stopPropagation()}
      className={cn(
        className,
        variant === "icon"
          ? "hover:bg-subtle hover:text-primary"
          : "text-foreground hover:bg-subtle",
      )}
    >
      <ExternalLink className="size-3.5" />
      {variant === "button" && label}
    </a>
  );
}
