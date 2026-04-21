"use client";

import { useEffect, useState } from "react";
import { useBudget } from "./store";

/**
 * Zustand's `persist` middleware loads state from localStorage client-side.
 * During SSR and the first client render, state is default — so anything that
 * reads from store will flash empty. This hook returns `true` only once the
 * store has rehydrated from localStorage.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (useBudget.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    const unsub = useBudget.persist.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);
  return hydrated;
}
