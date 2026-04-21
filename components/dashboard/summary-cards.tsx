"use client";

import { TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SummaryCards({
  income,
  spent,
  remaining,
  currency,
}: {
  income: number;
  spent: number;
  remaining: number;
  currency: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label="Income this month"
        value={formatCurrency(income, currency)}
        icon={<TrendingUp className="h-5 w-5" />}
        tone="success"
      />
      <StatCard
        label="Spent this month"
        value={formatCurrency(spent, currency)}
        icon={<TrendingDown className="h-5 w-5" />}
        tone="warning"
      />
      <StatCard
        label={remaining >= 0 ? "Left to allocate" : "Over budget"}
        value={formatCurrency(remaining, currency)}
        icon={<PiggyBank className="h-5 w-5" />}
        tone={remaining >= 0 ? "primary" : "destructive"}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: "success" | "warning" | "primary" | "destructive";
}) {
  const toneClass = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5 pt-5">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold num-tabular">{value}</div>
        </div>
        <div className={cn("rounded-full p-2", toneClass)}>{icon}</div>
      </CardContent>
    </Card>
  );
}
