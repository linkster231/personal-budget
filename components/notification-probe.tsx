"use client";

import { useEffect, useRef } from "react";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { pendingActionCount } from "@/lib/selectors";
import { notifyPending, notificationState } from "@/lib/notifications";

/**
 * On app load (once per session), if the user has granted notification
 * permission AND has items needing action, fire a single grouped notification.
 * Intentionally minimal — no polling, no background logic.
 */
export function NotificationProbe() {
  const hydrated = useHydrated();
  const enabled = useBudget((s) => s.settings.notificationsEnabled);
  const schedules = useBudget((s) => s.schedules);
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const skipped = useBudget((s) => s.skippedScheduleInstances);
  const fired = useRef(false);

  useEffect(() => {
    if (!hydrated || fired.current) return;
    if (!enabled) return;
    if (notificationState() !== "granted") return;
    const count = pendingActionCount(
      { schedules, incomeEntries, expenses, skippedScheduleInstances: skipped },
      new Date(),
    );
    if (count > 0) {
      notifyPending(count);
      fired.current = true;
    }
  }, [hydrated, enabled, schedules, incomeEntries, expenses, skipped]);

  return null;
}
