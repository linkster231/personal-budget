"use client";

import { Info } from "lucide-react";
import { ColorDot } from "@/components/ui/color-picker";
import { useBudget } from "@/lib/store";
import { previewSplit, totalPercent } from "@/lib/paycheck-split";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Compact, informational preview shown inside IncomeForm when user has
 * saved paycheck-split presets. Does NOT create any ledger entries.
 * Purely to help the user verify their plan as they log a paycheck.
 */
export function PaycheckSplitSection({ amount }: { amount: number }) {
  const presets = useBudget((s) => s.settings.paycheckSplitPresets);
  const categories = useBudget((s) => s.categories);
  const currency = useBudget((s) => s.settings.currency);

  if (!presets || presets.length === 0) return null;
  const preview = previewSplit(amount || 0, presets, categories);
  const total = totalPercent(presets);
  const over = total > 100;
  const under = total > 0 && total < 100;

  return (
    <div className="rounded-lg border border-dashed p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Info className="h-3.5 w-3.5" />
          Paycheck split preview
        </div>
        <span
          className={cn(
            "text-xs font-medium num-tabular",
            over ? "text-destructive" : under ? "text-warning" : "text-muted-foreground",
          )}
        >
          {total}% allocated
        </span>
      </div>
      {amount <= 0 ? (
        <p className="text-xs text-muted-foreground">
          Enter an amount above and we&apos;ll show how your presets would split it.
        </p>
      ) : (
        <ul className="space-y-1.5 text-xs">
          {preview.map((p) => (
            <li key={p.categoryId} className="flex items-center gap-2">
              <ColorDot hex={p.color} size={8} />
              <span className="min-w-0 flex-1 truncate">{p.categoryName}</span>
              <span className="text-muted-foreground">{p.percent}%</span>
              <span className="font-medium num-tabular">{formatCurrency(p.amount, currency)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[10px] text-muted-foreground">
        Informational only — nothing auto-posts. Adjust presets in Settings.
      </p>
    </div>
  );
}
