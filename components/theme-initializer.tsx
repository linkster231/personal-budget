"use client";

import { useEffect } from "react";
import { useBudget } from "@/lib/store";

/**
 * Applies the user's saved theme on mount and whenever it changes.
 * Lives on the client — there will be a tiny FOUC on first paint, acceptable
 * for a personal tool. (A blocking inline script would eliminate it.)
 */
export function ThemeInitializer() {
  const theme = useBudget((s) => s.settings.theme);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => {
        root.classList.remove("dark", "light");
        if (mq.matches) root.classList.add("dark");
      };
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    root.classList.add(theme);
  }, [theme]);

  return null;
}
