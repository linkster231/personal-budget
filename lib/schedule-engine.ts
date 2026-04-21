import type {
  Expense,
  IncomeEntry,
  Interval,
  RecurringSchedule,
  ScheduleInstance,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Date helpers — everything is LOCAL, never UTC.                            */
/*  We treat YYYY-MM-DD as a calendar date at local midnight.                 */
/* -------------------------------------------------------------------------- */

export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function parseLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysInMonth(y: number, m: number): number {
  // m is 0-indexed (0=Jan). Day 0 of next month = last day of current month.
  return new Date(y, m + 1, 0).getDate();
}

export function addDaysLocal(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/* -------------------------------------------------------------------------- */
/*  Schedule generator — given a schedule and a date window, produce the      */
/*  list of ISO dates on which this schedule fires.                           */
/* -------------------------------------------------------------------------- */

export function generateDates(
  interval: Interval,
  rangeStart: Date,
  rangeEnd: Date,
  scheduleStart: Date,
): string[] {
  const start = rangeStart > scheduleStart ? rangeStart : scheduleStart;
  if (rangeEnd < start) return [];
  const out: string[] = [];

  const inWindow = (d: Date) => d >= start && d <= rangeEnd;

  switch (interval.kind) {
    case "weekly": {
      // first matching day-of-week on/after `start`
      const d = new Date(start);
      const delta = (interval.dayOfWeek - d.getDay() + 7) % 7;
      d.setDate(d.getDate() + delta);
      while (d <= rangeEnd) {
        if (inWindow(d)) out.push(isoLocal(d));
        d.setDate(d.getDate() + 7);
      }
      break;
    }
    case "biweekly": {
      // step by 14 days from anchor; find first >= start
      const anchor = parseLocal(interval.anchor);
      const msPerDay = 86400000;
      const diffDays = Math.floor((start.getTime() - anchor.getTime()) / msPerDay);
      const stepsToStart = Math.ceil(diffDays / 14);
      const d = addDaysLocal(anchor, stepsToStart * 14);
      while (d <= rangeEnd) {
        if (inWindow(d)) out.push(isoLocal(d));
        d.setDate(d.getDate() + 14);
      }
      break;
    }
    case "semi-monthly": {
      let y = start.getFullYear();
      let m = start.getMonth();
      while (new Date(y, m, 1) <= rangeEnd) {
        for (const day of interval.days) {
          const clamped = Math.min(day, daysInMonth(y, m));
          const d = new Date(y, m, clamped);
          if (inWindow(d)) out.push(isoLocal(d));
        }
        m += 1;
        if (m > 11) {
          m = 0;
          y += 1;
        }
      }
      // semi-monthly dates may be out of order within a month after clamping
      out.sort();
      break;
    }
    case "monthly": {
      let y = start.getFullYear();
      let m = start.getMonth();
      while (new Date(y, m, 1) <= rangeEnd) {
        const clamped = Math.min(interval.dayOfMonth, daysInMonth(y, m));
        const d = new Date(y, m, clamped);
        if (inWindow(d)) out.push(isoLocal(d));
        m += 1;
        if (m > 11) {
          m = 0;
          y += 1;
        }
      }
      break;
    }
    case "quarterly": {
      // quarterly pegged to a start month; occurs every 3 months.
      const startM = interval.startMonth - 1;
      let y = start.getFullYear();
      while (y <= rangeEnd.getFullYear() + 1) {
        for (let q = 0; q < 4; q++) {
          const totalM = startM + q * 3;
          const mo = totalM % 12;
          const yr = y + Math.floor(totalM / 12);
          const clamped = Math.min(interval.day, daysInMonth(yr, mo));
          const d = new Date(yr, mo, clamped);
          if (inWindow(d)) out.push(isoLocal(d));
        }
        y += 1;
      }
      out.sort();
      break;
    }
    case "yearly": {
      let y = start.getFullYear();
      while (y <= rangeEnd.getFullYear()) {
        const clamped = Math.min(interval.day, daysInMonth(y, interval.month - 1));
        const d = new Date(y, interval.month - 1, clamped);
        if (inWindow(d)) out.push(isoLocal(d));
        y += 1;
      }
      break;
    }
    case "custom": {
      const anchor = parseLocal(interval.anchor);
      const msPerDay = 86400000;
      const diffDays = Math.floor((start.getTime() - anchor.getTime()) / msPerDay);
      const stepsToStart = Math.max(0, Math.ceil(diffDays / interval.everyDays));
      const d = addDaysLocal(anchor, stepsToStart * interval.everyDays);
      while (d <= rangeEnd) {
        if (inWindow(d)) out.push(isoLocal(d));
        d.setDate(d.getDate() + interval.everyDays);
      }
      break;
    }
  }

  return out;
}

/* -------------------------------------------------------------------------- */
/*  Instance materialization — combine schedule with posted/skipped state     */
/* -------------------------------------------------------------------------- */

export function instanceKey(scheduleId: string, dateISO: string): string {
  return `${scheduleId}:${dateISO}`;
}

export function expectedAmountFor(schedule: RecurringSchedule): number {
  if (schedule.amountKind === "fixed") return schedule.amount ?? 0;
  // For ranges, midpoint is the best planning estimate.
  const mn = schedule.amountMin ?? 0;
  const mx = schedule.amountMax ?? mn;
  return (mn + mx) / 2;
}

export function materializeInstances(params: {
  schedules: RecurringSchedule[];
  incomeEntries: IncomeEntry[];
  expenses: Expense[];
  skipped: string[];
  rangeStart: Date;
  rangeEnd: Date;
  today: Date;
}): ScheduleInstance[] {
  const { schedules, incomeEntries, expenses, skipped, rangeStart, rangeEnd, today } = params;

  // Build lookup: scheduleInstanceKey → posted entry
  const postedIncome = new Map<string, IncomeEntry>();
  for (const e of incomeEntries) {
    if (e.scheduleInstanceKey) postedIncome.set(e.scheduleInstanceKey, e);
  }
  const postedExpense = new Map<string, Expense>();
  for (const e of expenses) {
    if (e.scheduleInstanceKey) postedExpense.set(e.scheduleInstanceKey, e);
  }
  const skipSet = new Set(skipped);

  const out: ScheduleInstance[] = [];

  for (const s of schedules) {
    if (!s.isActive) continue;
    const schedStart = parseLocal(s.startDate);
    const schedEnd = s.endDate ? parseLocal(s.endDate) : rangeEnd;
    const effEnd = schedEnd < rangeEnd ? schedEnd : rangeEnd;
    const dates = generateDates(s.interval, rangeStart, effEnd, schedStart);
    for (const d of dates) {
      const key = instanceKey(s.id, d);
      const expected = expectedAmountFor(s);
      const income = postedIncome.get(key);
      const expense = postedExpense.get(key);
      let status: ScheduleInstance["status"] = "pending";
      let postedEntryId: string | undefined;
      let postedAmount: number | undefined;
      if (income) {
        status = "posted";
        postedEntryId = income.id;
        postedAmount = income.amount;
      } else if (expense) {
        status = "posted";
        postedEntryId = expense.id;
        postedAmount = expense.amount;
      } else if (skipSet.has(key)) {
        status = "skipped";
      } else if (parseLocal(d) < startOfDay(today)) {
        status = "overdue";
      }
      out.push({
        scheduleId: s.id,
        date: d,
        key,
        expectedAmount: expected,
        status,
        postedEntryId,
        postedAmount,
      });
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/* -------------------------------------------------------------------------- */
/*  Human-readable interval label                                             */
/* -------------------------------------------------------------------------- */

const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function intervalLabel(interval: Interval): string {
  switch (interval.kind) {
    case "weekly":
      return `Every ${DOW_NAMES[interval.dayOfWeek]}`;
    case "biweekly":
      return `Every other ${DOW_NAMES[new Date(parseLocal(interval.anchor)).getDay()]}`;
    case "semi-monthly":
      return `On the ${ordinal(interval.days[0])} and ${ordinal(interval.days[1])}`;
    case "monthly":
      return `On the ${ordinal(interval.dayOfMonth)} of each month`;
    case "quarterly":
      return `Quarterly starting ${MONTH_NAMES[interval.startMonth - 1]} ${interval.day}`;
    case "yearly":
      return `Every ${MONTH_NAMES[interval.month - 1]} ${interval.day}`;
    case "custom":
      return `Every ${interval.everyDays} days`;
  }
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
