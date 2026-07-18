"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserRole, type AdminUser } from "@/graphql/types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AdminUser | null;

  setAuth: (payload: { accessToken: string; refreshToken: string; user: AdminUser }) => void;
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setAuth({ accessToken, refreshToken, user }) {
        set({ accessToken, refreshToken, user });
      },

      setTokens({ accessToken, refreshToken }) {
        set({ accessToken, refreshToken });
      },

      clearAuth() {
        set({ accessToken: null, refreshToken: null, user: null });
      },

      isAuthenticated() {
        return !!get().accessToken;
      },

      isAdmin() {
        const user = get().user;
        if (!user) return false;
        return user.roles?.includes(UserRole.ADMIN) || user.role === UserRole.ADMIN;
      },
    }),
    {
      name: "shopi-admin-auth",
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        user: s.user,
      }),
    },
  ),
);
