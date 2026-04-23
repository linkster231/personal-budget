"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudget } from "@/lib/store";
import { DialogClose } from "@/components/ui/dialog";
import { TagInput } from "@/components/forms/tag-input";
import { matchPayeeRule } from "@/lib/rules";

export function ExpenseForm({ onDone }: { onDone?: () => void }) {
  const categories = useBudget((s) => s.categories);
  const rules = useBudget((s) => s.payeeRules);
  const addExpense = useBudget((s) => s.addExpense);
  const recordRuleHit = useBudget((s) => s.recordPayeeRuleHit);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [ruleApplied, setRuleApplied] = useState<string | null>(null);
  const [manuallyPickedCategory, setManuallyPickedCategory] = useState(false);

  // Auto-categorize when notes change, unless user has manually picked
  useEffect(() => {
    if (manuallyPickedCategory) return;
    const rule = matchPayeeRule(notes, rules);
    if (rule && rule.categoryId !== categoryId) {
      setCategoryId(rule.categoryId);
      setRuleApplied(rule.id);
    } else if (!rule && ruleApplied) {
      setRuleApplied(null);
    }
  }, [notes, rules, categoryId, manuallyPickedCategory, ruleApplied]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!categoryId || isNaN(n) || n <= 0) return;
    addExpense({
      categoryId,
      amount: n,
      date: new Date(date).toISOString(),
      notes: notes || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    if (ruleApplied) recordRuleHit(ruleApplied);
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Payee / notes</Label>
        <Input
          id="notes"
          placeholder="e.g. Trader Joe's, Uber, Netflix"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v);
            setManuallyPickedCategory(true);
            setRuleApplied(null);
          }}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Pick a category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {ruleApplied && (
          <p className="flex items-center gap-1 text-[11px] text-primary">
            <Sparkles className="h-3 w-3" />
            Auto-categorized by saved rule.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label>Tags (optional)</Label>
        <TagInput value={tags} onChange={setTags} />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Log expense</Button>
      </div>
    </form>
  );
}
