"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clapperboard,
  Users,
  FolderTree,
  Siren,
  Trophy,
  ChartNoAxesCombined,
  MessagesSquare,
  Map,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/moderation", label: "Moderation", icon: Siren },
  { href: "/posts", label: "Posts", icon: Clapperboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/creators", label: "Creators", icon: Trophy },
  { href: "/growth", label: "Growth", icon: ChartNoAxesCombined },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/locations", label: "Locations", icon: Map },
  { href: "/system", label: "System", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-elevated md:flex">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <img
          src="/icon.svg"
          alt="Shopi"
          width={36}
          height={36}
          className="size-9 shrink-0"
        />
        <div>
          <p className="text-sm font-bold leading-tight text-foreground">Shopi Admin</p>
          <p className="text-xs text-muted">Platform control</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-soft text-primary-strong"
                  : "text-muted hover:bg-subtle hover:text-foreground",
              )}
            >
              <Icon className="size-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <p className="px-5 py-4 text-xs text-placeholder">Shopi social commerce</p>
    </aside>
  );
}
