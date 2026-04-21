"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ColorDot } from "@/components/ui/color-picker";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { upcomingInstances } from "@/lib/selectors";
import { formatCurrency } from "@/lib/format";

/**
 * Compact dashboard card listing the next 5 scheduled items (income + expense
 * mixed) within the next 14 days. Links to the Recurring page for action.
 */
export function UpcomingItems({ limit = 5 }: { limit?: number }) {
  const hydrated = useHydrated();
  const schedules = useBudget((s) => s.schedules);
  const incomeEntries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const skipped = useBudget((s) => s.skippedScheduleInstances);
  const sources = useBudget((s) => s.incomeSources);
  const categories = useBudget((s) => s.categories);
  const currency = useBudget((s) => s.settings.currency);

  if (!hydrated) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-24 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const items = upcomingInstances(
    { schedules, incomeEntries, expenses, skippedScheduleInstances: skipped },
    new Date(),
    14,
  ).slice(0, limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Upcoming (next 14 days)
        </CardTitle>
        <Link
          href="/recurring"
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Manage <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            Nothing scheduled in the next two weeks.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((inst) => {
              const s = schedules.find((x) => x.id === inst.scheduleId);
              if (!s) return null;
              const color =
                s.color ??
                (s.direction === "income"
                  ? sources.find((src) => src.id === s.sourceId)?.color
                  : categories.find((c) => c.id === s.categoryId)?.color);
              const dateObj = new Date(inst.date + "T00:00:00");
              return (
                <li key={inst.key} className="flex items-center gap-3 px-5 py-3">
                  <ColorDot hex={color} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {inst.status === "overdue" ? "Overdue · " : ""}
                      {dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                  </div>
                  <div className={s.direction === "income" ? "text-success font-semibold num-tabular" : "font-semibold num-tabular"}>
                    {s.direction === "income" ? "+" : "−"}
                    {formatCurrency(inst.expectedAmount, currency)}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
