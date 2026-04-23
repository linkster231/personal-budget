import { uid } from "./utils";
import { SCHEMA_VERSION } from "./seed";
import { defaultColorFor } from "./colors";
import { isoLocal, addDaysLocal } from "./schedule-engine";
import type { BudgetState } from "./types";

/**
 * Demo dataset for first-run preview. Mirrors a typical variable-income
 * earner: paycheck + freelance, 6 categories, a dozen recent expenses, and
 * two recurring schedules.
 */
export function createSampleState(): BudgetState {
  const today = new Date();
  const todayISO = isoLocal(today);

  const primaryId = uid();
  const sideId = uid();

  const rent = uid();
  const groceries = uid();
  const utilities = uid();
  const gas = uid();
  const dining = uid();
  const savings = uid();

  const paycheckSchedule = uid();
  const rentSchedule = uid();

  const recentExpenses = [
    { amount: 1450, cat: rent, daysAgo: 0, notes: "Rent" },
    { amount: 82.4, cat: groceries, daysAgo: 2, notes: "Whole Foods" },
    { amount: 45, cat: gas, daysAgo: 3 },
    { amount: 28.5, cat: dining, daysAgo: 4, notes: "Thai place" },
    { amount: 115, cat: utilities, daysAgo: 5, notes: "Con Ed" },
    { amount: 62.8, cat: groceries, daysAgo: 7, notes: "Trader Joe's" },
    { amount: 12, cat: dining, daysAgo: 8, notes: "Coffee + pastry" },
    { amount: 18, cat: dining, daysAgo: 10 },
    { amount: 42.1, cat: gas, daysAgo: 12 },
    { amount: 95.3, cat: groceries, daysAgo: 14, notes: "Weekly haul" },
  ];

  const recentIncome = [
    { amount: 1900, source: primaryId, daysAgo: 1, notes: "Paycheck" },
    { amount: 420, source: sideId, daysAgo: 6, notes: "Freelance client A" },
    { amount: 1900, source: primaryId, daysAgo: 15, notes: "Paycheck" },
    { amount: 750, source: sideId, daysAgo: 19, notes: "Freelance client B" },
  ];

  return {
    version: SCHEMA_VERSION,
    incomeSources: [
      { id: primaryId, name: "Day job", kind: "primary", color: defaultColorFor(5) },
      { id: sideId, name: "Freelance", kind: "side", color: defaultColorFor(9) },
    ],
    incomeEntries: recentIncome.map((e) => ({
      id: uid(),
      sourceId: e.source,
      amount: e.amount,
      date: addDaysLocal(today, -e.daysAgo).toISOString(),
      notes: e.notes,
    })),
    categories: [
      { id: rent, name: "Rent", kind: "fixed", targetMonthly: 1450, priority: 1, color: defaultColorFor(1), icon: "home" },
      { id: utilities, name: "Utilities", kind: "fixed", targetMonthly: 130, priority: 2, color: defaultColorFor(2), icon: "zap" },
      { id: groceries, name: "Groceries", kind: "variable", targetMonthly: 400, priority: 3, color: defaultColorFor(5), icon: "shopping-cart" },
      { id: gas, name: "Gas", kind: "variable", targetMonthly: 200, priority: 4, color: defaultColorFor(3), icon: "fuel" },
      { id: dining, name: "Dining out", kind: "variable", targetMonthly: 150, priority: 5, color: defaultColorFor(7), icon: "utensils" },
      { id: savings, name: "Savings", kind: "savings", targetMonthly: 300, priority: 6, color: defaultColorFor(9), icon: "piggy-bank" },
    ],
    schedules: [
      {
        id: paycheckSchedule,
        name: "Paycheck",
        direction: "income",
        sourceId: primaryId,
        amountKind: "range",
        amountMin: 1700,
        amountMax: 2100,
        interval: { kind: "biweekly", dayOfWeek: 5, anchor: isoLocal(addDaysLocal(today, -1)) },
        startDate: isoLocal(addDaysLocal(today, -30)),
        notify: true,
        isActive: true,
        color: defaultColorFor(5),
      },
      {
        id: rentSchedule,
        name: "Rent",
        direction: "expense",
        categoryId: rent,
        amountKind: "fixed",
        amount: 1450,
        interval: { kind: "monthly", dayOfMonth: 1 },
        startDate: todayISO,
        notify: true,
        isActive: true,
        color: defaultColorFor(1),
      },
    ],
    skippedScheduleInstances: [],
    expenses: recentExpenses.map((e) => ({
      id: uid(),
      categoryId: e.cat,
      amount: e.amount,
      date: addDaysLocal(today, -e.daysAgo).toISOString(),
      notes: e.notes,
    })),
    plans: [],
    settings: {
      strategy: "last-month",
      baselineIncome: 3800,
      startingBalance: 2100,
      currency: "USD",
      firstDayOfMonth: 1,
      theme: "system",
      notificationsEnabled: false,
      paycheckSplitPresets: [
        { categoryId: rent, percent: 40 },
        { categoryId: groceries, percent: 15 },
        { categoryId: savings, percent: 15 },
      ],
    },
    payeeRules: [],
  };
}
