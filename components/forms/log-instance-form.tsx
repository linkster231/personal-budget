"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { useBudget } from "@/lib/store";
import { formatCurrency } from "@/lib/format";
import type { RecurringSchedule, ScheduleInstance } from "@/lib/types";

/**
 * Form to confirm a scheduled instance and record its actual amount.
 * For range-amount schedules, the user can adjust within the range (or beyond
 * it — we don't block, we warn).
 */
export function LogInstanceForm({
  schedule,
  instance,
  onDone,
}: {
  schedule: RecurringSchedule;
  instance: ScheduleInstance;
  onDone?: () => void;
}) {
  const post = useBudget((s) => s.postScheduleInstance);
  const currency = useBudget((s) => s.settings.currency);

  const defaultAmount =
    schedule.amountKind === "fixed"
      ? schedule.amount ?? 0
      : (schedule.amountMin ?? 0 + (schedule.amountMax ?? 0)) / 2;
  const [amount, setAmount] = useState(String(defaultAmount));
  const [notes, setNotes] = useState("");

  const parsed = parseFloat(amount);
  const outOfRange =
    schedule.amountKind === "range" &&
    !isNaN(parsed) &&
    ((schedule.amountMin !== undefined && parsed < schedule.amountMin) ||
      (schedule.amountMax !== undefined && parsed > schedule.amountMax));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isNaN(parsed) || parsed <= 0) return;
    post(schedule.id, instance.date, parsed, notes || undefined);
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="rounded-lg border bg-muted/50 p-3 text-sm">
        <div className="font-medium">{schedule.name}</div>
        <div className="text-muted-foreground">
          {schedule.direction === "income" ? "Income" : "Expense"} · due{" "}
          {new Date(instance.date + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
          {schedule.amountKind === "range" && schedule.amountMin !== undefined && schedule.amountMax !== undefined && (
            <> · expected {formatCurrency(schedule.amountMin, currency)}–{formatCurrency(schedule.amountMax, currency)}</>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Actual amount</Label>
        <Input
          id="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
        {outOfRange && (
          <p className="text-xs text-warning">
            Outside the expected range — that&apos;s OK, just confirming you noticed.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit">
          {schedule.direction === "income" ? "Log income" : "Log payment"}
        </Button>
      </div>
    </form>
  );
}
