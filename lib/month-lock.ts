export interface MonthLock {
  year: number;
  month: number;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string;
  unlocked_by: string | null;
  unlocked_at: string | null;
}

/** "2026-06" key used as the Set element throughout the app. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthKeyFromDate(date: Date): string {
  return monthKey(date.getFullYear(), date.getMonth() + 1);
}

/** Build a fast lookup Set from the month_locks API response. */
export function buildLockedSet(
  locks: Pick<MonthLock, "year" | "month" | "is_locked">[]
): Set<string> {
  return new Set(
    locks.filter((l) => l.is_locked).map((l) => monthKey(l.year, l.month))
  );
}

/** Returns true if `date` falls in a locked month. */
export function isMonthLocked(date: Date, lockedMonths: Set<string>): boolean {
  return lockedMonths.has(monthKeyFromDate(date));
}
