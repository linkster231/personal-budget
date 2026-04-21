"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudget } from "@/lib/store";
import { DialogClose } from "@/components/ui/dialog";

export function BillForm({ onDone }: { onDone?: () => void }) {
  const categories = useBudget((s) => s.categories);
  const addBill = useBudget((s) => s.addBill);

  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDay, setDueDay] = useState("1");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    const d = parseInt(dueDay, 10);
    if (!categoryId || !name || isNaN(n) || n <= 0 || isNaN(d) || d < 1 || d > 31) return;
    addBill({ categoryId, name, amount: n, dueDay: d, isActive: true });
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Bill name</Label>
        <Input id="name" placeholder="e.g. Rent, T-Mobile, Car insurance" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="category">
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
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dueDay">Due day (1–31)</Label>
          <Input id="dueDay" type="number" inputMode="numeric" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Save bill</Button>
      </div>
    </form>
  );
}
