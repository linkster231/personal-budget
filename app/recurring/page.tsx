"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Edit3, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ColorDot } from "@/components/ui/color-picker";
import { ScheduleForm } from "@/components/forms/schedule-form";
import { PendingActions } from "@/components/recurring/pending-actions";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { formatCurrency } from "@/lib/format";
import { intervalLabel, expectedAmountFor } from "@/lib/schedule-engine";
import type { RecurringSchedule } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Normalize a schedule's expected amount into a MONTHLY equivalent so we can
 * show a "what am I paying per month" summary regardless of cadence.
 */
function monthlyEquivalent(s: RecurringSchedule): number {
  const amount = expectedAmountFor(s);
  const iv = s.interval;
  switch (iv.kind) {
    case "weekly":
      return (amount * 52) / 12;
    case "biweekly":
      return (amount * 26) / 12;
    case "semi-monthly":
      return amount * 2;
    case "monthly":
      return amount;
    case "quarterly":
      return amount / 3;
    case "yearly":
      return amount / 12;
    case "custom":
      return (amount * 365) / iv.everyDays / 12;
  }
}

export default function RecurringPage() {
  const hydrated = useHydrated();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringSchedule | null>(null);

  const schedules = useBudget((s) => s.schedules);
  const sources = useBudget((s) => s.incomeSources);
  const categories = useBudget((s) => s.categories);
  const currency = useBudget((s) => s.settings.currency);
  const updateSchedule = useBudget((s) => s.updateSchedule);
  const removeSchedule = useBudget((s) => s.removeSchedule);

  const monthlyIncome = useMemo(
    () => schedules.filter((s) => s.direction === "income" && s.isActive).reduce((sum, s) => sum + monthlyEquivalent(s), 0),
    [schedules],
  );
  const monthlyExpense = useMemo(
    () => schedules.filter((s) => s.direction === "expense" && s.isActive).reduce((sum, s) => sum + monthlyEquivalent(s), 0),
    [schedules],
  );

  const incomeSchedules = schedules.filter((s) => s.direction === "income");
  const expenseSchedules = schedules.filter((s) => s.direction === "expense");

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recurring</h1>
          <p className="text-sm text-muted-foreground">
            Schedule income and expenses that repeat. Log them when they happen — nothing is auto-posted.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New recurring schedule</DialogTitle>
            </DialogHeader>
            <ScheduleForm onDone={() => setAddOpen(false)} />
          </DialogContent>
        </Dialog>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <SummaryCard label="Monthly income (recurring)" amount={monthlyIncome} tone="success" currency={currency} />
        <SummaryCard label="Monthly expense (recurring)" amount={monthlyExpense} tone="warning" currency={currency} />
      </div>

      {/* Pending actions */}
      <PendingActions windowDays={14} />

      {/* Expense schedules */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring expenses</CardTitle>
          <CardDescription>
            {expenseSchedules.length === 0 ? "Nothing scheduled yet." : `${expenseSchedules.length} active schedules.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScheduleList
            schedules={expenseSchedules}
            sources={sources}
            categories={categories}
            currency={currency}
            onEdit={setEditing}
            onToggle={(s) => updateSchedule(s.id, { isActive: !s.isActive })}
            onRemove={(s) => {
              if (confirm(`Delete "${s.name}"? Logged entries stay; only the schedule is removed.`)) {
                removeSchedule(s.id);
              }
            }}
          />
        </CardContent>
      </Card>

      {/* Income schedules */}
      <Card>
        <CardHeader>
          <CardTitle>Recurring income</CardTitle>
          <CardDescription>
            {incomeSchedules.length === 0 ? "Nothing scheduled yet." : `${incomeSchedules.length} active schedules.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScheduleList
            schedules={incomeSchedules}
            sources={sources}
            categories={categories}
            currency={currency}
            onEdit={setEditing}
            onToggle={(s) => updateSchedule(s.id, { isActive: !s.isActive })}
            onRemove={(s) => {
              if (confirm(`Delete "${s.name}"? Logged entries stay; only the schedule is removed.`)) {
                removeSchedule(s.id);
              }
            }}
          />
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit schedule</DialogTitle>
          </DialogHeader>
          {editing && <ScheduleForm initial={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  amount,
  tone,
  currency,
}: {
  label: string;
  amount: number;
  tone: "success" | "warning";
  currency: string;
}) {
  const toneClass = tone === "success" ? "text-success" : "text-warning";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className={cn("mt-1 text-xl font-semibold num-tabular", toneClass)}>
          {formatCurrency(amount, currency)}
          <span className="ml-1 text-xs font-normal text-muted-foreground">/ mo</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatCurrency(amount * 12, currency)} / year
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleList({
  schedules,
  sources,
  categories,
  currency,
  onEdit,
  onToggle,
  onRemove,
}: {
  schedules: RecurringSchedule[];
  sources: ReturnType<typeof useBudget.getState>["incomeSources"];
  categories: ReturnType<typeof useBudget.getState>["categories"];
  currency: string;
  onEdit: (s: RecurringSchedule) => void;
  onToggle: (s: RecurringSchedule) => void;
  onRemove: (s: RecurringSchedule) => void;
}) {
  if (schedules.length === 0) {
    return <p className="p-5 text-sm text-muted-foreground">No schedules yet.</p>;
  }
  return (
    <ul className="divide-y">
      {schedules.map((s) => {
        const ownerName =
          s.direction === "income"
            ? sources.find((x) => x.id === s.sourceId)?.name
            : categories.find((x) => x.id === s.categoryId)?.name;
        const ownerColor =
          s.color ??
          (s.direction === "income"
            ? sources.find((x) => x.id === s.sourceId)?.color
            : categories.find((x) => x.id === s.categoryId)?.color);
        const amountLabel =
          s.amountKind === "fixed"
            ? formatCurrency(s.amount ?? 0, currency)
            : `${formatCurrency(s.amountMin ?? 0, currency)}–${formatCurrency(s.amountMax ?? 0, currency)}`;
        return (
          <li key={s.id} className={cn("flex items-center gap-3 px-5 py-3", !s.isActive && "opacity-60")}>
            <ColorDot hex={ownerColor} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{s.name}</span>
                {!s.isActive && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">paused</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {ownerName ?? "—"} · {intervalLabel(s.interval)}
              </div>
            </div>
            <div className="text-right num-tabular font-medium">{amountLabel}</div>
            <div className="flex items-center">
              <Button size="icon" variant="ghost" onClick={() => onEdit(s)} aria-label="Edit">
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onToggle(s)} aria-label={s.isActive ? "Pause" : "Resume"}>
                {s.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onRemove(s)} aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
