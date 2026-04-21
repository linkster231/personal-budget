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
  /** Key of the schedule instance this entry posted, if any: `<scheduleId>:<YYYY-MM-DD>`. */
  scheduleInstanceKey?: string;
};

export type CategoryKind = "fixed" | "variable" | "sinking" | "savings";

export type Category = {
  id: string;
  name: string;
  kind: CategoryKind;
  targetMonthly: number;
  priority: number;
  color?: string;
  icon?: string;
};

export type Expense = {
  id: string;
  categoryId: string;
  amount: number;
  date: string; // ISO
  notes?: string;
  /** If this expense posted a scheduled recurring item. */
  scheduleInstanceKey?: string;
  /** Legacy v1 field; preserved after migration for historical data. */
  billId?: string;
};

/* -------------------------------------------------------------------------- */
/*  Recurring schedules (v2): unified for income + expenses                   */
/* -------------------------------------------------------------------------- */

/**
 * An Interval describes WHEN a schedule repeats. All fields that refer to a
 * day of week use 0=Sun..6=Sat. Days of month are 1..31 (clamped to last day
 * of the month if the month is shorter).
 */
export type Interval =
  | { kind: "weekly"; dayOfWeek: number }
  | { kind: "biweekly"; dayOfWeek: number; anchor: string /* ISO date */ }
  | { kind: "semi-monthly"; days: [number, number] }
  | { kind: "monthly"; dayOfMonth: number }
  | { kind: "quarterly"; startMonth: number /* 1..12 */; day: number }
  | { kind: "yearly"; month: number /* 1..12 */; day: number }
  | { kind: "custom"; everyDays: number; anchor: string /* ISO date */ };

export type ScheduleDirection = "income" | "expense";
export type AmountKind = "fixed" | "range";

export type RecurringSchedule = {
  id: string;
  name: string;
  direction: ScheduleDirection;
  /** Required when direction === "income". */
  sourceId?: string;
  /** Required when direction === "expense". */
  categoryId?: string;

  amountKind: AmountKind;
  /** Used when amountKind === "fixed" (also a default for "range"). */
  amount?: number;
  /** Used when amountKind === "range". */
  amountMin?: number;
  amountMax?: number;

  interval: Interval;
  /** ISO date: first possible occurrence. */
  startDate: string;
  /** ISO date: no occurrences after this date. */
  endDate?: string;

  /** Fire a browser notification (if user has enabled them) when this is due. */
  notify: boolean;
  isActive: boolean;
  color?: string;
  notes?: string;
};

/**
 * An "instance" isn't persisted — it's derived from a schedule for a given
 * date. We track posted instances via `scheduleInstanceKey` embedded in
 * IncomeEntry/Expense, and skipped instances in a top-level string[] below.
 */
export type ScheduleInstance = {
  scheduleId: string;
  /** ISO date. */
  date: string;
  /** Key format: `<scheduleId>:<YYYY-MM-DD>`. */
  key: string;
  /** The schedule's current expected amount at the time of generation. */
  expectedAmount: number;
  status: "pending" | "posted" | "skipped" | "overdue";
  /** Present only when status === "posted". */
  postedEntryId?: string;
  postedAmount?: number;
};

/* -------------------------------------------------------------------------- */

export type BudgetPlan = {
  month: string; // YYYY-MM
  strategy: Strategy;
  allocations: Record<string, number>;
  plannedIncome: number;
};

export type Settings = {
  strategy: Strategy;
  baselineIncome: number;
  /** User's best estimate of their current cash position; used to project forward. */
  startingBalance: number;
  currency: string;
  firstDayOfMonth: number;
  theme: "light" | "dark" | "system";
  /** Granted permission to show browser notifications. */
  notificationsEnabled: boolean;
};

export type BudgetState = {
  version: number;
  incomeSources: IncomeSource[];
  incomeEntries: IncomeEntry[];
  categories: Category[];
  schedules: RecurringSchedule[];
  /** Instance keys the user has explicitly skipped; never auto-posted. */
  skippedScheduleInstances: string[];
  expenses: Expense[];
  plans: BudgetPlan[];
  settings: Settings;
};
