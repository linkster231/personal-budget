import type { Category, PaycheckSplit } from "./types";

export type SplitPreview = {
  categoryId: string;
  categoryName: string;
  color?: string;
  percent: number;
  amount: number;
};

/**
 * Given a paycheck amount and saved split presets, produce a preview of
 * how the income would distribute across categories. INFORMATIONAL only —
 * no ledger changes happen. Users see this so they can verify their
 * budget plan before logging the income.
 */
export function previewSplit(
  amount: number,
  presets: PaycheckSplit[] | undefined,
  categories: Category[],
): SplitPreview[] {
  if (!presets || presets.length === 0) return [];
  return presets
    .map((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      return {
        categoryId: p.categoryId,
        categoryName: cat?.name ?? "(deleted)",
        color: cat?.color,
        percent: p.percent,
        amount: (amount * p.percent) / 100,
      };
    })
    .filter((p) => p.categoryName !== "(deleted)");
}

/** Total % across all presets; if > 100, the user over-allocated. */
export function totalPercent(presets: PaycheckSplit[] | undefined): number {
  if (!presets) return 0;
  return presets.reduce((s, p) => s + (p.percent || 0), 0);
}
