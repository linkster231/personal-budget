"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { monthKey, formatCurrencyCompact, formatCurrency } from "@/lib/format";

/**
 * 6-month cash flow: bars for income and expenses by month.
 */
export function CashFlowChart() {
  const hydrated = useHydrated();
  const income = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const currency = useBudget((s) => s.settings.currency);

  const data = useMemo(() => {
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(monthKey(d));
    }
    return months.map((m) => {
      const [y, mm] = m.split("-").map(Number);
      const label = new Date(y, mm - 1, 1).toLocaleDateString("en-US", { month: "short" });
      const inc = income.filter((e) => monthKey(e.date) === m).reduce((s, e) => s + e.amount, 0);
      const exp = expenses.filter((e) => monthKey(e.date) === m).reduce((s, e) => s + e.amount, 0);
      return { month: label, Income: Math.round(inc), Expenses: Math.round(exp) };
    });
  }, [income, expenses]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash flow</CardTitle>
        <CardDescription>Last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="h-56 w-full"
          role="img"
          aria-label={`Cash flow bar chart for the last 6 months. ${data
            .map((d) => `${d.month}: income ${formatCurrency(d.Income, currency)}, expenses ${formatCurrency(d.Expenses, currency)}`)
            .join("; ")}`}
        >
          {hydrated && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v) => formatCurrencyCompact(v).replace(/^\$/, "")}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    color: "hsl(var(--popover-foreground))",
                  }}
                  formatter={(v: number) => formatCurrencyCompact(v)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Income" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="hsl(var(--warning))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Screen-reader + no-JS fallback data table */}
        <table className="sr-only">
          <caption>Cash flow, last 6 months</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Income</th>
              <th>Expenses</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <td>{d.month}</td>
                <td>{formatCurrency(d.Income, currency)}</td>
                <td>{formatCurrency(d.Expenses, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
