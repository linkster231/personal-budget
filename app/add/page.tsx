"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";

/**
 * URL-driven quick-add route. Intended for iOS Shortcut bridge:
 *   https://.../add?type=expense&amount=12.50&category=<id>&notes=...
 *   https://.../add?type=income&amount=450&source=<id>&notes=...
 *
 * Renders a pre-filled form with one tap to confirm. Any missing/invalid
 * params fall back to interactive fields.
 */
export default function QuickAddPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
      <QuickAddInner />
    </Suspense>
  );
}

function QuickAddInner() {
  const hydrated = useHydrated();
  const router = useRouter();
  const params = useSearchParams();
  const categories = useBudget((s) => s.categories);
  const sources = useBudget((s) => s.incomeSources);
  const addIncomeEntry = useBudget((s) => s.addIncomeEntry);
  const addExpense = useBudget((s) => s.addExpense);

  const initialType = (params.get("type") ?? "expense") as "income" | "expense";
  const [type, setType] = useState<"income" | "expense">(
    initialType === "income" ? "income" : "expense",
  );
  const [amount, setAmount] = useState(params.get("amount") ?? "");
  const [notes, setNotes] = useState(params.get("notes") ?? "");
  const [categoryId, setCategoryId] = useState(
    params.get("category") ?? categories[0]?.id ?? "",
  );
  const [sourceId, setSourceId] = useState(
    params.get("source") ?? sources[0]?.id ?? "",
  );
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [done, setDone] = useState(false);

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading…</p>;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) return;
    if (type === "income") {
      if (!sourceId) return;
      addIncomeEntry({
        sourceId,
        amount: n,
        date: new Date(date).toISOString(),
        notes: notes || undefined,
      });
    } else {
      if (!categoryId) return;
      addExpense({
        categoryId,
        amount: n,
        date: new Date(date).toISOString(),
        notes: notes || undefined,
      });
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-7 w-7" />
            </div>
            <div>
              <div className="text-lg font-semibold">Logged</div>
              <div className="text-sm text-muted-foreground">
                {type === "income" ? "Income" : "Expense"} saved locally.
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/")}>
                Dashboard
              </Button>
              <Button
                onClick={() => {
                  setDone(false);
                  setAmount("");
                  setNotes("");
                }}
              >
                Log another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <Link href="/" className="text-muted-foreground hover:text-foreground" aria-label="Cancel">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quick add</h1>
          <p className="text-sm text-muted-foreground">
            Pre-filled from URL. Confirm or tweak, then save.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{type === "income" ? "Log income" : "Log expense"}</CardTitle>
          <CardDescription>
            {initialType !== type && "You switched type from the URL default."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="flex gap-1 rounded-lg bg-muted p-1">
              <TypeButton active={type === "expense"} onClick={() => setType("expense")}>
                Expense
              </TypeButton>
              <TypeButton active={type === "income"} onClick={() => setType("income")}>
                Income
              </TypeButton>
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

            {type === "income" ? (
              <div className="space-y-1.5">
                <Label htmlFor="source">Source</Label>
                <Select value={sourceId} onValueChange={setSourceId}>
                  <SelectTrigger id="source">
                    <SelectValue placeholder="Pick a source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
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
            )}

            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => router.push("/")}>
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit">
                <Check className="h-4 w-4" />
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function TypeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex-1 rounded-md bg-background px-3 py-1.5 text-sm font-medium shadow-sm"
          : "flex-1 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}
