"use client";

import { useState } from "react";
import { Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorDot } from "@/components/ui/color-picker";
import { useBudget } from "@/lib/store";

/**
 * Manage saved "if notes contain X, categorize as Y" rules. Rules are also
 * created implicitly whenever an expense is logged with matching notes (the
 * ExpenseForm auto-match writes `recordPayeeRuleHit`). This UI lets users
 * see + edit + prune what's been learned.
 */
export function PayeeRulesEditor() {
  const rules = useBudget((s) => s.payeeRules);
  const categories = useBudget((s) => s.categories);
  const addRule = useBudget((s) => s.addPayeeRule);
  const removeRule = useBudget((s) => s.removePayeeRule);
  const updateRule = useBudget((s) => s.updatePayeeRule);

  const [draftPattern, setDraftPattern] = useState("");
  const [draftCategoryId, setDraftCategoryId] = useState(categories[0]?.id ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const pat = draftPattern.trim();
    if (!pat || !draftCategoryId) return;
    addRule({ pattern: pat, categoryId: draftCategoryId });
    setDraftPattern("");
  }

  const sorted = rules.slice().sort((a, b) => b.count - a.count);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Auto-categorize rules
        </CardTitle>
        <CardDescription>
          When an expense&apos;s notes contain the pattern, this category is pre-selected.
          Matching is case-insensitive substring.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[160px] space-y-1">
            <Label className="text-[10px] uppercase">Pattern (e.g. &quot;uber&quot;)</Label>
            <Input
              value={draftPattern}
              onChange={(e) => setDraftPattern(e.target.value)}
              placeholder="type a payee name…"
            />
          </div>
          <div className="flex-1 min-w-[160px] space-y-1">
            <Label className="text-[10px] uppercase">Category</Label>
            <Select value={draftCategoryId} onValueChange={setDraftCategoryId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={!draftPattern.trim()}>
            <Plus className="h-4 w-4" />
            Add rule
          </Button>
        </form>

        {sorted.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {sorted.map((r) => {
              const cat = categories.find((c) => c.id === r.categoryId);
              return (
                <li key={r.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{r.pattern}</code>
                  <span className="text-muted-foreground">→</span>
                  <ColorDot hex={cat?.color} size={8} />
                  <Select value={r.categoryId} onValueChange={(v) => updateRule(r.id, { categoryId: v })}>
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[11px] text-muted-foreground">
                    used {r.count}×
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => removeRule(r.id)} aria-label="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
