"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MonthSwitcher } from "@/components/dashboard/month-switcher";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { UpcomingItems } from "@/components/dashboard/upcoming-items";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { IncomeForm } from "@/components/forms/income-form";
import { ExpenseForm } from "@/components/forms/expense-form";
import { useBudget } from "@/lib/store";
import { useHydrated } from "@/lib/use-hydrated";
import { monthKey } from "@/lib/format";
import { incomeForMonth, expensesForMonth } from "@/lib/selectors";

export default function DashboardPage() {
  const hydrated = useHydrated();
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [incomeOpen, setIncomeOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);

  const incomeEntries = useBudget((s) => s.incomeEntries);
  const expenses = useBudget((s) => s.expenses);
  const currency = useBudget((s) => s.settings.currency);

  const income = hydrated ? incomeForMonth(incomeEntries, month) : 0;
  const spent = hydrated ? expensesForMonth(expenses, month) : 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Private · local to this device · nothing is sent to a server.
          </p>
        </div>
        <MonthSwitcher month={month} onChange={setMonth} />
      </header>

      <BalanceCard />

      <SummaryCards income={income} spent={spent} remaining={income - spent} currency={currency} />

      <div className="flex flex-wrap gap-2">
        <Dialog open={incomeOpen} onOpenChange={setIncomeOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Log income
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log income</DialogTitle>
            </DialogHeader>
            <IncomeForm onDone={() => setIncomeOpen(false)} />
          </DialogContent>
        </Dialog>

        <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
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

      <CashFlowChart />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UpcomingItems />
        <RecentActivity />
      </div>
    </div>
  );
}
