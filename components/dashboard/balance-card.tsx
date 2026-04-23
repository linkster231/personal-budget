"use client";

import { AlertTriangle, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { currentBalance, projectedBalance } from "@/lib/selectors";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { addDaysLocal, startOfDay } from "@/lib/schedule-engine";

/**
 * Shows the current running balance plus a 60-day projection. If the projected
 * line dips below zero, a warning appears at the date of first negative.
 */
export function BalanceCard() {
  const hydrated = useHydrated();
  const state = useBudget();

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-32 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const today = startOfDay(new Date());
  const rangeStart = today;
  const rangeEnd = addDaysLocal(today, 60);
  const curr = currentBalance(state);
  const projection = projectedBalance(state, rangeStart, rangeEnd, today);
  const firstNegative = projection.find((p) => p.balance < 0);

  const data = projection.map((p) => ({
    date: p.date,
    balance: Math.round(p.balance),
    label: new Date(p.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Balance
            </CardTitle>
            <CardDescription>Current + projected through 60 days</CardDescription>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Today
            </div>
            <div className="text-2xl font-semibold num-tabular">{formatCurrency(curr, state.settings.currency)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="h-40 w-full"
          role="img"
          aria-label={(() => {
            if (data.length === 0) return "Balance projection chart with no data.";
            const first = data[0];
            const last = data[data.length - 1];
            const min = data.reduce((m, p) => (p.balance < m.balance ? p : m), first);
            const parts = [
              `Projected balance over the next ${data.length} days.`,
              `Starting at ${formatCurrency(first.balance, state.settings.currency)} on ${first.label}.`,
              `Ending at ${formatCurrency(last.balance, state.settings.currency)} on ${last.label}.`,
            ];
            if (min.balance < first.balance) {
              parts.push(`Low point of ${formatCurrency(min.balance, state.settings.currency)} on ${min.label}.`);
            }
            return parts.join(" ");
          })()}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={10}
                tickFormatter={(v) => formatCurrencyCompact(v).replace(/^\$/, "")}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
                formatter={(v: number) => formatCurrency(v, state.settings.currency)}
                labelFormatter={(l) => l}
              />
              <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" fill="url(#balanceGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {firstNegative && (
          <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <div className="min-w-0">
              <div className="font-medium text-destructive">Projected overdraft</div>
              <div className="text-xs text-destructive/80">
                Without a change, your balance dips below zero on{" "}
                {new Date(firstNegative.date + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
                {" "}({formatCurrency(firstNegative.balance, state.settings.currency)}).
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
