"use client";

import { useCallback, useRef } from "react";

/**
 * Hook that returns a triggerHaptic() function. On iOS 17.4+ this actually
 * fires real system haptic feedback by programmatically toggling an invisible
 * `<input type="checkbox" switch>` element. Elsewhere it's a no-op.
 *
 * Usage: const tap = useHaptic(); <button onClick={() => { tap(); realClickHandler(); }}>
 *
 * Based on the tijnjh/ios-haptics pattern (March 2026).
 */
export function useHaptic() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const ensureInput = useCallback(() => {
    if (inputRef.current) return inputRef.current;
    if (typeof document === "undefined") return null;
    const el = document.createElement("input");
    el.type = "checkbox";
    el.setAttribute("switch", ""); // iOS 17.4+ treats this as a haptic switch
    el.style.position = "absolute";
    el.style.opacity = "0";
    el.style.width = "1px";
    el.style.height = "1px";
    el.style.pointerEvents = "none";
    el.setAttribute("aria-hidden", "true");
    el.setAttribute("tabindex", "-1");
    document.body.appendChild(el);
    inputRef.current = el;
    return el;
  }, []);

  return useCallback(() => {
    const el = ensureInput();
    if (!el) return;
    try {
      el.click();
    } catch {
      // no-op on browsers where click() fails
    }
  }, [ensureInput]);
}
