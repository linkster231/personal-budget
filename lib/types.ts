export type Strategy = "last-month" | "baseline" | "priority";

export type IncomeSourceKind = "primary" | "side" | "other";

export type IncomeSource = {
  id: string;
  name: string;
  kind: IncomeSourceKind;
  color?: string;
};

export type IncomeEntry = {
  id: string;
  sourceId: string;
  amount: number;
  date: string; // ISO
  notes?: string;
};

export type CategoryKind = "fixed" | "variable" | "sinking" | "savings";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  /** Monthly target for planning; for sinking funds this is annualCost / 12. */
  targetMonthly: number;
  /** Lower numbers = higher priority (used by priority-allocation strategy). */
  priority: number;
  color?: string;
  icon?: string;
};

export type Bill = {
  id: string;
  categoryId: string;
  name: string;
  amount: number;
  dueDay: number; // 1..31
  isActive: boolean;
};

export type Expense = {
  id: string;
  categoryId: string;
  amount: number;
  date: string; // ISO
  notes?: string;
  billId?: string; // if this expense settled a bill
};

export type BudgetPlan = {
  month: string; // YYYY-MM
  strategy: Strategy;
  /** Dollars allocated per category. Sum should equal plannedIncome. */
  allocations: Record<string, number>;
  plannedIncome: number;
};

export type Settings = {
  strategy: Strategy;
  baselineIncome: number;
  currency: string;
  firstDayOfMonth: number;
  theme: "light" | "dark" | "system";
};

export type BudgetState = {
  version: number;
  incomeSources: IncomeSource[];
  incomeEntries: IncomeEntry[];
  categories: Category[];
  bills: Bill[];
  expenses: Expense[];
  plans: BudgetPlan[];
  settings: Settings;
};
