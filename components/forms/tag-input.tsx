"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useBudget } from "@/lib/store";
import { allTags, normalizeTag } from "@/lib/tags";
import { cn } from "@/lib/utils";

/**
 * Chip-style tag editor. Enter/comma commits; backspace at empty input
 * removes last tag. Shows existing tags as autocomplete suggestions.
 */
export function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const existing = useBudget((s) => allTags(s.incomeEntries, s.expenses));
  const [draft, setDraft] = useState("");

  function commit() {
    const t = normalizeTag(draft);
    if (!t) return;
    if (value.includes(t)) {
      setDraft("");
      return;
    }
    onChange([...value, t]);
    setDraft("");
  }

  function remove(t: string) {
    onChange(value.filter((x) => x !== t));
  }

  const suggestions = draft
    ? existing.filter(
        (t) => t.startsWith(normalizeTag(draft)) && !value.includes(t),
      ).slice(0, 4)
    : [];

  return (
    <div className="space-y-1.5">
      <div className="flex min-h-[44px] flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-2 py-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs"
          >
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              aria-label={`Remove ${t}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && !draft && value.length) {
              e.preventDefault();
              remove(value[value.length - 1]);
            }
          }}
          onBlur={commit}
          placeholder={value.length === 0 ? "Add tag…" : ""}
          className="min-w-[80px] flex-1 bg-transparent py-1 text-sm outline-none"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (!value.includes(s)) onChange([...value, s]);
                setDraft("");
              }}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground",
                "hover:bg-accent hover:text-foreground",
              )}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
