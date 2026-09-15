"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Clapperboard,
  Rocket,
  Users,
  FolderTree,
  Siren,
  Trophy,
  ChartNoAxesCombined,
  MessagesSquare,
  Megaphone,
  Map,
  Activity,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/moderation", label: "Moderation", icon: Siren },
  { href: "/posts", label: "Posts", icon: Clapperboard },
  { href: "/boosts", label: "Boosts", icon: Rocket },
  { href: "/users", label: "Users", icon: Users },
  { href: "/creators", label: "Creators", icon: Trophy },
  { href: "/social-proof", label: "Social proof", icon: Sparkles },
  { href: "/growth", label: "Growth", icon: ChartNoAxesCombined },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/team", label: "Shopi team", icon: Megaphone },
  { href: "/locations", label: "Locations", icon: Map },
  { href: "/system", label: "System", icon: Activity },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r border-border bg-elevated md:flex">
      <div className="flex items-center gap-2 px-4 py-4">
        <img
          src="/icon.svg"
          alt="Shopi"
          width={32}
          height={32}
          className="size-8 shrink-0"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold leading-tight text-foreground">Shopi Admin</p>
          <p className="truncate text-xs text-muted">Platform control</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-soft text-primary-strong"
                  : "text-muted hover:bg-subtle hover:text-foreground",
              )}
            >
              <Icon className="size-4.5 shrink-0" />
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>

      <p className="px-4 py-3 text-xs text-placeholder">Shopi social commerce</p>
    </aside>
  );
}
