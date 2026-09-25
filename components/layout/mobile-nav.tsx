"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ChartNoAxesCombined,
  Clapperboard,
  FolderTree,
  LayoutDashboard,
  Map,
  Menu,
  Megaphone,
  MessagesSquare,
  ShieldCheck,
  Siren,
  Trophy,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NavBadge } from "@/components/layout/sidebar";
import { useTeamUnreadThreads } from "@/components/team/team-inbox-sync";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

export function MobileNav() {
  const pathname = usePathname();
  const teamUnread = useTeamUnreadThreads();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative md:hidden"
          aria-label={
            teamUnread > 0
              ? `Open navigation menu, ${teamUnread} unread Shopi team replies`
              : "Open navigation menu"
          }
        >
          <Menu />
          {/* The nav is hidden behind this button on phones, so flag unread here too. */}
          {teamUnread > 0 && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="left-0 top-0 h-screen w-[88vw] max-w-[320px] translate-x-0 translate-y-0 rounded-none border-0 border-r border-border bg-elevated p-0 shadow-2xl md:hidden">
        <DialogHeader className="border-b border-border px-5 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary text-on-brand">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Shopi Admin</DialogTitle>
              <DialogDescription>Platform control and operations</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <nav className="space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            const badge = href === "/team" ? teamUnread : 0;
            return (
              <DialogClose asChild key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-primary-strong"
                      : "text-muted hover:bg-subtle hover:text-foreground",
                  )}
                >
                  <Icon className="size-4.5" />
                  {label}
                  {badge > 0 && <NavBadge count={badge} label="unread replies" />}
                </Link>
              </DialogClose>
            );
          })}
        </nav>

        <p className="px-5 pb-5 pt-2 text-xs text-placeholder">Shopi social commerce</p>
      </DialogContent>
    </Dialog>
  );
}
