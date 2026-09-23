import { ContentStatus, type AdminContent } from "@/graphql/types";
import { webUrl } from "@/lib/web-url";

/**
 * Where a post lives on the customer-facing Shopi site.
 *
 * Mirrors contentPath() in the web app: the stored slug when there is one,
 * otherwise `slugified-title-id`, which the API also resolves (it matches a
 * trailing ObjectId), so a post whose slug was never backfilled still opens.
 */

const WEB_LANG = "en";

function slugifyTitle(title?: string | null): string {
  const slug = (title ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "listing";
}

export function postPublicUrl(post: Pick<AdminContent, "id" | "title" | "slug">): string {
  const segment = post.slug?.trim() || `${slugifyTitle(post.title)}-${post.id}`;
  return webUrl(`/${WEB_LANG}/content/${encodeURIComponent(segment)}`);
}

/**
 * Whether the public page will actually show the post. The site serves only
 * live, active posts; for anything else the link would land on "not found",
 * so callers show it disabled with this reason instead.
 */
export function postPublicState(post: Pick<AdminContent, "status" | "isLive">): {
  isPublic: boolean;
  reason?: string;
} {
  if (post.status === ContentStatus.ACTIVE && post.isLive !== false) {
    return { isPublic: true };
  }
  return {
    isPublic: false,
    reason: "Not public yet — only live posts open on Shopi",
  };
}
