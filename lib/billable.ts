/**
 * Client-side mirror of the SQL `entry_is_billable` helper (TECH_SPEC §4a).
 * An entry is billable iff it has >= 1 billable tag selected. The full hours of
 * the entry go to its single category — we never split one entry across both.
 */

export interface BillableEntry {
  hours: number;
  tagIds: string[];
}

/** True if any of the entry's tags is in the billable set. */
export function isEntryBillable(
  tagIds: string[],
  billableTagIds: Set<string>,
): boolean {
  return tagIds.some((id) => billableTagIds.has(id));
}

/**
 * Split a list of entries into billable vs non-billable hour totals.
 * Sums use the decimal hours value so billable + nonBillable === total exactly.
 */
export function splitHoursByBillable(
  entries: BillableEntry[],
  billableTagIds: Set<string>,
): { billable: number; nonBillable: number; total: number } {
  let billable = 0;
  let nonBillable = 0;
  for (const e of entries) {
    if (isEntryBillable(e.tagIds, billableTagIds)) billable += e.hours;
    else nonBillable += e.hours;
  }
  return {
    billable: round2(billable),
    nonBillable: round2(nonBillable),
    total: round2(billable + nonBillable),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
