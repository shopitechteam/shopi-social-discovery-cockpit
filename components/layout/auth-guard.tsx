"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { UserRole } from "@/graphql/types";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Client-side gate for the dashboard. Waits for the persisted store to
 * rehydrate, then kicks unauthenticated (or non-admin) visitors to /login.
 * Real enforcement is the API's @Authorized(ADMIN) checks — this is UX only.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  // True once the persisted auth store has been read from localStorage.
  const hydrated = useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );

  const isAdmin = !!user && (user.roles?.includes(UserRole.ADMIN) || user.role === UserRole.ADMIN);
  const allowed = !!accessToken && isAdmin;

  useEffect(() => {
    if (hydrated && !allowed) router.replace("/login");
  }, [hydrated, allowed, router]);

  if (!hydrated || !allowed) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-60 border-r border-border p-4 md:block">
          <Skeleton className="mb-6 h-8 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="mb-4 h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
