"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorDot } from "@/components/ui/color-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudget } from "@/lib/store";
import { totalPercent } from "@/lib/paycheck-split";
import { cn } from "@/lib/utils";
import type { PaycheckSplit } from "@/lib/types";

export function PaycheckSplitEditor() {
  const presets = useBudget((s) => s.settings.paycheckSplitPresets ?? []);
  const categories = useBudget((s) => s.categories);
  const setSettings = useBudget((s) => s.setSettings);

  const total = totalPercent(presets);
  const leftover = 100 - total;

  function update(next: PaycheckSplit[]) {
    setSettings({ paycheckSplitPresets: next });
  }

  function add() {
    const taken = new Set(presets.map((p) => p.categoryId));
    const firstFree = categories.find((c) => !taken.has(c.id));
    if (!firstFree) return;
    update([...presets, { categoryId: firstFree.id, percent: Math.max(0, Math.min(100, leftover)) }]);
  }

  function patch(i: number, p: Partial<PaycheckSplit>) {
    const next = presets.slice();
    next[i] = { ...next[i], ...p };
    update(next);
  }

  function remove(i: number) {
    update(presets.filter((_, j) => j !== i));
  }

  const unused = categories.filter((c) => !presets.some((p) => p.categoryId === c.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paycheck split preview</CardTitle>
        <CardDescription>
          Define how a paycheck should mentally divide across categories.
          Informational only — shown when logging income; nothing auto-posts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {presets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No presets yet. Add one below.</p>
        ) : (
          <ul className="space-y-2">
            {presets.map((p, i) => {
              const cat = categories.find((c) => c.id === p.categoryId);
              return (
                <li key={i} className="flex items-center gap-2">
                  <ColorDot hex={cat?.color} />
                  <Select value={p.categoryId} onValueChange={(v) => patch(i, { categoryId: v })}>
                    <SelectTrigger className="h-9 flex-1 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max="100"
                      step="1"
                      className="h-9 w-16 text-sm"
                      value={p.percent}
                      onChange={(e) => patch(i, { percent: parseFloat(e.target.value) || 0 })}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(i)} aria-label="Remove">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-center justify-between border-t pt-2">
          <Button size="sm" variant="outline" onClick={add} disabled={unused.length === 0}>
            <Plus className="h-4 w-4" />
            Add row
          </Button>
          <div className="text-xs">
            <span className="text-muted-foreground">Total </span>
            <span
              className={cn(
                "font-medium num-tabular",
                total === 100 ? "text-success" : total > 100 ? "text-destructive" : "text-warning",
              )}
            >
              {total}%
            </span>
            {total !== 100 && (
              <span className="ml-2 text-muted-foreground">
                ({leftover > 0 ? `${leftover}% unallocated` : `${-leftover}% over`})
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
