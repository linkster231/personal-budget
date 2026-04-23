"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorDot } from "@/components/ui/color-picker";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { allocate } from "@/lib/budget-engine";
import { formatCurrency, monthKey, prevMonthKey } from "@/lib/format";
import { incomeForMonth } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import type { Category, Strategy } from "@/lib/types";

/**
 * Fork the current state locally, let the user tweak strategy + targets +
 * baseline, show allocation diffs, and optionally apply.
 */
export default function WhatIfPage() {
  const hydrated = useHydrated();
  const router = useRouter();
  const currentState = useBudget();
  const bulkReplace = useBudget((s) => s.bulkReplace);

  // Build initial fork from current state. We only fork the fields that matter
  // for allocation — everything else stays intact when we "apply".
  const [strategy, setStrategy] = useState<Strategy>(currentState.settings.strategy);
  const [baseline, setBaseline] = useState(currentState.settings.baselineIncome);
  const [targets, setTargets] = useState<Record<string, number>>(() =>
    Object.fromEntries(currentState.categories.map((c) => [c.id, c.targetMonthly])),
  );

  const thisMonth = monthKey(new Date());
  const lastMonth = prevMonthKey(thisMonth);
  const lastMonthIncome = hydrated
    ? incomeForMonth(currentState.incomeEntries, lastMonth)
    : 0;
  const thisMonthIncome = hydrated
    ? incomeForMonth(currentState.incomeEntries, thisMonth)
    : 0;

  const currentCategories = currentState.categories;
  const whatifCategories: Category[] = useMemo(
    () => currentCategories.map((c) => ({ ...c, targetMonthly: targets[c.id] ?? c.targetMonthly })),
    [currentCategories, targets],
  );

  const currentResult = useMemo(
    () => allocationForScenario(currentState.settings.strategy, currentCategories, currentState.settings.baselineIncome, lastMonthIncome, thisMonthIncome),
    [currentState.settings.strategy, currentCategories, currentState.settings.baselineIncome, lastMonthIncome, thisMonthIncome],
  );
  const whatifResult = useMemo(
    () => allocationForScenario(strategy, whatifCategories, baseline, lastMonthIncome, thisMonthIncome),
    [strategy, whatifCategories, baseline, lastMonthIncome, thisMonthIncome],
  );

  const currency = currentState.settings.currency;

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading…</p>;

  function apply() {
    bulkReplace({
      ...currentState,
      settings: {
        ...currentState.settings,
        strategy,
        baselineIncome: baseline,
      },
      categories: currentState.categories.map((c) => ({
        ...c,
        targetMonthly: targets[c.id] ?? c.targetMonthly,
      })),
    });
    router.push("/budget");
  }

  function reset() {
    setStrategy(currentState.settings.strategy);
    setBaseline(currentState.settings.baselineIncome);
    setTargets(
      Object.fromEntries(currentState.categories.map((c) => [c.id, c.targetMonthly])),
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Link
          href="/budget"
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to Budget"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">What-if scenarios</h1>
          <p className="text-sm text-muted-foreground">
            Try changes without committing. Nothing here affects your data until you tap Apply.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button onClick={apply}>
            <Check className="h-4 w-4" />
            Apply
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Editable fork controls */}
        <Card>
          <CardHeader>
            <CardTitle>What-if values</CardTitle>
            <CardDescription>Tweak these to see the projected allocation change.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Strategy</Label>
              <div className="flex gap-1 rounded-lg bg-muted p-1">
                {(["last-month", "baseline", "priority"] as Strategy[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStrategy(s)}
                    className={cn(
                      "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                      strategy === s
                        ? "bg-background shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s === "last-month" ? "Last month" : s === "baseline" ? "Baseline" : "Priority"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wi-baseline">Baseline income</Label>
              <Input
                id="wi-baseline"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={baseline}
                onChange={(e) => setBaseline(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category targets</Label>
              <ul className="divide-y rounded-lg border">
                {currentCategories
                  .slice()
                  .sort((a, b) => a.priority - b.priority)
                  .map((c) => (
                    <li key={c.id} className="flex items-center gap-2 p-2">
                      <ColorDot hex={c.color} />
                      <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        className="h-8 w-24 text-sm"
                        value={targets[c.id] ?? 0}
                        onChange={(e) =>
                          setTargets({ ...targets, [c.id]: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </li>
                  ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Side-by-side allocation diff */}
        <Card>
          <CardHeader>
            <CardTitle>Allocation diff</CardTitle>
            <CardDescription>
              Current vs. what-if using {strategyLabel(strategy)} strategy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <ScenarioBlock title="Current" result={currentResult} currency={currency} />
              <ScenarioBlock title="What-if" result={whatifResult} currency={currency} highlight />
            </div>
            <div className="rounded-lg border p-2 text-xs">
              <div className="font-medium mb-1.5">Per-category change</div>
              <ul className="space-y-1">
                {currentCategories
                  .slice()
                  .sort((a, b) => a.priority - b.priority)
                  .map((c) => {
                    const before = currentResult.allocations[c.id] ?? 0;
                    const after = whatifResult.allocations[c.id] ?? 0;
                    const delta = after - before;
                    if (Math.abs(delta) < 0.005) return null;
                    return (
                      <li key={c.id} className="flex items-center gap-2">
                        <ColorDot hex={c.color} size={8} />
                        <span className="flex-1 truncate">{c.name}</span>
                        <span
                          className={cn(
                            "num-tabular font-medium",
                            delta > 0 ? "text-success" : "text-warning",
                          )}
                        >
                          {delta > 0 ? "+" : "−"}
                          {formatCurrency(Math.abs(delta), currency)}
                        </span>
                      </li>
                    );
                  })}
                {allDeltasZero(currentResult.allocations, whatifResult.allocations) && (
                  <li className="text-muted-foreground">No changes.</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function allocationForScenario(
  strategy: Strategy,
  categories: Category[],
  baseline: number,
  lastMonthIncome: number,
  thisMonthIncome: number,
) {
  const pool =
    strategy === "last-month"
      ? lastMonthIncome
      : strategy === "baseline"
        ? Math.max(thisMonthIncome, baseline)
        : thisMonthIncome;
  try {
    const out = allocate({ strategy, categories, availableIncome: pool, baselineIncome: baseline });
    return { pool, ...out };
  } catch (e) {
    return {
      pool,
      allocations: {} as Record<string, number>,
      unallocated: pool,
      note: (e as Error).message,
    };
  }
}

function ScenarioBlock({
  title,
  result,
  currency,
  highlight = false,
}: {
  title: string;
  result: { pool: number; unallocated: number; allocations: Record<string, number>; note: string };
  currency: string;
  highlight?: boolean;
}) {
  const allocated = Object.values(result.allocations).reduce((s, v) => s + v, 0);
  return (
    <div className={cn("rounded-lg border p-2", highlight && "border-primary bg-primary/5")}>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="text-base font-semibold num-tabular">{formatCurrency(result.pool, currency)}</div>
      <div className="text-[11px] text-muted-foreground">
        allocated {formatCurrency(allocated, currency)}
        {result.unallocated > 0 && (
          <> · left {formatCurrency(result.unallocated, currency)}</>
        )}
      </div>
    </div>
  );
}

function allDeltasZero(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (Math.abs((a[k] ?? 0) - (b[k] ?? 0)) >= 0.005) return false;
  }
  return true;
}

function strategyLabel(s: Strategy): string {
  return s === "last-month" ? "last-month" : s === "baseline" ? "baseline" : "priority";
}
