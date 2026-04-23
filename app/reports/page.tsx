"use client";

import { useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { SankeyFlow } from "@/components/reports/sankey-flow";
import { MonthOverMonth } from "@/components/reports/month-over-month";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { countByTag } from "@/lib/tags";
import { formatCurrency, monthKey } from "@/lib/format";

export default function ReportsPage() {
  const hydrated = useHydrated();
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const currency = useBudget((s) => s.settings.currency);

  const tagStats = useMemo(() => {
    if (!hydrated) return [] as Array<{ tag: string; count: number; total: number }>;
    const counts = countByTag(incomeEntries, expenses);
    const thisMonth = monthKey(new Date());
    const totals: Record<string, number> = {};
    for (const e of expenses) {
      if (monthKey(e.date) !== thisMonth) continue;
      for (const t of e.tags ?? []) {
        totals[t] = (totals[t] ?? 0) + e.amount;
      }
    }
    return Object.keys(counts)
      .map((t) => ({ tag: t, count: counts[t], total: totals[t] ?? 0 }))
      .sort((a, b) => b.total - a.total || b.count - a.count);
  }, [hydrated, incomeEntries, expenses]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          How you&apos;re actually using your money — drill beyond the dashboard.
        </p>
      </header>

      <CategoryDonut />

      <SankeyFlow />

      <MonthOverMonth />

      {/* Tags summary */}
      {tagStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Entries labeled with tags this month.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {tagStats.map((row) => (
                <li key={row.tag} className="flex items-center gap-3 px-5 py-3">
                  <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs">{row.tag}</span>
                  <span className="text-xs text-muted-foreground">{row.count} entr{row.count === 1 ? "y" : "ies"}</span>
                  <span className="ml-auto text-sm font-medium num-tabular">
                    {row.total > 0 ? formatCurrency(row.total, currency) : "—"}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {!hydrated && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Loading…
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
