"use client";

import { useEffect, useRef } from "react";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { pendingActionCount } from "@/lib/selectors";
import {
  notifyPending,
  notificationState,
  setBadge,
  registerServiceWorker,
  notifyWeeklyCheckin,
  shouldFireWeeklyCheckin,
} from "@/lib/notifications";

/**
 * On app load: register service worker, set/clear app badge with pending
 * count, and optionally fire a grouped "items need logging" notification.
 * Also fires weekly check-in notification if that's enabled and 7+ days have
 * passed since the last one.
 */
export function NotificationProbe() {
  const hydrated = useHydrated();
  const enabled = useBudget((s) => s.settings.notificationsEnabled);
  const weekly = useBudget((s) => s.settings.weeklyReminderEnabled ?? false);
  const schedules = useBudget((s) => s.schedules);
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const skipped = useBudget((s) => s.skippedScheduleInstances);
  const firedPending = useRef(false);
  const firedWeekly = useRef(false);
  const swRegistered = useRef(false);

  useEffect(() => {
    if (!swRegistered.current) {
      void registerServiceWorker();
      swRegistered.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const count = pendingActionCount(
      { schedules, incomeEntries, expenses, skippedScheduleInstances: skipped },
      new Date(),
    );

    // Always try to set the badge when we have permission — not gated on
    // `enabled` because the badge is a much subtler UX signal.
    if (notificationState() === "granted") {
      setBadge(count);
    }

    if (enabled && notificationState() === "granted") {
      if (!firedPending.current && count > 0) {
        notifyPending(count);
        firedPending.current = true;
      }
      if (weekly && !firedWeekly.current && shouldFireWeeklyCheckin()) {
        notifyWeeklyCheckin();
        firedWeekly.current = true;
      }
    }
  }, [hydrated, enabled, weekly, schedules, incomeEntries, expenses, skipped]);

  return null;
}
