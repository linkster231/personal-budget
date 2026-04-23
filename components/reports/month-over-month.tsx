"use client";

import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorDot } from "@/components/ui/color-picker";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { expensesForMonthByCategory } from "@/lib/selectors";
import { formatCurrency, monthKey, prevMonthKey, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Per-category month-over-month delta. Shows each category's current-month
 * spend vs. last-month spend with an up/down/flat arrow.
 */
export function MonthOverMonth() {
  const hydrated = useHydrated();
  const expenses = useBudget((s) => s.expenses);
  const categories = useBudget((s) => s.categories);
  const currency = useBudget((s) => s.settings.currency);

  const now = useMemo(() => new Date(), []);
  const curKey = monthKey(now);
  const prevKey = prevMonthKey(curKey);

  const rows = useMemo(() => {
    const cur = expensesForMonthByCategory(expenses, curKey);
    const prev = expensesForMonthByCategory(expenses, prevKey);
    return categories
      .map((c) => {
        const a = cur[c.id] ?? 0;
        const b = prev[c.id] ?? 0;
        const delta = a - b;
        const pct = b > 0 ? (delta / b) * 100 : a > 0 ? 100 : 0;
        return { ...c, current: a, previous: b, delta, pct };
      })
      .filter((r) => r.current > 0 || r.previous > 0)
      .sort((a, b) => b.current - a.current);
  }, [expenses, categories, curKey, prevKey]);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-40 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Month-over-month</CardTitle>
        <CardDescription>
          {monthLabel(curKey)} vs. {monthLabel(prevKey)}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No spending data to compare yet.</p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => {
              const up = r.delta > 0.005;
              const down = r.delta < -0.005;
              const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
              const tone = up ? "text-destructive" : down ? "text-success" : "text-muted-foreground";
              return (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <ColorDot hex={r.color} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">
                      was {formatCurrency(r.previous, currency)} · now{" "}
                      <span className="font-medium text-foreground">{formatCurrency(r.current, currency)}</span>
                    </div>
                  </div>
                  <div className={cn("flex items-center gap-1 text-sm font-medium num-tabular", tone)}>
                    <Icon className="h-4 w-4" />
                    <span>
                      {r.delta > 0 ? "+" : r.delta < 0 ? "−" : ""}
                      {formatCurrency(Math.abs(r.delta), currency)}
                    </span>
                    {r.previous > 0 && Math.abs(r.pct) >= 1 && (
                      <span className="text-[10px] font-normal">
                        ({r.pct > 0 ? "+" : ""}
                        {r.pct.toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
