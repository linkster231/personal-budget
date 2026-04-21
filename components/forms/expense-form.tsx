"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudget } from "@/lib/store";
import { DialogClose } from "@/components/ui/dialog";

export function ExpenseForm({ onDone }: { onDone?: () => void }) {
  const categories = useBudget((s) => s.categories);
  const bills = useBudget((s) => s.bills);
  const addExpense = useBudget((s) => s.addExpense);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billId, setBillId] = useState<string | "none">("none");
  const [notes, setNotes] = useState("");

  const eligibleBills = bills.filter((b) => b.isActive && b.categoryId === categoryId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (!categoryId || isNaN(n) || n <= 0) return;
    addExpense({
      categoryId,
      amount: n,
      date: new Date(date).toISOString(),
      billId: billId === "none" ? undefined : billId,
      notes: notes || undefined,
    });
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setBillId("none"); }}>
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
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {eligibleBills.length > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="bill">Paying a bill?</Label>
          <Select value={billId} onValueChange={setBillId}>
            <SelectTrigger id="bill">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not a bill payment</SelectItem>
              {eligibleBills.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
