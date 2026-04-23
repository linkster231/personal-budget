"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  BudgetState,
  BudgetPlan,
  Category,
  Expense,
  IncomeEntry,
  IncomeSource,
  RecurringSchedule,
  Settings,
  Strategy,
} from "./types";
import { createInitialState, SCHEMA_VERSION } from "./seed";
import { defaultColorFor } from "./colors";
import { uid } from "./utils";
import { instanceKey } from "./schedule-engine";

type Actions = {
  // income sources
  addIncomeSource: (s: Omit<IncomeSource, "id">) => void;
  updateIncomeSource: (id: string, patch: Partial<IncomeSource>) => void;
  removeIncomeSource: (id: string) => void;
  // income entries
  addIncomeEntry: (e: Omit<IncomeEntry, "id">) => void;
  updateIncomeEntry: (id: string, patch: Partial<IncomeEntry>) => void;
  removeIncomeEntry: (id: string) => void;

  // categories
  addCategory: (c: Omit<Category, "id">) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;

  // recurring schedules
  addSchedule: (s: Omit<RecurringSchedule, "id">) => void;
  updateSchedule: (id: string, patch: Partial<RecurringSchedule>) => void;
  removeSchedule: (id: string) => void;

  // schedule instance actions
  /** Log an actual income/expense against a scheduled instance. */
  postScheduleInstance: (
    scheduleId: string,
    dateISO: string,
    amount: number,
    notes?: string,
  ) => void;
  /** Mark an instance as skipped (didn't happen this cycle). */
  skipScheduleInstance: (scheduleId: string, dateISO: string) => void;
  /** Undo skip/post — removes any record of the instance being acted on. */
  unskipScheduleInstance: (scheduleId: string, dateISO: string) => void;

  // expenses
  addExpense: (e: Omit<Expense, "id">) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  removeExpense: (id: string) => void;

  // plans
  upsertPlan: (plan: BudgetPlan) => void;
  removePlan: (month: string) => void;

  // settings
  setStrategy: (s: Strategy) => void;
  setSettings: (patch: Partial<Settings>) => void;

  // data
  exportJSON: () => string;
  importJSON: (json: string) => { ok: true } | { ok: false; error: string };
  resetAll: () => void;
  /** Replace the entire canonical dataset. Used by what-if apply. */
  bulkReplace: (next: BudgetState) => void;
};

export type Store = BudgetState & Actions;

/**
 * v1 → v2 migration: bills become monthly expense schedules. Categories and
 * income sources without colors get default palette colors assigned by index.
 * Settings gain startingBalance + notificationsEnabled with safe defaults.
 */
function migrateV1toV2(v1: any): BudgetState {
  const incomeSources: IncomeSource[] = (v1.incomeSources ?? []).map(
    (s: IncomeSource, i: number) => ({ ...s, color: s.color ?? defaultColorFor(i + 5) }),
  );
  const categories: Category[] = (v1.categories ?? []).map((c: Category, i: number) => ({
    ...c,
    color: c.color ?? defaultColorFor(i),
  }));
  const schedules: RecurringSchedule[] = ((v1.bills ?? []) as Array<{
    id: string;
    categoryId: string;
    name: string;
    amount: number;
    dueDay: number;
    isActive: boolean;
  }>).map((b) => ({
    id: b.id,
    name: b.name,
    direction: "expense" as const,
    categoryId: b.categoryId,
    amountKind: "fixed" as const,
    amount: b.amount,
    interval: { kind: "monthly" as const, dayOfMonth: b.dueDay },
    startDate: new Date().toISOString().slice(0, 10),
    notify: false,
    isActive: b.isActive,
  }));

  const base = createInitialState();
  return {
    version: SCHEMA_VERSION,
    incomeSources,
    incomeEntries: v1.incomeEntries ?? [],
    categories,
    schedules,
    skippedScheduleInstances: [],
    expenses: v1.expenses ?? [],
    plans: v1.plans ?? [],
    settings: { ...base.settings, ...(v1.settings ?? {}) },
  };
}

