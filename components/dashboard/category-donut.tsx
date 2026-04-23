"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { expensesForMonthByCategory } from "@/lib/selectors";
import { formatCurrency, monthKey } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Current-month spending distribution. Shows top 6 categories by spend;
 * everything else collapses into an "Other" slice. Dual-purpose: big
 * visual + screen-reader-friendly table.
 */
export function CategoryDonut() {
  const hydrated = useHydrated();
  const expenses = useBudget((s) => s.expenses);
  const categories = useBudget((s) => s.categories);
  const currency = useBudget((s) => s.settings.currency);

  const data = useMemo(() => {
    const thisMonth = monthKey(new Date());
    const byCat = expensesForMonthByCategory(expenses, thisMonth);
    const rows = categories
      .map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color ?? "hsl(var(--muted-foreground))",
        amount: byCat[c.id] ?? 0,
      }))
      .filter((r) => r.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const top = rows.slice(0, 6);
    const rest = rows.slice(6);
    if (rest.length > 0) {
      top.push({
        id: "__other__",
        name: `Other (${rest.length})`,
        color: "hsl(var(--muted-foreground))",
        amount: rest.reduce((s, r) => s + r.amount, 0),
      });
    }
    return top;
  }, [expenses, categories]);

  const total = data.reduce((s, d) => s + d.amount, 0);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-48 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Spending by category</CardTitle>
        <CardDescription>This month · {formatCurrency(total, currency)} total</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nothing logged yet this month.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div
              className="h-40 w-40 flex-shrink-0"
              role="img"
              aria-label={`Donut chart of spending by category this month. ${data
                .map((d) => `${d.name}: ${formatCurrency(d.amount, currency)}`)
                .join(", ")}`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={70}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {data.map((d) => (
                      <Cell key={d.id} fill={d.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatCurrency(v, currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-full flex-1 space-y-1.5">
              {data.map((d) => {
                const pct = total > 0 ? (d.amount / total) * 100 : 0;
                return (
                  <li key={d.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: d.color }}
                      aria-hidden
                    />
                    <span className={cn("min-w-0 flex-1 truncate", d.id === "__other__" && "text-muted-foreground")}>
                      {d.name}
                    </span>
                    <span className="num-tabular font-medium">{formatCurrency(d.amount, currency)}</span>
                    <span className="w-8 text-right text-[11px] text-muted-foreground">{pct.toFixed(0)}%</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
