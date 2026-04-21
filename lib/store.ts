"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  BudgetState,
  Bill,
  BudgetPlan,
  Category,
  Expense,
  IncomeEntry,
  IncomeSource,
  Settings,
  Strategy,
} from "./types";
import { createInitialState, SCHEMA_VERSION } from "./seed";
import { uid } from "./utils";

type Actions = {
  // income
  addIncomeSource: (s: Omit<IncomeSource, "id">) => void;
  updateIncomeSource: (id: string, patch: Partial<IncomeSource>) => void;
  removeIncomeSource: (id: string) => void;
  addIncomeEntry: (e: Omit<IncomeEntry, "id">) => void;
  updateIncomeEntry: (id: string, patch: Partial<IncomeEntry>) => void;
  removeIncomeEntry: (id: string) => void;

  // categories
  addCategory: (c: Omit<Category, "id">) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;

  // bills
  addBill: (b: Omit<Bill, "id">) => void;
  updateBill: (id: string, patch: Partial<Bill>) => void;
  removeBill: (id: string) => void;

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
};

export type Store = BudgetState & Actions;

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

      addBill: (b) => set((st) => ({ bills: [...st.bills, { ...b, id: uid() }] })),
      updateBill: (id, patch) =>
        set((st) => ({ bills: st.bills.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeBill: (id) => set((st) => ({ bills: st.bills.filter((x) => x.id !== id) })),

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
          bills: st.bills,
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
          if (parsed.version !== SCHEMA_VERSION) {
            return {
              ok: false,
              error: `Schema version mismatch (got ${parsed.version}, expected ${SCHEMA_VERSION}).`,
            };
          }
          set({
            version: SCHEMA_VERSION,
            incomeSources: parsed.incomeSources ?? [],
            incomeEntries: parsed.incomeEntries ?? [],
            categories: parsed.categories ?? [],
            bills: parsed.bills ?? [],
            expenses: parsed.expenses ?? [],
            plans: parsed.plans ?? [],
            settings: { ...createInitialState().settings, ...(parsed.settings ?? {}) },
          });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
      resetAll: () => set(createInitialState()),
    }),
    {
      name: "personal-budget-v1",
      storage: createJSONStorage(() => localStorage),
      version: SCHEMA_VERSION,
    },
  ),
);
