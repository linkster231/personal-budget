"use client";

import { CalendarView } from "@/components/calendar/calendar-view";
import { BalanceCard } from "@/components/dashboard/balance-card";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Actual entries and scheduled items, color-coded. Tap a day for details.
        </p>
      </header>
      <BalanceCard />
      <CalendarView />
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-3 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
        <span className="text-muted-foreground">Logged income</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[hsl(var(--warning))]" />
        <span className="text-muted-foreground">Logged expense</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border-2 border-[hsl(var(--success))]" />
        <span className="text-muted-foreground">Scheduled income</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full border-2 border-[hsl(var(--warning))]" />
        <span className="text-muted-foreground">Scheduled expense</span>
      </div>
    </div>
  );
}
