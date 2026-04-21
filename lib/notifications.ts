"use client";

/**
 * Thin wrapper over the browser Notifications API for our single "pending
 * items need logging" notification. Works in Safari (macOS + iOS 16.4+) as
 * long as the user has added the PWA to their Home Screen.
 *
 * We DO NOT do push notifications (would need a server). We only fire a
 * notification when the user opens the app and has items to act on.
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
