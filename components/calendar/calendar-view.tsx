"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ColorDot } from "@/components/ui/color-picker";
import { LogInstanceForm } from "@/components/forms/log-instance-form";
import { IncomeForm } from "@/components/forms/income-form";
import { ExpenseForm } from "@/components/forms/expense-form";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { formatCurrency } from "@/lib/format";
import { materializeInstances, isoLocal, parseLocal, addDaysLocal, startOfDay } from "@/lib/schedule-engine";
import { cn } from "@/lib/utils";
import type { Category, IncomeSource, RecurringSchedule, ScheduleInstance } from "@/lib/types";

/** Build a 6-week grid (42 days) that contains the given month. */
function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back up to the Sunday on/before the 1st
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

type DayEvent =
  | { kind: "actual-income"; id: string; amount: number; label: string; color?: string }
  | { kind: "actual-expense"; id: string; amount: number; label: string; color?: string }
  | { kind: "scheduled"; instance: ScheduleInstance; schedule: RecurringSchedule; color?: string };

export function CalendarView() {
  const hydrated = useHydrated();
  const schedules = useBudget((s) => s.schedules);
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const skipped = useBudget((s) => s.skippedScheduleInstances);
  const sources = useBudget((s) => s.incomeSources);
  const categories = useBudget((s) => s.categories);
  const currency = useBudget((s) => s.settings.currency);

  // `today` is computed once per render from a memoized date string so hook
  // dependencies stay stable. It refreshes if the user leaves the app open
  // past midnight only on re-render of the parent — acceptable.
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(isoLocal(today));
  const [logInstance, setLogInstance] = useState<ScheduleInstance | null>(null);
  const [quickAdd, setQuickAdd] = useState<"income" | "expense" | null>(null);

  const grid = useMemo(() => buildGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  const eventsByDay = useMemo(() => {
    if (!hydrated) return new Map<string, DayEvent[]>();
    const map = new Map<string, DayEvent[]>();
    const push = (iso: string, ev: DayEvent) => {
      const arr = map.get(iso) ?? [];
      arr.push(ev);
      map.set(iso, arr);
    };

    // Scheduled (pending + overdue) within visible grid
    const instances = materializeInstances({
      schedules,
      incomeEntries,
      expenses,
      skipped,
      rangeStart: grid[0],
      rangeEnd: grid[grid.length - 1],
      today,
    });
    for (const inst of instances) {
      if (inst.status === "skipped" || inst.status === "posted") continue;
      const s = schedules.find((x) => x.id === inst.scheduleId);
      if (!s) continue;
      const color =
        s.color ??
        (s.direction === "income"
          ? sources.find((src) => src.id === s.sourceId)?.color
          : categories.find((c) => c.id === s.categoryId)?.color);
      push(inst.date, { kind: "scheduled", instance: inst, schedule: s, color });
    }

    // Actual entries
    for (const e of incomeEntries) {
      const iso = e.date.slice(0, 10);
      const src = sources.find((x) => x.id === e.sourceId);
      push(iso, {
        kind: "actual-income",
        id: e.id,
        amount: e.amount,
        label: src?.name ?? "Income",
        color: src?.color,
      });
    }
    for (const e of expenses) {
      const iso = e.date.slice(0, 10);
      const cat = categories.find((x) => x.id === e.categoryId);
      push(iso, {
        kind: "actual-expense",
        id: e.id,
        amount: e.amount,
        label: cat?.name ?? "Expense",
        color: cat?.color,
      });
    }
    return map;
  }, [hydrated, schedules, incomeEntries, expenses, skipped, sources, categories, grid, today]);

  const selectedEvents = eventsByDay.get(selectedDate) ?? [];
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-[160px] text-center text-base font-semibold">{monthLabel}</div>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
            setSelectedDate(isoLocal(today));
          }}
        >
          Today
        </Button>
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-xl border">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="bg-muted/50 py-2 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {d}
          </div>
        ))}
        {grid.map((d, i) => {
          const iso = isoLocal(d);
          const inMonth = d.getMonth() === cursor.getMonth();
          const isToday = iso === isoLocal(today);
          const isSelected = iso === selectedDate;
          const events = eventsByDay.get(iso) ?? [];
          const dayIncome = events.reduce((s, e) => {
            if (e.kind === "actual-income") return s + e.amount;
            if (e.kind === "scheduled" && e.schedule.direction === "income") return s + e.instance.expectedAmount;
            return s;
          }, 0);
          const dayExpense = events.reduce((s, e) => {
            if (e.kind === "actual-expense") return s + e.amount;
            if (e.kind === "scheduled" && e.schedule.direction === "expense") return s + e.instance.expectedAmount;
            return s;
          }, 0);

          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedDate(iso)}
              className={cn(
                "relative flex min-h-[64px] flex-col border-t border-l p-1.5 text-left transition-colors sm:min-h-[88px] sm:p-2",
                (i % 7 === 0) && "border-l-0",
                i < 7 && "border-t-0",
                !inMonth && "bg-muted/30 text-muted-foreground",
                isSelected && "bg-primary/10",
                isToday && !isSelected && "bg-accent/50",
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-semibold", isToday && "text-primary")}>{d.getDate()}</span>
                {isToday && <span className="text-[9px] font-medium uppercase tracking-wide text-primary">today</span>}
              </div>
              {events.length > 0 && (
                <>
                  {/* Mobile: just dots */}
                  <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden">
                    {events.slice(0, 4).map((e, j) => (
                      <DotFor key={j} event={e} />
                    ))}
                    {events.length > 4 && <span className="text-[9px] text-muted-foreground">+{events.length - 4}</span>}
                  </div>
                  {/* Desktop: amounts */}
                  <div className="mt-1 hidden flex-col gap-0.5 text-[11px] leading-tight sm:flex">
                    {dayIncome > 0 && (
                      <span className="truncate text-success num-tabular">+{formatCurrency(dayIncome, currency)}</span>
                    )}
                    {dayExpense > 0 && (
                      <span className="truncate text-warning num-tabular">−{formatCurrency(dayExpense, currency)}</span>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day details */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">
            {parseLocal(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => setQuickAdd("income")}>
              <Plus className="h-3.5 w-3.5" />
              Income
            </Button>
            <Button size="sm" variant="outline" onClick={() => setQuickAdd("expense")}>
              <Plus className="h-3.5 w-3.5" />
              Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {selectedEvents.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">No activity this day.</p>
          ) : (
            <ul className="divide-y">
              {selectedEvents.map((e, i) => (
                <DayEventRow
                  key={i}
                  event={e}
                  currency={currency}
                  onConfirmInstance={(inst) => setLogInstance(inst)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Log instance dialog */}
      <Dialog open={logInstance !== null} onOpenChange={(o) => !o && setLogInstance(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
          </DialogHeader>
          {logInstance && (() => {
            const s = schedules.find((x) => x.id === logInstance.scheduleId);
            return s ? (
              <LogInstanceForm schedule={s} instance={logInstance} onDone={() => setLogInstance(null)} />
            ) : null;
          })()}
        </DialogContent>
      </Dialog>

      {/* Quick add (not scheduled) */}
      <Dialog open={quickAdd !== null} onOpenChange={(o) => !o && setQuickAdd(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{quickAdd === "income" ? "Log income" : "Log expense"}</DialogTitle>
          </DialogHeader>
          {quickAdd === "income" && <IncomeForm onDone={() => setQuickAdd(null)} />}
          {quickAdd === "expense" && <ExpenseForm onDone={() => setQuickAdd(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DotFor({ event }: { event: DayEvent }) {
  if (event.kind === "scheduled") {
    // Scheduled = outline dot
    return (
      <span
        className="inline-block h-2 w-2 rounded-full border-2"
        style={{
          borderColor:
            event.color ??
            (event.schedule.direction === "income" ? "hsl(var(--success))" : "hsl(var(--warning))"),
        }}
      />
    );
  }
  // Actual = filled dot
  return <ColorDot hex={event.color} size={8} />;
}

function DayEventRow({
  event,
  currency,
  onConfirmInstance,
}: {
  event: DayEvent;
  currency: string;
  onConfirmInstance: (inst: ScheduleInstance) => void;
}) {
  if (event.kind === "scheduled") {
    const { instance, schedule, color } = event;
    const isIncome = schedule.direction === "income";
    const isOverdue = instance.status === "overdue";
    return (
      <li className={cn("flex items-center gap-3 px-5 py-3", isOverdue && "bg-destructive/5")}>
        <span
          className="inline-block h-2.5 w-2.5 rounded-full border-2"
          style={{ borderColor: color ?? (isIncome ? "hsl(var(--success))" : "hsl(var(--warning))") }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{schedule.name}</div>
          <div className="text-xs text-muted-foreground">
            {isOverdue ? "Overdue · " : "Scheduled · "}
            {isIncome ? "expected income" : "expected expense"}
          </div>
        </div>
        <div className={cn("text-sm font-semibold num-tabular", isIncome && "text-success")}>
          {isIncome ? "+" : "−"}{formatCurrency(instance.expectedAmount, currency)}
        </div>
        <Button size="sm" onClick={() => onConfirmInstance(instance)}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Log
        </Button>
      </li>
    );
  }
  const isIncome = event.kind === "actual-income";
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <ColorDot hex={event.color} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{event.label}</div>
        <div className="text-xs text-muted-foreground">
          {isIncome ? "Logged income" : "Logged expense"}
        </div>
      </div>
      <div className={cn("text-sm font-semibold num-tabular", isIncome && "text-success")}>
        {isIncome ? "+" : "−"}{formatCurrency(event.amount, currency)}
      </div>
    </li>
  );
}
