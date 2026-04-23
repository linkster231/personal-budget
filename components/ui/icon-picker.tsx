"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ICON_MAP, ICONS, type IconName } from "@/lib/icons";

export function IconPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (name: IconName) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = ICONS.filter((n) => n.includes(query.toLowerCase()));

  return (
    <div className="space-y-2">
      <input
        type="search"
        placeholder="Search icons…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="grid max-h-48 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border p-2">
        {filtered.map((name) => {
          const Icon = ICON_MAP[name];
          if (!Icon) return null;
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              title={name}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <Icon size={16} />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <span className="col-span-8 py-4 text-center text-xs text-muted-foreground">No icons match.</span>
        )}
      </div>
    </div>
  );
}
