import {
  startOfWeek,
  addDays,
  addWeeks,
  format,
  parseISO,
} from "date-fns";

/**
 * Single source of truth for week boundaries.
 * ISO week, Monday start (weekStartsOn: 1), used on both client and server.
 * timesheets.week_start_date is always the Monday returned by weekStart().
 */
const MONDAY = { weekStartsOn: 1 } as const;

/** The Monday (00:00 local) of the week containing `date`. */
export function weekStart(date: Date): Date {
  return startOfWeek(date, MONDAY);
}

/** 'yyyy-MM-dd' of the Monday of the week containing `date`. */
export function weekStartISO(date: Date): string {
  return format(weekStart(date), "yyyy-MM-dd");
}

/** The seven days Mon→Sun of the week starting at `monday`. */
export function weekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** The five weekdays Mon→Fri of the week starting at `monday`. */
export function weekdaysMonFri(monday: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => addDays(monday, i));
}

/** Shift a week-start Monday by `n` weeks (negative = earlier). */
export function shiftWeek(monday: Date, n: number): Date {
  return addWeeks(monday, n);
}

/** Label shown in the week nav, e.g. "Jun 23 – Jun 27" (Mon–Fri). */
export function weekRangeLabel(monday: Date): string {
  const fri = addDays(monday, 4);
  return `${format(monday, "MMM d")} – ${format(fri, "MMM d")}`;
}

/** Parse a 'yyyy-MM-dd' week_start_date string to a local Date. */
export function parseWeekStart(iso: string): Date {
  return parseISO(iso);
}
