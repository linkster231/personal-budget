import type { BudgetState, Expense, IncomeEntry } from "./types";
import { monthKey } from "./format";

export function incomeForMonth(entries: IncomeEntry[], key: string): number {
  return entries
    .filter((e) => monthKey(e.date) === key)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function incomeForMonthBySource(
  entries: IncomeEntry[],
  key: string,
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const e of entries) {
    if (monthKey(e.date) !== key) continue;
    acc[e.sourceId] = (acc[e.sourceId] ?? 0) + e.amount;
  }
  return acc;
}

export function expensesForMonth(expenses: Expense[], key: string): number {
  return expenses
    .filter((e) => monthKey(e.date) === key)
    .reduce((sum, e) => sum + e.amount, 0);
}

export function expensesForMonthByCategory(
  expenses: Expense[],
  key: string,
): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const e of expenses) {
    if (monthKey(e.date) !== key) continue;
    acc[e.categoryId] = (acc[e.categoryId] ?? 0) + e.amount;
  }
  return acc;
}

export function upcomingBills(
  state: Pick<BudgetState, "bills" | "expenses">,
  today: Date,
  windowDays = 14,
) {
  const thisMonthKey = monthKey(today);
  const paidBillIdsThisMonth = new Set(
    state.expenses
      .filter((e) => e.billId && monthKey(e.date) === thisMonthKey)
      .map((e) => e.billId!),
  );
  const out: Array<{ bill: (typeof state.bills)[number]; dueDate: Date; daysUntil: number }> = [];
  for (const bill of state.bills) {
    if (!bill.isActive) continue;
    if (paidBillIdsThisMonth.has(bill.id)) continue;
    const due = new Date(today.getFullYear(), today.getMonth(), bill.dueDay);
    if (due < today) due.setMonth(due.getMonth() + 1);
    const daysUntil = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil <= windowDays) out.push({ bill, dueDate: due, daysUntil });
  }
  return out.sort((a, b) => a.daysUntil - b.daysUntil);
}
