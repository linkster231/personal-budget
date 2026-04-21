"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorDot } from "@/components/ui/color-picker";
import { LogInstanceForm } from "@/components/forms/log-instance-form";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { upcomingInstances } from "@/lib/selectors";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ScheduleInstance } from "@/lib/types";

export function PendingActions({ windowDays = 14 }: { windowDays?: number }) {
  const hydrated = useHydrated();
  const schedules = useBudget((s) => s.schedules);
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const skipped = useBudget((s) => s.skippedScheduleInstances);
  const skipAction = useBudget((s) => s.skipScheduleInstance);
  const sources = useBudget((s) => s.incomeSources);
  const categories = useBudget((s) => s.categories);
  const currency = useBudget((s) => s.settings.currency);

  const [selected, setSelected] = useState<ScheduleInstance | null>(null);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-20 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const items = upcomingInstances(
    { schedules, incomeEntries, expenses, skippedScheduleInstances: skipped },
    new Date(),
    windowDays,
  );

  const overdueItems = items.filter((i) => i.status === "overdue");
  const pendingItems = items.filter((i) => i.status === "pending");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Needs your confirmation
          {items.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              {items.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            Nothing to confirm in the next {windowDays} days. You&apos;re on top of things.
          </p>
        ) : (
          <ul className="divide-y">
            {overdueItems.map((inst) => (
              <InstanceRow
                key={inst.key}
                instance={inst}
                schedules={schedules}
                sources={sources}
                categories={categories}
                currency={currency}
                onSelect={setSelected}
                onSkip={(i) => skipAction(i.scheduleId, i.date)}
                overdue
              />
            ))}
            {pendingItems.map((inst) => (
              <InstanceRow
                key={inst.key}
                instance={inst}
                schedules={schedules}
                sources={sources}
                categories={categories}
                currency={currency}
                onSelect={setSelected}
                onSkip={(i) => skipAction(i.scheduleId, i.date)}
              />
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
          </DialogHeader>
          {selected && (() => {
            const s = schedules.find((x) => x.id === selected.scheduleId);
            return s ? (
              <LogInstanceForm schedule={s} instance={selected} onDone={() => setSelected(null)} />
            ) : null;
          })()}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function InstanceRow({
  instance,
  schedules,
  sources,
  categories,
  currency,
  onSelect,
  onSkip,
  overdue = false,
}: {
  instance: ScheduleInstance;
  schedules: ReturnType<typeof useBudget.getState>["schedules"];
  sources: ReturnType<typeof useBudget.getState>["incomeSources"];
  categories: ReturnType<typeof useBudget.getState>["categories"];
  currency: string;
  onSelect: (inst: ScheduleInstance) => void;
  onSkip: (inst: ScheduleInstance) => void;
  overdue?: boolean;
}) {
  const schedule = schedules.find((s) => s.id === instance.scheduleId);
  if (!schedule) return null;
  const label = schedule.name;
  const color =
    schedule.color ??
    (schedule.direction === "income"
      ? sources.find((s) => s.id === schedule.sourceId)?.color
      : categories.find((c) => c.id === schedule.categoryId)?.color);
  const dateObj = new Date(instance.date + "T00:00:00");
  const dateStr = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const today = new Date();
  const daysUntil = Math.round(
    (dateObj.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      86400000,
  );

  return (
    <li className={cn("flex items-center gap-3 px-5 py-3", overdue && "bg-destructive/5")}>
      <ColorDot hex={color} size={10} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{label}</span>
          {overdue && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
        </div>
        <div className="text-xs text-muted-foreground">
          {overdue ? (
            <>Was due {dateStr} · {Math.abs(daysUntil)} day{Math.abs(daysUntil) === 1 ? "" : "s"} ago</>
          ) : daysUntil === 0 ? (
            <>Due today</>
          ) : daysUntil === 1 ? (
            <>Due tomorrow</>
          ) : (
            <>Due {dateStr} · in {daysUntil} days</>
          )}
        </div>
      </div>
      <div className="text-right">
        <div
          className={cn(
            "text-sm font-semibold num-tabular",
            schedule.direction === "income" ? "text-success" : "",
          )}
        >
          {schedule.direction === "income" ? "+" : "−"}
          {formatCurrency(instance.expectedAmount, currency)}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button size="sm" onClick={() => onSelect(instance)}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          Log
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onSkip(instance)}
          aria-label="Skip"
          title="Skip this occurrence"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
