"use client";

import { TrendingUp } from "lucide-react";
import { pacingForCategory } from "@/lib/pacing";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PacingText({
  spent,
  target,
  currency,
  today,
}: {
  spent: number;
  target: number;
  currency: string;
  today?: Date;
}) {
  if (target <= 0 || spent <= 0) return null;
  const now = today ?? new Date();
  const { projectedMonthEnd, daysElapsed, daysInMonth, tone } = pacingForCategory(spent, target, now);
  if (daysElapsed <= 1) return null; // not enough data

  const tonalClass = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    muted: "text-muted-foreground",
  }[tone];

  return (
    <div className={cn("flex items-center gap-1 text-[11px] font-medium", tonalClass)}>
      <TrendingUp className="h-3 w-3" />
      <span>
        On pace for {formatCurrency(projectedMonthEnd, currency)} by {daysInMonth === daysElapsed ? "today" : "month end"}
      </span>
    </div>
  );
}
