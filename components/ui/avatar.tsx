/* eslint-disable @next/next/no-img-element */
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Simple avatar with initials fallback. Uses a plain <img> — avatars come from
 * many third-party hosts (OAuth providers, CDN) and don't need optimization.
 */
function Avatar({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const [errored, setErrored] = React.useState(false);
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-xs font-bold text-primary-strong",
        className,
      )}
    >
      {src && !errored ? (
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        initials || "?"
      )}
    </div>
  );
}

export { Avatar };
