import type { BudgetState, Expense, IncomeEntry, ScheduleInstance } from "./types";
import { monthKey } from "./format";
import {
  materializeInstances,
  parseLocal,
  startOfDay,
  isoLocal,
  addDaysLocal,
} from "./schedule-engine";

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

/**
 * Current balance = startingBalance + all income - all expenses, through today.
 */
export function currentBalance(state: Pick<BudgetState, "incomeEntries" | "expenses" | "settings">): number {
  const today = startOfDay(new Date());
  const income = state.incomeEntries
    .filter((e) => new Date(e.date) <= today)
    .reduce((s, e) => s + e.amount, 0);
  const expense = state.expenses
    .filter((e) => new Date(e.date) <= today)
    .reduce((s, e) => s + e.amount, 0);
  return state.settings.startingBalance + income - expense;
}

/**
 * Upcoming schedule instances (not yet posted/skipped) within a window.
 * Also includes overdue items from before today.
 */
export function upcomingInstances(
  state: Pick<BudgetState, "schedules" | "incomeEntries" | "expenses" | "skippedScheduleInstances">,
  today: Date,
  windowDays = 14,
): ScheduleInstance[] {
  const start = addDaysLocal(startOfDay(today), -30); // include overdue up to 30 days
  const end = addDaysLocal(startOfDay(today), windowDays);
  const all = materializeInstances({
    schedules: state.schedules,
    incomeEntries: state.incomeEntries,
    expenses: state.expenses,
    skipped: state.skippedScheduleInstances,
    rangeStart: start,
    rangeEnd: end,
    today,
  });
  return all.filter((i) => i.status === "pending" || i.status === "overdue");
}

/**
 * Count of instances that need action today (due today or overdue).
 * Used for the notification badge.
 */
export function pendingActionCount(
  state: Pick<BudgetState, "schedules" | "incomeEntries" | "expenses" | "skippedScheduleInstances">,
  today: Date,
): number {
  const start = addDaysLocal(startOfDay(today), -60);
  const end = startOfDay(today);
  const all = materializeInstances({
    schedules: state.schedules,
    incomeEntries: state.incomeEntries,
    expenses: state.expenses,
    skipped: state.skippedScheduleInstances,
    rangeStart: start,
    rangeEnd: end,
    today,
  });
  return all.filter((i) => i.status === "pending" || i.status === "overdue").length;
}

/**
 * Daily cash flow over a window: for each day, actual income in / expenses out
 * plus EXPECTED (pending) schedule instances that fall on that day.
 */
export type DailyFlow = {
  date: string; // ISO YYYY-MM-DD
  actualIncome: number;
  actualExpense: number;
  expectedIncome: number; // from pending schedule instances
  expectedExpense: number;
};

export function dailyFlow(
  state: Pick<
    BudgetState,
    "incomeEntries" | "expenses" | "schedules" | "skippedScheduleInstances"
  >,
  rangeStart: Date,
  rangeEnd: Date,
  today: Date,
): DailyFlow[] {
  const days: Record<string, DailyFlow> = {};
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const iso = isoLocal(cursor);
    days[iso] = { date: iso, actualIncome: 0, actualExpense: 0, expectedIncome: 0, expectedExpense: 0 };
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const e of state.incomeEntries) {
    const iso = e.date.slice(0, 10);
    if (days[iso]) days[iso].actualIncome += e.amount;
  }
  for (const e of state.expenses) {
    const iso = e.date.slice(0, 10);
    if (days[iso]) days[iso].actualExpense += e.amount;
  }

  const instances = materializeInstances({
    schedules: state.schedules,
    incomeEntries: state.incomeEntries,
    expenses: state.expenses,
    skipped: state.skippedScheduleInstances,
    rangeStart,
    rangeEnd,
    today,
  });
  for (const inst of instances) {
    if (inst.status !== "pending" && inst.status !== "overdue") continue;
    const d = days[inst.date];
    if (!d) continue;
    const schedule = state.schedules.find((s) => s.id === inst.scheduleId);
    if (!schedule) continue;
    if (schedule.direction === "income") d.expectedIncome += inst.expectedAmount;
    else d.expectedExpense += inst.expectedAmount;
  }

  return Object.values(days).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Projected daily balance trajectory starting from `startingBalance + actual
 * through yesterday` and applying all scheduled (expected) + actual entries
 * going forward.
 */
export type BalancePoint = { date: string; balance: number };

export function projectedBalance(
  state: Pick<
    BudgetState,
    "incomeEntries" | "expenses" | "schedules" | "skippedScheduleInstances" | "settings"
  >,
  rangeStart: Date,
  rangeEnd: Date,
  today: Date,
): BalancePoint[] {
  // Starting balance = startingBalance + actuals BEFORE rangeStart
  const preStart = state.incomeEntries
    .filter((e) => parseLocal(e.date.slice(0, 10)) < rangeStart)
    .reduce((s, e) => s + e.amount, 0);
  const preStartExp = state.expenses
    .filter((e) => parseLocal(e.date.slice(0, 10)) < rangeStart)
    .reduce((s, e) => s + e.amount, 0);
  let running = state.settings.startingBalance + preStart - preStartExp;

  const flow = dailyFlow(state, rangeStart, rangeEnd, today);
  const out: BalancePoint[] = [];
  for (const day of flow) {
    running += day.actualIncome - day.actualExpense + day.expectedIncome - day.expectedExpense;
    out.push({ date: day.date, balance: running });
  }
  return out;
}
