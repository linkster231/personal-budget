"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudget } from "@/lib/store";
import { DialogClose } from "@/components/ui/dialog";
import type { CategoryKind } from "@/lib/types";

export function CategoryForm({ onDone }: { onDone?: () => void }) {
  const addCategory = useBudget((s) => s.addCategory);
  const existingCount = useBudget((s) => s.categories.length);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("variable");
  const [target, setTarget] = useState("");
  const [priority, setPriority] = useState(String(existingCount + 1));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = parseFloat(target);
    const p = parseInt(priority, 10);
    if (!name || isNaN(t) || t < 0 || isNaN(p)) return;
    addCategory({ name, kind, targetMonthly: t, priority: p });
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="kind">Kind</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as CategoryKind)}>
          <SelectTrigger id="kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed (same every month)</SelectItem>
            <SelectItem value="variable">Variable (fluctuates)</SelectItem>
            <SelectItem value="sinking">Sinking (annual cost / 12)</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="target">Monthly target</Label>
          <Input id="target" type="number" inputMode="decimal" step="0.01" min="0" value={target} onChange={(e) => setTarget(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Input id="priority" type="number" inputMode="numeric" min="1" value={priority} onChange={(e) => setPriority(e.target.value)} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Lower priority numbers are funded first. Sinking-fund tip: divide the annual cost by 12.
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            Cancel
          </Button>
        </DialogClose>
        <Button type="submit">Add category</Button>
      </div>
    </form>
  );
}
