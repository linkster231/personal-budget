"use client";

import { AlertTriangle, CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { upcomingBills } from "@/lib/selectors";
import { formatCurrency } from "@/lib/format";

export function UpcomingBills() {
  const hydrated = useHydrated();
  const bills = useBudget((s) => s.bills);
  const expenses = useBudget((s) => s.expenses);
  const currency = useBudget((s) => s.settings.currency);

  if (!hydrated) return <CardSkeleton />;
  const items = upcomingBills({ bills, expenses }, new Date(), 14);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          Upcoming bills (next 14 days)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-muted-foreground">
            No bills due in the next two weeks.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map(({ bill, dueDate, daysUntil }) => (
              <li key={bill.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <div className="font-medium">{bill.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Due {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{" "}
                    · {daysUntil === 0 ? "today" : daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {daysUntil <= 3 && <AlertTriangle className="h-4 w-4 text-warning" />}
                  <span className="font-medium num-tabular">{formatCurrency(bill.amount, currency)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="h-24 animate-pulse rounded-md bg-muted" />
      </CardContent>
    </Card>
  );
}
