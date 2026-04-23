import type { BudgetState } from "./types";
import { currentBalance } from "./selectors";
import { materializeInstances, daysInMonth, startOfDay } from "./schedule-engine";

export type SafeToSpendResult = {
  /** Dollars per day you can spend without blowing the month. Floor at 0. */
  daily: number;
  /** Net dollars remaining this month after expected in/out. Can be negative. */
  remaining: number;
  /** Days left in the month (inclusive of today). */
  daysLeft: number;
  /** Sum of pending + overdue expense instances in the current month. */
  pendingExpense: number;
  /** Sum of pending income instances in the current month. */
  pendingIncome: number;
  /** True when remaining is negative — user is already over-committed. */
  overspent: boolean;
};

/**
 * Current-month "safe to spend today" calculation.
 *
 *   remaining = currentBalance + pendingIncomeThisMonth - pendingExpenseThisMonth
 *   daily     = remaining / daysLeftInMonth   (floor at 0)
 *
 * Pending income is included because for variable-income users, a scheduled
 * paycheck later in the month is meaningful — if we ignore it the number is
 * artificially pessimistic. Users who prefer conservative accounting can just
 * avoid scheduling income until it's actually received.
 */
export function safeToSpendToday(
  state: Pick<
    BudgetState,
    "incomeEntries" | "expenses" | "schedules" | "skippedScheduleInstances" | "settings"
  >,
  today: Date,
): SafeToSpendResult {
  const balance = currentBalance({
    incomeEntries: state.incomeEntries,
    expenses: state.expenses,
    settings: state.settings,
  });
  const t = startOfDay(today);
  const daysInMon = daysInMonth(t.getFullYear(), t.getMonth());
  const daysLeft = daysInMon - t.getDate() + 1;
  const monthEnd = new Date(t.getFullYear(), t.getMonth(), daysInMon);

  const instances = materializeInstances({
    schedules: state.schedules,
    incomeEntries: state.incomeEntries,
    expenses: state.expenses,
    skipped: state.skippedScheduleInstances,
    rangeStart: t,
    rangeEnd: monthEnd,
    today: t,
  });

  let pendingExpense = 0;
  let pendingIncome = 0;
  for (const inst of instances) {
    if (inst.status !== "pending" && inst.status !== "overdue") continue;
    const schedule = state.schedules.find((s) => s.id === inst.scheduleId);
    if (!schedule) continue;
    if (schedule.direction === "expense") pendingExpense += inst.expectedAmount;
    else pendingIncome += inst.expectedAmount;
  }

  const remaining = balance + pendingIncome - pendingExpense;
  const overspent = remaining < 0;
  const daily = overspent ? 0 : remaining / Math.max(1, daysLeft);

  return { daily, remaining, daysLeft, pendingExpense, pendingIncome, overspent };
}
