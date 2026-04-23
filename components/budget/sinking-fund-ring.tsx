"use client";

import { sinkingReadiness } from "@/lib/budget-engine";
import { formatCurrency } from "@/lib/format";
import type { Category } from "@/lib/types";

/**
 * SVG progress ring for a sinking-fund category. Shows (fundBalance) vs
 * (targetMonthly × 12) as a filled arc. If fundBalance is undefined, the
 * ring is empty and the user gets a nudge to enter one.
 */
export function SinkingFundRing({
  category,
  currency,
  size = 56,
}: {
  category: Category;
  currency: string;
  size?: number;
}) {
  if (category.kind !== "sinking") return null;
  const saved = category.fundBalance ?? 0;
  const ratio = sinkingReadiness(category, saved);
  const annual = category.targetMonthly * 12;
  const color = category.color ?? "hsl(var(--primary))";

  const stroke = 5;
  const r = size / 2 - stroke;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - ratio);

  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-foreground text-[10px] font-semibold"
          transform={`rotate(90 ${size / 2} ${size / 2})`}
        >
          {Math.round(ratio * 100)}%
        </text>
      </svg>
      <div className="text-[10px] leading-tight text-muted-foreground">
        <div className="font-medium text-foreground">{formatCurrency(saved, currency)}</div>
        <div>of {formatCurrency(annual, currency)} / yr</div>
      </div>
    </div>
  );
}
