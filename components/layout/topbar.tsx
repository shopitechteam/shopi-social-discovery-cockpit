"use client";

import { useRouter, usePathname } from "next/navigation";
import { useMutation } from "@apollo/client/react";
import { LogOut, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { LOGOUT } from "@/graphql/operations";
import { useAuthStore } from "@/stores/auth";
import { useThemeStore } from "@/stores/theme";
import { displayName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { MobileNav } from "@/components/layout/mobile-nav";

const TITLES: Record<string, string> = {
  "/": "Overview",
  "/moderation": "Moderation",
  "/posts": "Posts",
  "/users": "Users",
  "/creators": "Creators",
  "/growth": "Growth",
  "/categories": "Categories",
  "/conversations": "Conversations",
  "/locations": "Locations",
  "/system": "System",
};

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const [logout] = useMutation(LOGOUT);

  async function handleLogout() {
    try {
      if (refreshToken) await logout({ variables: { refreshToken } });
    } catch {
      // Best-effort server-side revoke; local sign-out always proceeds.
    } finally {
      clearAuth();
      toast.success("Signed out");
      router.replace("/login");
    }
  }

  const title =
    TITLES[pathname] ??
    Object.entries(TITLES).find(([href]) => href !== "/" && pathname.startsWith(href))?.[1] ??
    "Dashboard";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2">
        <MobileNav />
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun /> : <Moon />}
        </Button>

        <div className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3">
          <Avatar src={user?.profile?.avatar} name={displayName(user)} className="size-7" />
          <span className="hidden max-w-[140px] truncate text-sm font-medium text-foreground sm:block">
            {displayName(user)}
          </span>
        </div>

        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sign out">
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
