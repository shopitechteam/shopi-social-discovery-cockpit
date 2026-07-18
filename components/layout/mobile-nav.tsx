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
  MessagesSquare,
  ShieldCheck,
  Siren,
  Trophy,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  { href: "/users", label: "Users", icon: Users },
  { href: "/creators", label: "Creators", icon: Trophy },
  { href: "/growth", label: "Growth", icon: ChartNoAxesCombined },
  { href: "/categories", label: "Categories", icon: FolderTree },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
  { href: "/locations", label: "Locations", icon: Map },
  { href: "/system", label: "System", icon: Activity },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu">
          <Menu />
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
