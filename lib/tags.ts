import type { Expense, IncomeEntry } from "./types";

/** Normalize: trim + lowercase. Tags are compared case-insensitively. */
export function normalizeTag(t: string): string {
  return t.trim().toLowerCase();
}

/** Unique sorted list of tags across all provided entries. */
export function allTags(
  income: IncomeEntry[],
  expenses: Expense[],
): string[] {
  const set = new Set<string>();
  for (const e of income) for (const t of e.tags ?? []) set.add(normalizeTag(t));
  for (const e of expenses) for (const t of e.tags ?? []) set.add(normalizeTag(t));
  return Array.from(set).filter(Boolean).sort();
}

export function countByTag(
  income: IncomeEntry[],
  expenses: Expense[],
): Record<string, number> {
  const acc: Record<string, number> = {};
  const bump = (t: string) => {
    const n = normalizeTag(t);
    if (n) acc[n] = (acc[n] ?? 0) + 1;
  };
  for (const e of income) (e.tags ?? []).forEach(bump);
  for (const e of expenses) (e.tags ?? []).forEach(bump);
  return acc;
}