export const useBudget = create<Store>()(
  persist(
    (set, get) => ({
      ...createInitialState(),

      addIncomeSource: (s) =>
        set((st) => ({ incomeSources: [...st.incomeSources, { ...s, id: uid() }] })),
      updateIncomeSource: (id, patch) =>
        set((st) => ({
          incomeSources: st.incomeSources.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeIncomeSource: (id) =>
        set((st) => ({ incomeSources: st.incomeSources.filter((x) => x.id !== id) })),

      addIncomeEntry: (e) =>
        set((st) => ({ incomeEntries: [{ ...e, id: uid() }, ...st.incomeEntries] })),
      updateIncomeEntry: (id, patch) =>
        set((st) => ({
          incomeEntries: st.incomeEntries.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeIncomeEntry: (id) =>
        set((st) => ({ incomeEntries: st.incomeEntries.filter((x) => x.id !== id) })),

      addCategory: (c) =>
        set((st) => ({ categories: [...st.categories, { ...c, id: uid() }] })),
      updateCategory: (id, patch) =>
        set((st) => ({
          categories: st.categories.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeCategory: (id) =>
        set((st) => ({ categories: st.categories.filter((x) => x.id !== id) })),

      addSchedule: (s) =>
        set((st) => ({ schedules: [...st.schedules, { ...s, id: uid() }] })),
      updateSchedule: (id, patch) =>
        set((st) => ({
          schedules: st.schedules.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeSchedule: (id) =>
        set((st) => ({ schedules: st.schedules.filter((x) => x.id !== id) })),

      postScheduleInstance: (scheduleId, dateISO, amount, notes) => {
        const st = get();
        const schedule = st.schedules.find((s) => s.id === scheduleId);
        if (!schedule) return;
        const key = instanceKey(scheduleId, dateISO);
        const existingIncome = st.incomeEntries.find((e) => e.scheduleInstanceKey === key);
        const existingExpense = st.expenses.find((e) => e.scheduleInstanceKey === key);
        if (existingIncome || existingExpense) return; // already posted
        const dateIso = new Date(dateISO + "T12:00:00").toISOString();
        if (schedule.direction === "income" && schedule.sourceId) {
          set((s) => ({
            incomeEntries: [
              {
                id: uid(),
                sourceId: schedule.sourceId!,
                amount,
                date: dateIso,
                notes,
                scheduleInstanceKey: key,
              },
              ...s.incomeEntries,
            ],
            skippedScheduleInstances: s.skippedScheduleInstances.filter((k) => k !== key),
          }));
        } else if (schedule.direction === "expense" && schedule.categoryId) {
          set((s) => ({
            expenses: [
              {
                id: uid(),
                categoryId: schedule.categoryId!,
                amount,
                date: dateIso,
                notes,
                scheduleInstanceKey: key,
              },
              ...s.expenses,
            ],
            skippedScheduleInstances: s.skippedScheduleInstances.filter((k) => k !== key),
          }));
        }
      },

      skipScheduleInstance: (scheduleId, dateISO) => {
        const key = instanceKey(scheduleId, dateISO);
        set((st) => ({
          skippedScheduleInstances: st.skippedScheduleInstances.includes(key)
            ? st.skippedScheduleInstances
            : [...st.skippedScheduleInstances, key],
        }));
      },

      unskipScheduleInstance: (scheduleId, dateISO) => {
        const key = instanceKey(scheduleId, dateISO);
        set((st) => ({
          skippedScheduleInstances: st.skippedScheduleInstances.filter((k) => k !== key),
          incomeEntries: st.incomeEntries.filter((e) => e.scheduleInstanceKey !== key),
          expenses: st.expenses.filter((e) => e.scheduleInstanceKey !== key),
        }));
      },

      addExpense: (e) =>
        set((st) => ({ expenses: [{ ...e, id: uid() }, ...st.expenses] })),
      updateExpense: (id, patch) =>
        set((st) => ({
          expenses: st.expenses.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeExpense: (id) =>
        set((st) => ({ expenses: st.expenses.filter((x) => x.id !== id) })),

      upsertPlan: (plan) =>
        set((st) => {
          const without = st.plans.filter((p) => p.month !== plan.month);
          return { plans: [...without, plan].sort((a, b) => a.month.localeCompare(b.month)) };
        }),
      removePlan: (month) =>
        set((st) => ({ plans: st.plans.filter((p) => p.month !== month) })),

      setStrategy: (s) => set((st) => ({ settings: { ...st.settings, strategy: s } })),
      setSettings: (patch) =>
        set((st) => ({ settings: { ...st.settings, ...patch } })),

      exportJSON: () => {
        const st = get();
        const snapshot = {
          version: st.version,
          incomeSources: st.incomeSources,
          incomeEntries: st.incomeEntries,
          categories: st.categories,
          schedules: st.schedules,
          skippedScheduleInstances: st.skippedScheduleInstances,
          expenses: st.expenses,
          plans: st.plans,
          settings: st.settings,
          exportedAt: new Date().toISOString(),
        };
        return JSON.stringify(snapshot, null, 2);
      },
      importJSON: (json) => {
        try {
          const parsed = JSON.parse(json);
          if (typeof parsed !== "object" || parsed === null) {
            return { ok: false, error: "Not a valid JSON object." };
          }
          let next: BudgetState;
          if (parsed.version === SCHEMA_VERSION) {
            const base = createInitialState();
            next = {
              version: SCHEMA_VERSION,
              incomeSources: parsed.incomeSources ?? [],
              incomeEntries: parsed.incomeEntries ?? [],
              categories: parsed.categories ?? [],
              schedules: parsed.schedules ?? [],
              skippedScheduleInstances: parsed.skippedScheduleInstances ?? [],
              expenses: parsed.expenses ?? [],
              plans: parsed.plans ?? [],
              settings: { ...base.settings, ...(parsed.settings ?? {}) },
            };
          } else if (parsed.version === 1) {
            next = migrateV1toV2(parsed);
          } else {
            return {
              ok: false,
              error: `Unsupported schema version ${parsed.version}; expected ${SCHEMA_VERSION}.`,
            };
          }
          set(next);
          return { ok: true };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
      resetAll: () => set(createInitialState()),
      bulkReplace: (next) => set(next),
    }),
    {
      name: "personal-budget-v1",
      storage: createJSONStorage(() => localStorage),
      version: SCHEMA_VERSION,
      migrate: (persisted: any, version) => {
        if (version < 2) return migrateV1toV2(persisted);
        return persisted as BudgetState;
      },
    },
  ),
);
