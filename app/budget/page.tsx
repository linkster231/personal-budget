"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorDot, ColorPicker } from "@/components/ui/color-picker";
import { CategoryForm } from "@/components/forms/category-form";
import { PacingText } from "@/components/budget/pacing-text";
import { SinkingFundRing } from "@/components/budget/sinking-fund-ring";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { formatCurrency, monthKey, prevMonthKey, monthLabel } from "@/lib/format";
import { incomeForMonth, expensesForMonthByCategory } from "@/lib/selectors";
import { allocate } from "@/lib/budget-engine";
import { cn } from "@/lib/utils";
import type { Category, Strategy } from "@/lib/types";

export default function BudgetPage() {
  const hydrated = useHydrated();
  const [addOpen, setAddOpen] = useState(false);
  const [colorEditing, setColorEditing] = useState<string | null>(null);

  const categories = useBudget((s) => s.categories);
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
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
  const spentByCategory = hydrated ? expensesForMonthByCategory(expenses, thisMonth) : {};

  const pool =
    strategy === "last-month"
      ? lastMonthIncome
      : strategy === "baseline"
        ? Math.max(thisMonthIncome, baselineIncome)
        : thisMonthIncome;

  const preview = useMemo(() => {
    if (!hydrated) return null;
    try {
      return allocate({ strategy, categories, availableIncome: pool, baselineIncome });
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [hydrated, strategy, categories, pool, baselineIncome]);

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget plan</h1>
          <p className="text-sm text-muted-foreground">Pick a strategy, set targets, track spending.</p>
        </div>
        <Link href="/whatif">
          <Button variant="outline" size="sm">
            <Sparkles className="h-4 w-4" />
            What-if scenarios
          </Button>
        </Link>
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
            <CardDescription>Targets, priorities, and how much you&apos;ve spent this month.</CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add category</DialogTitle></DialogHeader>
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
                .map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    allocated={preview && !("error" in preview) ? preview.allocations[c.id] ?? 0 : 0}
                    spent={spentByCategory[c.id] ?? 0}
                    currency={currency}
                    onUpdate={(patch) => updateCategory(c.id, patch)}
                    onRemove={() => removeCategory(c.id)}
                    onEditColor={() => setColorEditing(c.id)}
                  />
                ))}
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

      {/* Color editor dialog */}
      <Dialog open={colorEditing !== null} onOpenChange={(o) => !o && setColorEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pick a color</DialogTitle></DialogHeader>
          {colorEditing && (
            <ColorPicker
              value={categories.find((c) => c.id === colorEditing)?.color}
              onChange={(hex) => {
                updateCategory(colorEditing, { color: hex });
                setColorEditing(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryRow({
  category,
  allocated,
  spent,
  currency,
  onUpdate,
  onRemove,
  onEditColor,
}: {
  category: Category;
  allocated: number;
  spent: number;
  currency: string;
  onUpdate: (patch: Partial<Category>) => void;
  onRemove: () => void;
  onEditColor: () => void;
}) {
  const target = category.targetMonthly;
  const pct = target > 0 ? Math.min(200, (spent / target) * 100) : 0;
  const tone = target === 0 ? "muted" : pct < 75 ? "success" : pct < 100 ? "warning" : "destructive";
  const toneBg = {
    muted: "bg-muted-foreground/30",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  }[tone];

  return (
    <li className="flex flex-col gap-2 px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEditColor}
              aria-label="Change color"
              className="transition-transform hover:scale-110"
            >
              <ColorDot hex={category.color} size={10} />
            </button>
            <span className="truncate font-medium">{category.name}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              {category.kind}
            </span>
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
              className="h-9 w-24 text-sm"
              value={category.targetMonthly}
              onChange={(e) => onUpdate({ targetMonthly: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] uppercase">Pri</Label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              className="h-9 w-14 text-sm"
              value={category.priority}
              onChange={(e) => onUpdate({ priority: parseInt(e.target.value, 10) || 1 })}
            />
          </div>
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Progress bar row */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="num-tabular">
            Spent <span className="font-medium text-foreground">{formatCurrency(spent, currency)}</span>
            {target > 0 ? <> of {formatCurrency(target, currency)} ({pct.toFixed(0)}%)</> : " this month"}
          </span>
          {allocated > 0 && allocated !== target && (
            <span>Allocated {formatCurrency(allocated, currency)}</span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          {target > 0 && (
            <div className={cn("h-full transition-all", toneBg)} style={{ width: `${Math.min(100, pct)}%` }} />
          )}
        </div>
        <div className="flex items-center justify-between">
          <PacingText spent={spent} target={target} currency={currency} />
        </div>
      </div>

      {/* Sinking-fund ring + balance editor */}
      {category.kind === "sinking" && (
        <div className="mt-1 flex items-center gap-4 rounded-lg border bg-muted/30 p-2">
          <SinkingFundRing category={category} currency={currency} />
          <div className="flex-1 space-y-0.5">
            <Label className="text-[10px] uppercase">Fund balance</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              className="h-9 w-full text-sm"
              placeholder="0.00"
              value={category.fundBalance ?? ""}
              onChange={(e) =>
                onUpdate({
                  fundBalance: e.target.value === "" ? undefined : parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
        </div>
      )}
    </li>
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
