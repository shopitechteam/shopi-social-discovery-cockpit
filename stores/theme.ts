"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

/** Flip the .dark class on <html> in a single paint (transitions suppressed). */
function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.classList.toggle("dark", theme === "dark");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("theme-switching"));
  });
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",

      setTheme(theme) {
        set({ theme });
        applyTheme(theme);
      },

      toggle() {
        get().setTheme(get().theme === "dark" ? "light" : "dark");
      },
    }),
    {
      name: "shopi-admin-theme",
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
