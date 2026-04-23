"use client";

/**
 * Thin wrapper over browser Notifications + Badging + Service Worker push.
 * Works in Safari (macOS + iOS 16.4+ installed PWA). No server-side push;
 * we only fire when the user opens the app.
 */

export type NotificationPermissionState = "default" | "granted" | "denied" | "unsupported";

export function notificationState(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotificationPermissionState;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission !== "default") return Notification.permission as NotificationPermissionState;
  const result = await Notification.requestPermission();
  return result as NotificationPermissionState;
}

/**
 * Fire a single notification summarizing pending items. Safe to call even if
 * permission hasn't been granted — we just no-op in that case.
 */
export function notifyPending(count: number): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (count <= 0) return;
  try {
    new Notification("Budget — items need logging", {
      body: `${count} scheduled item${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} waiting for you to confirm.`,
      icon: "/icon.svg",
      tag: "budget-pending",
    });
  } catch {
    // Some browsers restrict notifications outside of secure/installed contexts.
  }
}

/**
 * Set the app icon's badge count (iOS 16.4+ installed PWA, some desktop
 * browsers). Pass 0 to clear.
 */
export function setBadge(count: number): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & {
    setAppBadge?: (n?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0 && nav.setAppBadge) {
      void nav.setAppBadge(count);
    } else if (nav.clearAppBadge) {
      void nav.clearAppBadge();
    }
  } catch {
    // no-op
  }
}

/**
 * Register our minimal service worker. Only needed for badging + push in
 * standalone PWA mode. Calling before SW is available (SSR) is safe.
 */
export async function registerServiceWorker(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js");
  } catch {
    // Registration can fail in dev or if sw.js isn't served; ignore.
  }
}

/**
 * Fire a "time to check in" notification. Called on app open when the user
 * has opted into weekly reminders and it's been 7+ days since the last one.
 */
export function notifyWeeklyCheckin(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification("Budget — weekly check-in", {
      body: "Quick reminder to log anything you haven't recorded yet this week.",
      icon: "/icon.svg",
      tag: "budget-weekly",
    });
    localStorage.setItem("budget-lastWeeklyCheckin", new Date().toISOString());
  } catch {
    // ignore
  }
}

export function shouldFireWeeklyCheckin(): boolean {
  if (typeof localStorage === "undefined") return false;
  const last = localStorage.getItem("budget-lastWeeklyCheckin");
  if (!last) return true;
  const t = new Date(last).getTime();
  return Date.now() - t >= 7 * 24 * 60 * 60 * 1000;
}
