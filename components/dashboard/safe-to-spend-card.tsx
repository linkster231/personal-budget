"use client";

import { Wallet, AlertTriangle, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { safeToSpendToday } from "@/lib/safe-to-spend";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * The one number that matters most on a variable-income day: how much you
 * can spend today without blowing this month.
 */
export function SafeToSpendCard() {
  const hydrated = useHydrated();
  const state = useBudget();

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-20 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const result = safeToSpendToday(state, new Date());
  const currency = state.settings.currency;

  return (
    <Card className={cn(result.overspent && "border-destructive/40")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="h-4 w-4" />
          {result.overspent ? "Already over-committed" : "Safe to spend today"}
        </CardTitle>
        <CardDescription>
          Current month · {result.daysLeft} day{result.daysLeft === 1 ? "" : "s"} left
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.overspent ? (
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-1 h-6 w-6 flex-shrink-0 text-destructive" />
            <div>
              <div className="text-3xl font-semibold text-destructive num-tabular">
                {formatCurrency(result.remaining, currency)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Balance + expected income won&apos;t cover your scheduled expenses this month.
                Skip non-essential spending, log any missed income, or defer a bill.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-3xl font-semibold num-tabular">
              {formatCurrency(result.daily, currency)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/ day</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              That&apos;s {formatCurrency(result.remaining, currency)} across {result.daysLeft} remaining day
              {result.daysLeft === 1 ? "" : "s"}.
            </p>
          </div>
        )}
        <div className="flex items-center gap-4 border-t pt-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Expected expenses {formatCurrency(result.pendingExpense, currency)}
          </span>
          {result.pendingIncome > 0 && (
            <span>Expected income {formatCurrency(result.pendingIncome, currency)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
