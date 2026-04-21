"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { IncomeForm } from "@/components/forms/income-form";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { formatCurrency } from "@/lib/format";

export default function IncomePage() {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);

  const entries = useBudget((s) => s.incomeEntries);
  const sources = useBudget((s) => s.incomeSources);
  const currency = useBudget((s) => s.settings.currency);
  const removeIncomeEntry = useBudget((s) => s.removeIncomeEntry);

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Income</h1>
          <p className="text-sm text-muted-foreground">Track what you earn from every source.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Log
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log income</DialogTitle>
            </DialogHeader>
            <IncomeForm onDone={() => setOpen(false)} />
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-muted-foreground">
              Nothing logged yet. Your first paycheck or side-project payment goes here.
            </p>
          ) : (
            <ul className="divide-y">
              {entries.map((e) => {
                const src = sources.find((s) => s.id === e.sourceId);
                return (
                  <li key={e.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{src?.name ?? "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {e.notes ? ` · ${e.notes}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-success num-tabular">
                        +{formatCurrency(e.amount, currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeIncomeEntry(e.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
