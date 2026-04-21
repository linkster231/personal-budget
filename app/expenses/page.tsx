"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ColorDot } from "@/components/ui/color-picker";
import { ExpenseForm } from "@/components/forms/expense-form";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { formatCurrency } from "@/lib/format";

export default function ExpensesPage() {
  const hydrated = useHydrated();
  const [expenseOpen, setExpenseOpen] = useState(false);

  const expenses = useBudget((s) => s.expenses);
  const categories = useBudget((s) => s.categories);
  const currency = useBudget((s) => s.settings.currency);
  const removeExpense = useBudget((s) => s.removeExpense);

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">
            One-off expenses. Recurring bills live in the <strong>Recurring</strong> tab.
          </p>
        </div>
        <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Log
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm onDone={() => setExpenseOpen(false)} />
          </DialogContent>
        </Dialog>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>All expenses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No expenses yet.</p>
          ) : (
            <ul className="divide-y">
              {expenses.map((e) => {
                const cat = categories.find((c) => c.id === e.categoryId);
                return (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <ColorDot hex={cat?.color} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{cat?.name ?? "Uncategorized"}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {e.scheduleInstanceKey ? " · from schedule" : ""}
                        {e.notes ? ` · ${e.notes}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold num-tabular">
                        −{formatCurrency(e.amount, currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExpense(e.id)}
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
