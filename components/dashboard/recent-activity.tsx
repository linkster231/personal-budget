"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget } from "@/lib/store";
import { formatCurrency } from "@/lib/format";

export function RecentActivity({ limit = 6 }: { limit?: number }) {
  const entries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const categories = useBudget((s) => s.categories);
  const sources = useBudget((s) => s.incomeSources);
  const currency = useBudget((s) => s.settings.currency);

  const feed = [
    ...entries.map((e) => ({
      kind: "income" as const,
      id: e.id,
      date: e.date,
      amount: e.amount,
      label: sources.find((s) => s.id === e.sourceId)?.name ?? "Income",
    })),
    ...expenses.map((e) => ({
      kind: "expense" as const,
      id: e.id,
      date: e.date,
      amount: e.amount,
      label: categories.find((c) => c.id === e.categoryId)?.name ?? "Expense",
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {feed.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            No activity yet. Log your first income or expense to see it here.
          </p>
        ) : (
          <ul className="divide-y">
            {feed.map((f) => (
              <li key={`${f.kind}-${f.id}`} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-medium">{f.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
                <span
                  className={
                    f.kind === "income"
                      ? "font-semibold text-success num-tabular"
                      : "font-semibold num-tabular"
                  }
                >
                  {f.kind === "income" ? "+" : "−"}
                  {formatCurrency(f.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
