"use client";

import { PALETTE } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export function ColorPicker({
  value,
  onChange,
  compact = false,
}: {
  value: string | undefined;
  onChange: (hex: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", compact && "gap-1")}>
      {PALETTE.map((c) => {
        const active = value === c.hex;
        return (
          <button
            key={c.hex}
            type="button"
            onClick={() => onChange(c.hex)}
            aria-label={`Color ${c.name}`}
            className={cn(
              "flex items-center justify-center rounded-full border-2 transition-transform",
              compact ? "h-6 w-6" : "h-8 w-8",
              active ? "scale-110 border-foreground" : "border-transparent hover:scale-105",
            )}
            style={{ backgroundColor: c.hex }}
          >
            {active && <Check className={cn("text-white", compact ? "h-3 w-3" : "h-4 w-4")} />}
          </button>
        );
      })}
    </div>
  );
}

export function ColorDot({ hex, size = 10 }: { hex?: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block flex-shrink-0 rounded-full"
      style={{ backgroundColor: hex ?? "hsl(var(--muted-foreground))", width: size, height: size }}
    />
  );
}
