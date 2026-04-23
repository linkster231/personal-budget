import type { BudgetState, Interval, RecurringSchedule } from "./types";
import { generateDates, parseLocal, expectedAmountFor } from "./schedule-engine";
import { formatCurrency } from "./format";

/**
 * Build a VCALENDAR (.ics) blob of all active schedules so the user can
 * import into iOS/macOS Calendar and see bills + paydays with native alerts.
 *
 * Strategy:
 *  - weekly, biweekly, monthly, yearly → emit ONE VEVENT with RRULE
 *  - semi-monthly, quarterly, custom → emit individual VEVENTs for the next
 *    `horizonDays` to avoid RRULE edge cases
 *  - each VEVENT uses a DATE (all-day) — budget events don't have times
 */
export function buildICS(
  state: Pick<BudgetState, "schedules" | "settings" | "incomeSources" | "categories">,
  horizonDays = 365,
): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + horizonDays);
  const stamp = icsDateTime(new Date());

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PersonalBudget//Local First//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Personal Budget",
    "X-WR-TIMEZONE:UTC",
  ];

  for (const s of state.schedules) {
    if (!s.isActive) continue;
    const events = eventsForSchedule(s, today, rangeEnd, stamp, state);
    lines.push(...events);
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function eventsForSchedule(
  s: RecurringSchedule,
  rangeStart: Date,
  rangeEnd: Date,
  stamp: string,
  state: Pick<BudgetState, "incomeSources" | "categories" | "settings">,
): string[] {
  const amount = expectedAmountFor(s);
  const currency = state.settings.currency;
  const prefix = s.direction === "income" ? "+" : "−";
  const summary = `${prefix}${formatCurrency(amount, currency)} · ${s.name}`;
  const ownerName =
    s.direction === "income"
      ? state.incomeSources.find((x) => x.id === s.sourceId)?.name
      : state.categories.find((c) => c.id === s.categoryId)?.name;
  const description = [
    `${s.direction === "income" ? "Expected income" : "Scheduled expense"}`,
    ownerName ? `Category: ${ownerName}` : "",
    s.amountKind === "range"
      ? `Range: ${formatCurrency(s.amountMin ?? 0, currency)}–${formatCurrency(s.amountMax ?? 0, currency)}`
      : "",
    s.notes ? `Notes: ${s.notes}` : "",
  ]
    .filter(Boolean)
    .join("\\n");

  const scheduleStart = parseLocal(s.startDate);
  const scheduleEnd = s.endDate ? parseLocal(s.endDate) : undefined;

  // Try RRULE for regular cadences
  const rrule = tryRRULE(s.interval);
  if (rrule) {
    const firstOccurrence = generateDates(
      s.interval,
      scheduleStart > rangeStart ? scheduleStart : rangeStart,
      rangeEnd,
      scheduleStart,
    )[0];
    if (!firstOccurrence) return [];
    const uid = `${s.id}-series@personalbudget`;
    const event: string[] = [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(firstOccurrence)}`,
      `DTEND;VALUE=DATE:${icsDate(addOneDay(firstOccurrence))}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      `RRULE:${rrule}${scheduleEnd ? `;UNTIL=${icsDate(icsISO(scheduleEnd))}` : ""}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(summary)}`,
      "TRIGGER:-PT12H",
      "END:VALARM",
      "END:VEVENT",
    ];
    return event;
  }

  // Fallback: emit individual VEVENTs
  const dates = generateDates(
    s.interval,
    scheduleStart > rangeStart ? scheduleStart : rangeStart,
    scheduleEnd && scheduleEnd < rangeEnd ? scheduleEnd : rangeEnd,
    scheduleStart,
  );
  const events: string[] = [];
  for (const dateISO of dates) {
    const uid = `${s.id}-${dateISO}@personalbudget`;
    events.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(dateISO)}`,
      `DTEND;VALUE=DATE:${icsDate(addOneDay(dateISO))}`,
      `SUMMARY:${icsEscape(summary)}`,
      `DESCRIPTION:${icsEscape(description)}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:${icsEscape(summary)}`,
      "TRIGGER:-PT12H",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  return events;
}

function tryRRULE(interval: Interval): string | null {
  switch (interval.kind) {
    case "weekly":
      return `FREQ=WEEKLY;BYDAY=${DAY_CODES[interval.dayOfWeek]}`;
    case "biweekly":
      return `FREQ=WEEKLY;INTERVAL=2;BYDAY=${DAY_CODES[interval.dayOfWeek]}`;
    case "monthly":
      return `FREQ=MONTHLY;BYMONTHDAY=${interval.dayOfMonth}`;
    case "yearly":
      return `FREQ=YEARLY;BYMONTH=${interval.month};BYMONTHDAY=${interval.day}`;
    // semi-monthly, quarterly, custom → emit individual events
    default:
      return null;
  }
}

const DAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

/** YYYY-MM-DD → YYYYMMDD */
function icsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function icsISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function icsDateTime(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  const s = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${h}${mi}${s}Z`;
}

function addOneDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return icsISO(next);
}

function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
