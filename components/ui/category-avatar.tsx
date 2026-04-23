"use client";

import { cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/icons";

export function CategoryAvatar({
  color,
  icon,
  size = 28,
  className,
}: {
  color?: string;
  icon?: string;
  size?: number;
  className?: string;
}) {
  const Icon = resolveIcon(icon);
  const bg = color ?? "hsl(var(--muted-foreground))";
  return (
    <span
      className={cn("inline-flex flex-shrink-0 items-center justify-center rounded-full text-white", className)}
      style={{ backgroundColor: bg, width: size, height: size }}
      aria-hidden
    >
      {Icon && <Icon size={Math.round(size * 0.55)} strokeWidth={2.25} />}
    </span>
  );
}
