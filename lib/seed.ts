import { uid } from "./utils";
import type { BudgetState, Category, IncomeSource } from "./types";

export const SCHEMA_VERSION = 1;

function seedCategories(): Category[] {
  const base: Array<Omit<Category, "id">> = [
    { name: "Rent / Mortgage", kind: "fixed", targetMonthly: 0, priority: 1, icon: "home" },
    { name: "Utilities", kind: "fixed", targetMonthly: 0, priority: 2, icon: "zap" },
    { name: "Internet & Phone", kind: "fixed", targetMonthly: 0, priority: 3, icon: "wifi" },
    { name: "Groceries", kind: "variable", targetMonthly: 0, priority: 4, icon: "shopping-cart" },
    { name: "Transportation", kind: "variable", targetMonthly: 0, priority: 5, icon: "car" },
    { name: "Insurance (auto)", kind: "sinking", targetMonthly: 0, priority: 6, icon: "shield" },
    { name: "Dining & Entertainment", kind: "variable", targetMonthly: 0, priority: 7, icon: "utensils" },
    { name: "Emergency Fund", kind: "savings", targetMonthly: 0, priority: 8, icon: "piggy-bank" },
  ];
  return base.map((c) => ({ ...c, id: uid() }));
}

function seedIncomeSources(): IncomeSource[] {
  return [
    { id: uid(), name: "Primary Job", kind: "primary" },
    { id: uid(), name: "Side Projects", kind: "side" },
  ];
}

export function createInitialState(): BudgetState {
  return {
    version: SCHEMA_VERSION,
    incomeSources: seedIncomeSources(),
    incomeEntries: [],
    categories: seedCategories(),
    bills: [],
    expenses: [],
    plans: [],
    settings: {
      strategy: "last-month",
      baselineIncome: 0,
      currency: "USD",
      firstDayOfMonth: 1,
      theme: "system",
    },
  };
}
