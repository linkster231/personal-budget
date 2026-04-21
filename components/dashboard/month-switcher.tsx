"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { monthLabel } from "@/lib/format";

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string;
  onChange: (next: string) => void;
}) {
  function shift(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={() => shift(-1)} aria-label="Previous month">
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div className="min-w-[140px] text-center text-sm font-medium">{monthLabel(month)}</div>
      <Button variant="ghost" size="icon" onClick={() => shift(1)} aria-label="Next month">
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
