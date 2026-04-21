"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/forms/expense-form";
import { BillForm } from "@/components/forms/bill-form";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Tab = "expenses" | "bills";

export default function ExpensesPage() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<Tab>("expenses");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [billOpen, setBillOpen] = useState(false);

  const expenses = useBudget((s) => s.expenses);
  const bills = useBudget((s) => s.bills);
  const categories = useBudget((s) => s.categories);
  const currency = useBudget((s) => s.settings.currency);
  const removeExpense = useBudget((s) => s.removeExpense);
  const removeBill = useBudget((s) => s.removeBill);
  const updateBill = useBudget((s) => s.updateBill);

  if (!hydrated) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Expenses & Bills</h1>
        <p className="text-sm text-muted-foreground">One-off expenses and recurring monthly bills.</p>
      </header>

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <TabButton active={tab === "expenses"} onClick={() => setTab("expenses")}>
          Expenses
        </TabButton>
        <TabButton active={tab === "bills"} onClick={() => setTab("bills")}>
          Recurring Bills
        </TabButton>
      </div>

      {tab === "expenses" ? (
        <>
          <div>
            <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Log expense
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log expense</DialogTitle>
                </DialogHeader>
                <ExpenseForm onDone={() => setExpenseOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="p-0">
              {expenses.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">No expenses yet.</p>
              ) : (
                <ul className="divide-y">
                  {expenses.map((e) => {
                    const cat = categories.find((c) => c.id === e.categoryId);
                    return (
                      <li key={e.id} className="flex items-center justify-between px-5 py-3">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{cat?.name ?? "Uncategorized"}</div>
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
        </>
      ) : (
        <>
          <div>
            <Dialog open={billOpen} onOpenChange={setBillOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" />
                  Add bill
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add recurring bill</DialogTitle>
                </DialogHeader>
                <BillForm onDone={() => setBillOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Recurring bills</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {bills.length === 0 ? (
                <p className="px-5 pb-5 text-sm text-muted-foreground">
                  No bills yet. Add rent, utilities, phone, insurance, subscriptions.
                </p>
              ) : (
                <ul className="divide-y">
                  {bills.map((b) => {
                    const cat = categories.find((c) => c.id === b.categoryId);
                    return (
                      <li key={b.id} className="flex items-center justify-between px-5 py-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{b.name}</span>
                            {!b.isActive && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs">paused</span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {cat?.name ?? "Uncategorized"} · due day {b.dueDay}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold num-tabular">{formatCurrency(b.amount, currency)}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateBill(b.id, { isActive: !b.isActive })}
                          >
                            {b.isActive ? "Pause" : "Resume"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeBill(b.id)}
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
        </>
      )}
    </div>
  );
}

function TabButton({
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
      className={cn(
        "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
