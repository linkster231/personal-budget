"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudget } from "@/lib/store";
import { DialogClose } from "@/components/ui/dialog";
import { PaycheckSplitSection } from "@/components/forms/paycheck-split-section";

export function IncomeForm({ onDone }: { onDone?: () => void }) {
  const sources = useBudget((s) => s.incomeSources);
  const addIncomeEntry = useBudget((s) => s.addIncomeEntry);

  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!sourceId || isNaN(n) || n <= 0) return;
    addIncomeEntry({ sourceId, amount: n, date: new Date(date).toISOString(), notes: notes || undefined });
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="source">Source</Label>
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger id="source">
            <SelectValue placeholder="Pick a source" />
          </SelectTrigger>
          <SelectContent>
            {sources.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name} <span className="ml-1 text-xs text-muted-foreground">({s.kind})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
        <Label htmlFor="date">Date received</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" placeholder="Client name, hours, etc." value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <PaycheckSplitSection amount={parseFloat(amount) || 0} />
      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Log income</Button>
      </div>
    </form>
  );
}
