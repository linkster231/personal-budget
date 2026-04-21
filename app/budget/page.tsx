"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryForm } from "@/components/forms/category-form";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { formatCurrency, monthKey, prevMonthKey, monthLabel } from "@/lib/format";
import { incomeForMonth } from "@/lib/selectors";
import { allocate } from "@/lib/budget-engine";
import { cn } from "@/lib/utils";
import type { Strategy } from "@/lib/types";

export default function BudgetPage() {
  const hydrated = useHydrated();
  const [addOpen, setAddOpen] = useState(false);

  const categories = useBudget((s) => s.categories);
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const currency = useBudget((s) => s.settings.currency);
  const strategy = useBudget((s) => s.settings.strategy);
  const baselineIncome = useBudget((s) => s.settings.baselineIncome);
  const setStrategy = useBudget((s) => s.setStrategy);
  const updateCategory = useBudget((s) => s.updateCategory);
  const removeCategory = useBudget((s) => s.removeCategory);

  const thisMonth = monthKey(new Date());
  const lastMonth = prevMonthKey(thisMonth);
  const lastMonthIncome = hydrated ? incomeForMonth(incomeEntries, lastMonth) : 0;
  const thisMonthIncome = hydrated ? incomeForMonth(incomeEntries, thisMonth) : 0;

  const pool =
    strategy === "last-month" ? lastMonthIncome : strategy === "baseline" ? Math.max(thisMonthIncome, baselineIncome) : thisMonthIncome;

  const preview = useMemo(() => {
    if (!hydrated) return null;
    try {
      return allocate({
        strategy,
        categories,
        availableIncome: pool,
        baselineIncome,
      });
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [hydrated, strategy, categories, pool, baselineIncome]);

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Budget plan</h1>
        <p className="text-sm text-muted-foreground">Pick a strategy, set targets, and see your allocation.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Strategy</CardTitle>
          <CardDescription>
            Pick how to allocate income. You can change this any time — nothing is locked in.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <StrategyPick
            value="last-month"
            current={strategy}
            onClick={() => setStrategy("last-month")}
            title="Budget last month's income"
            hint={`This month you would allocate ${formatCurrency(lastMonthIncome, currency)} (what you earned in ${monthLabel(lastMonth)}).`}
          />
          <StrategyPick
            value="baseline"
            current={strategy}
            onClick={() => setStrategy("baseline")}
            title="Minimum baseline"
            hint={`Plan against a floor of ${formatCurrency(baselineIncome, currency)} — surplus spills into savings.`}
          />
          <StrategyPick
            value="priority"
            current={strategy}
            onClick={() => setStrategy("priority")}
            title="Priority allocation"
            hint="Rank categories by priority; fund top-down until this month's income is spent."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Set monthly targets. Lower priority numbers fund first.</CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add category</DialogTitle>
              </DialogHeader>
              <CategoryForm onDone={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          {categories.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No categories yet.</p>
          ) : (
            <ul className="divide-y">
              {categories
                .slice()
                .sort((a, b) => a.priority - b.priority)
                .map((c) => {
                  const allocated = preview && !("error" in preview) ? preview.allocations[c.id] ?? 0 : 0;
                  return (
                    <li key={c.id} className="flex flex-col gap-3 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{c.name}</span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                            {c.kind}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Target {formatCurrency(c.targetMonthly, currency)} · priority {c.priority}
                          {preview && !("error" in preview) && (
                            <> · allocated <span className="font-semibold text-foreground">{formatCurrency(allocated, currency)}</span></>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] uppercase">Target</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            className="h-9 w-28 text-sm"
                            value={c.targetMonthly}
                            onChange={(e) => updateCategory(c.id, { targetMonthly: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] uppercase">Priority</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            className="h-9 w-16 text-sm"
                            value={c.priority}
                            onChange={(e) => updateCategory(c.id, { priority: parseInt(e.target.value, 10) || 1 })}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCategory(c.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Allocation preview</CardTitle>
          <CardDescription>
            Pool: {formatCurrency(pool, currency)} ·{" "}
            {strategy === "last-month"
              ? "from last month's income"
              : strategy === "baseline"
                ? "higher of baseline or this month"
                : "this month's income"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!preview ? null : "error" in preview ? (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <div className="flex items-center gap-2 font-medium text-warning">
                <Info className="h-4 w-4" />
                Strategy not wired up yet
              </div>
              <p className="mt-1 text-muted-foreground">{preview.error}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {preview.note}
              {preview.unallocated > 0 && (
                <> Unallocated: <span className="font-semibold text-foreground">{formatCurrency(preview.unallocated, currency)}</span>.</>
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StrategyPick({
  value,
  current,
  onClick,
  title,
  hint,
}: {
  value: Strategy;
  current: Strategy;
  onClick: () => void;
  title: string;
  hint: string;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors",
        active ? "border-primary bg-primary/5" : "border-input hover:bg-accent",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="font-medium">{title}</div>
        <div
          className={cn(
            "h-4 w-4 rounded-full border-2",
            active ? "border-primary bg-primary" : "border-muted-foreground",
          )}
        />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
    </button>
  );
}
