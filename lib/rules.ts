import type { PayeeRule } from "./types";

/**
 * Find the first rule whose pattern is contained in `text` (case-insensitive).
 * Returns undefined if nothing matches. Rules are scanned in `count DESC`
 * order so the most-frequently-used pattern wins when two could match.
 */
export function matchPayeeRule(
  text: string | undefined,
  rules: PayeeRule[],
): PayeeRule | undefined {
  if (!text) return undefined;
  const hay = text.toLowerCase();
  const sorted = rules.slice().sort((a, b) => b.count - a.count);
  return sorted.find((r) => {
    const pat = r.pattern.trim().toLowerCase();
    return pat.length > 0 && hay.includes(pat);
  });
}
