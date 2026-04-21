import type { Category, Strategy } from "./types";

/**
 * The budget engine allocates a pool of dollars across categories
 * according to the user's chosen strategy.
 *
 * The three strategies (user chose "hybrid" — all three are supported):
 *
 *  1. "last-month"
 *     Fund each category up to its `targetMonthly`, in priority order.
 *     Income comes from last month's earnings (caller passes it in).
 *     Leftover income spills into savings-kind categories.
 *
 *  2. "baseline"
 *     Allocate the baseline floor amount using target-based funding.
 *     Anything above the baseline (the surplus) is routed into savings.
 *
 *  3. "priority"
 *     Rank categories by `priority` (ascending), fund top-down until the
 *     pool is empty. Partial funding is allowed on the last category.
 *
 * IMPORTANT: The "last-month" strategy is the ONE meaningful business-logic
 * choice we're leaving for the user to implement in learning-mode.
 * See the TODO inside `allocateLastMonth` below.
 */

export type AllocationInput = {
  strategy: Strategy;
  categories: Category[];
  availableIncome: number;
  /** Used only by the "baseline" strategy. */
  baselineIncome?: number;
};

export type AllocationResult = {
  allocations: Record<string, number>;
  unallocated: number;
  /** Human-readable note explaining what happened, for UI. */
  note: string;
};

export function allocate(input: AllocationInput): AllocationResult {
  switch (input.strategy) {
    case "last-month":
      return allocateLastMonth(input.categories, input.availableIncome);
    case "baseline":
      return allocateBaseline(
        input.categories,
        input.availableIncome,
        input.baselineIncome ?? 0,
      );
    case "priority":
      return allocatePriority(input.categories, input.availableIncome);
  }
}

/* -------------------------------------------------------------------------- */
/*  PRIORITY STRATEGY (implemented)                                           */
/* -------------------------------------------------------------------------- */

function allocatePriority(categories: Category[], pool: number): AllocationResult {
  const sorted = [...categories].sort((a, b) => a.priority - b.priority);
  const allocations: Record<string, number> = {};
  let remaining = pool;
  for (const c of sorted) {
    const give = Math.min(c.targetMonthly, remaining);
    if (give > 0) {
      allocations[c.id] = give;
      remaining -= give;
    }
    if (remaining <= 0) break;
  }
  return {
    allocations,
    unallocated: Math.max(0, remaining),
    note: remaining > 0
      ? `All targets met — $${remaining.toFixed(2)} left over.`
      : `Pool exhausted at priority rank.`,
  };
}

/* -------------------------------------------------------------------------- */
/*  BASELINE STRATEGY (implemented)                                           */
/* -------------------------------------------------------------------------- */

function allocateBaseline(
  categories: Category[],
  pool: number,
  baseline: number,
): AllocationResult {
  const baselinePool = Math.min(pool, baseline);
  const surplus = Math.max(0, pool - baseline);

  // Fund baseline first using priority order.
  const base = allocatePriority(categories, baselinePool);

  // Route surplus into savings-kind categories (by priority).
  const savings = categories
    .filter((c) => c.kind === "savings")
    .sort((a, b) => a.priority - b.priority);
  const allocations = { ...base.allocations };
  let remainingSurplus = surplus;
  for (const c of savings) {
    if (remainingSurplus <= 0) break;
    allocations[c.id] = (allocations[c.id] ?? 0) + remainingSurplus;
    remainingSurplus = 0; // dump it all into the first savings bucket; refine if desired
  }

  return {
    allocations,
    unallocated: remainingSurplus,
    note: surplus > 0
      ? `Baseline funded; $${surplus.toFixed(2)} surplus routed to savings.`
      : `Income at or below baseline — funded in priority order.`,
  };
}

/* -------------------------------------------------------------------------- */
/*  LAST-MONTH STRATEGY — USER IMPLEMENTS                                     */
/* -------------------------------------------------------------------------- */

function allocateLastMonth(
  categories: Category[],
  pool: number,
): AllocationResult {
  // TODO(learning-mode): Implement the "last month's income" allocation.
  //
  // Contract:
  //   - `pool` is LAST MONTH's total earned income, used to budget THIS month.
  //   - Fund each category up to its `targetMonthly` in priority order
  //     (categories with lower `priority` number are funded first).
  //   - If income runs out mid-list, stop (don't partially fund unless YOU want to).
  //   - Any income LEFT OVER after all targets are met should spill into the
  //     first `savings`-kind category (there may be zero or more).
  //   - Return the allocations map, the unallocated amount, and a short note.
  //
  // WHY THIS DECISION MATTERS:
  //   "Last month's income" funding is the most conservative variable-income
  //   strategy — you only spend money you've actually received. The subtlety
  //   is: what to do with the leftover. Three approaches you could pick:
  //
  //     a) Dump 100% of leftover into the FIRST savings category (simple)
  //     b) Split leftover evenly across ALL savings categories (egalitarian)
  //     c) Fill each savings category to its targetMonthly first, THEN spill
  //        the remainder into the first savings category (target-aware)
  //
  //   Option (c) is the most sophisticated — it respects that you may have
  //   multiple savings goals (emergency fund, vacation fund, etc.) with
  //   different targets. Option (a) is the easiest. Your call.
  //
  // Tip: look at `allocatePriority` above — you can call it to do the
  // first-pass target funding, then handle the leftover yourself.

  throw new Error(
    "allocateLastMonth not implemented — see TODO in lib/budget-engine.ts",
  );
}

/* -------------------------------------------------------------------------- */
/*  Helper: sinking-fund readiness                                            */
/* -------------------------------------------------------------------------- */

/**
 * For a sinking-fund category, how on-track are we? Returns 0..1 where
 * 1 = fully funded for the year. Caller passes current saved balance.
 */
export function sinkingReadiness(category: Category, saved: number): number {
  if (category.kind !== "sinking" || category.targetMonthly <= 0) return 1;
  const annual = category.targetMonthly * 12;
  return Math.max(0, Math.min(1, saved / annual));
}
