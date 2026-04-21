"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/ui/color-picker";
import { DialogClose } from "@/components/ui/dialog";
import { useBudget } from "@/lib/store";
import { cn } from "@/lib/utils";
import type {
  Interval,
  RecurringSchedule,
  ScheduleDirection,
} from "@/lib/types";

type IntervalKind = Interval["kind"];

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ScheduleForm({
  initial,
  onDone,
}: {
  initial?: RecurringSchedule;
  onDone?: () => void;
}) {
  const sources = useBudget((s) => s.incomeSources);
  const categories = useBudget((s) => s.categories);
  const addSchedule = useBudget((s) => s.addSchedule);
  const updateSchedule = useBudget((s) => s.updateSchedule);

  const [direction, setDirection] = useState<ScheduleDirection>(initial?.direction ?? "expense");
  const [name, setName] = useState(initial?.name ?? "");
  const [sourceId, setSourceId] = useState(initial?.sourceId ?? sources[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [amountKind, setAmountKind] = useState<"fixed" | "range">(initial?.amountKind ?? "fixed");
  const [amount, setAmount] = useState(String(initial?.amount ?? ""));
  const [amountMin, setAmountMin] = useState(String(initial?.amountMin ?? ""));
  const [amountMax, setAmountMax] = useState(String(initial?.amountMax ?? ""));

  const [intervalKind, setIntervalKind] = useState<IntervalKind>(initial?.interval.kind ?? "monthly");
  const [dayOfWeek, setDayOfWeek] = useState(
    initial?.interval.kind === "weekly" || initial?.interval.kind === "biweekly"
      ? initial.interval.dayOfWeek
      : 5,
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    initial?.interval.kind === "monthly" ? initial.interval.dayOfMonth : 1,
  );
  const [semiDays, setSemiDays] = useState<[number, number]>(
    initial?.interval.kind === "semi-monthly" ? initial.interval.days : [1, 15],
  );
  const [yearlyMonth, setYearlyMonth] = useState(
    initial?.interval.kind === "yearly" ? initial.interval.month : 1,
  );
  const [yearlyDay, setYearlyDay] = useState(
    initial?.interval.kind === "yearly" ? initial.interval.day : 1,
  );
  const [quarterlyStart, setQuarterlyStart] = useState(
    initial?.interval.kind === "quarterly" ? initial.interval.startMonth : 1,
  );
  const [quarterlyDay, setQuarterlyDay] = useState(
    initial?.interval.kind === "quarterly" ? initial.interval.day : 1,
  );
  const [customDays, setCustomDays] = useState(
    initial?.interval.kind === "custom" ? String(initial.interval.everyDays) : "30",
  );

  const todayISO = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(initial?.startDate ?? todayISO);
  const [endDate, setEndDate] = useState(initial?.endDate ?? "");
  const [notify, setNotify] = useState(initial?.notify ?? true);
  const [color, setColor] = useState<string | undefined>(initial?.color);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const interval = useMemo<Interval>(() => {
    switch (intervalKind) {
      case "weekly":
        return { kind: "weekly", dayOfWeek };
      case "biweekly":
        return { kind: "biweekly", dayOfWeek, anchor: startDate };
      case "semi-monthly":
        return { kind: "semi-monthly", days: semiDays };
      case "monthly":
        return { kind: "monthly", dayOfMonth };
      case "quarterly":
        return { kind: "quarterly", startMonth: quarterlyStart, day: quarterlyDay };
      case "yearly":
        return { kind: "yearly", month: yearlyMonth, day: yearlyDay };
      case "custom":
        return { kind: "custom", everyDays: Math.max(1, parseInt(customDays, 10) || 1), anchor: startDate };
    }
  }, [intervalKind, dayOfWeek, startDate, semiDays, dayOfMonth, quarterlyStart, quarterlyDay, yearlyMonth, yearlyDay, customDays]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    if (direction === "income" && !sourceId) return;
    if (direction === "expense" && !categoryId) return;

    const payload: Omit<RecurringSchedule, "id"> = {
      name: name.trim(),
      direction,
      sourceId: direction === "income" ? sourceId : undefined,
      categoryId: direction === "expense" ? categoryId : undefined,
      amountKind,
      amount: amountKind === "fixed" ? parseFloat(amount) || 0 : undefined,
      amountMin: amountKind === "range" ? parseFloat(amountMin) || 0 : undefined,
      amountMax: amountKind === "range" ? parseFloat(amountMax) || 0 : undefined,
      interval,
      startDate,
      endDate: endDate || undefined,
      notify,
      isActive: initial?.isActive ?? true,
      color,
      notes: notes.trim() || undefined,
    };

    if (initial) updateSchedule(initial.id, payload);
    else addSchedule(payload);
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Direction */}
      <div className="space-y-1.5">
        <Label>Type</Label>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <SegmentButton active={direction === "expense"} onClick={() => setDirection("expense")}>
            Expense
          </SegmentButton>
          <SegmentButton active={direction === "income"} onClick={() => setDirection("income")}>
            Income
          </SegmentButton>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder={direction === "income" ? "e.g. Biweekly paycheck" : "e.g. Rent, Netflix, Gas"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>

      {direction === "income" ? (
        <div className="space-y-1.5">
          <Label htmlFor="source">Income source</Label>
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger id="source"><SelectValue placeholder="Pick a source" /></SelectTrigger>
            <SelectContent>
              {sources.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category"><SelectValue placeholder="Pick a category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Amount */}
      <div className="space-y-2">
        <Label>Amount</Label>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <SegmentButton active={amountKind === "fixed"} onClick={() => setAmountKind("fixed")}>
            Fixed
          </SegmentButton>
          <SegmentButton active={amountKind === "range"} onClick={() => setAmountKind("range")}>
            Range
          </SegmentButton>
        </div>
        {amountKind === "fixed" ? (
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="min" className="text-[10px] uppercase">Minimum</Label>
              <Input
                id="min"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="max" className="text-[10px] uppercase">Maximum</Label>
              <Input
                id="max"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
              />
            </div>
          </div>
        )}
        {amountKind === "range" && (
          <p className="text-xs text-muted-foreground">
            Planning uses the midpoint. When you log an instance, you enter the actual amount.
          </p>
        )}
      </div>

      {/* Interval */}
      <div className="space-y-2">
        <Label>Repeats</Label>
        <Select value={intervalKind} onValueChange={(v) => setIntervalKind(v as IntervalKind)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Every 2 weeks</SelectItem>
            <SelectItem value="semi-monthly">Twice a month (e.g. 1st + 15th)</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="quarterly">Quarterly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="custom">Every N days</SelectItem>
          </SelectContent>
        </Select>

        {(intervalKind === "weekly" || intervalKind === "biweekly") && (
          <div className="space-y-1.5">
            <Label>Day of the week</Label>
            <div className="flex gap-1">
              {DOW.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setDayOfWeek(i)}
                  className={cn(
                    "flex-1 rounded-md px-1 py-2 text-xs font-medium transition-colors",
                    dayOfWeek === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {intervalKind === "monthly" && (
          <div className="space-y-1.5">
            <Label htmlFor="dom">Day of the month (1–31)</Label>
            <Input
              id="dom"
              type="number"
              inputMode="numeric"
              min="1"
              max="31"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
            />
            <p className="text-xs text-muted-foreground">
              If the month is shorter, uses the last day.
            </p>
          </div>
        )}

        {intervalKind === "semi-monthly" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">First</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={semiDays[0]}
                onChange={(e) => setSemiDays([parseInt(e.target.value, 10) || 1, semiDays[1]])}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Second</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={semiDays[1]}
                onChange={(e) => setSemiDays([semiDays[0], parseInt(e.target.value, 10) || 15])}
              />
            </div>
          </div>
        )}

        {intervalKind === "quarterly" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Start month (1–12)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="12"
                value={quarterlyStart}
                onChange={(e) => setQuarterlyStart(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Day</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={quarterlyDay}
                onChange={(e) => setQuarterlyDay(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
        )}

        {intervalKind === "yearly" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Month (1–12)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="12"
                value={yearlyMonth}
                onChange={(e) => setYearlyMonth(parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase">Day</Label>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max="31"
                value={yearlyDay}
                onChange={(e) => setYearlyDay(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
        )}

        {intervalKind === "custom" && (
          <div className="space-y-1.5">
            <Label htmlFor="every">Every N days</Label>
            <Input
              id="every"
              type="number"
              inputMode="numeric"
              min="1"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="start" className="text-[10px] uppercase">Start date</Label>
            <Input id="start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end" className="text-[10px] uppercase">End date (optional)</Label>
            <Input id="end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label>Notify me</Label>
            <p className="text-xs text-muted-foreground">
              Remind me when this is due (requires notification permission).
            </p>
          </div>
          <Switch checked={notify} onCheckedChange={setNotify} />
        </div>

        <div className="space-y-1.5">
          <Label>Color</Label>
          <ColorPicker value={color} onChange={setColor} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">Cancel</Button>
        </DialogClose>
        <Button type="submit">{initial ? "Save" : "Create schedule"}</Button>
      </div>
    </form>
  );
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
