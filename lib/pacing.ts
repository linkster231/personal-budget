/**
 * "On pace for $X by month end" calculation for a single category.
 * Pure function — caller supplies spent-so-far and today.
 */
export type PacingResult = {
  projectedMonthEnd: number;
  daysElapsed: number; // 1..31 (inclusive, today is day N)
  daysInMonth: number;
  /** Target attainment at current run rate: 0..∞ where 1.0 = exactly on target */
  runRateRatio: number;
  tone: "success" | "warning" | "destructive" | "muted";
};

export function pacingForCategory(spent: number, target: number, today: Date): PacingResult {
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysElapsed = Math.max(1, today.getDate());
  const projectedMonthEnd = (spent / daysElapsed) * daysInMonth;
  const runRateRatio = target > 0 ? projectedMonthEnd / target : 0;

  let tone: PacingResult["tone"] = "muted";
  if (target > 0) {
    if (runRateRatio <= 0.9) tone = "success";
    else if (runRateRatio <= 1.0) tone = "warning";
    else tone = "destructive";
  }

  return { projectedMonthEnd, daysElapsed, daysInMonth, runRateRatio, tone };
}
