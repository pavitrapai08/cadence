import { describe, it, expect } from "vitest";
import {
  monthKey,
  monthKeyFromDate,
  buildLockedSet,
  isMonthLocked,
} from "@/lib/month-lock";

describe("monthKey", () => {
  it("pads single-digit months", () => {
    expect(monthKey(2026, 1)).toBe("2026-01");
    expect(monthKey(2026, 9)).toBe("2026-09");
  });
  it("does not pad two-digit months", () => {
    expect(monthKey(2026, 10)).toBe("2026-10");
    expect(monthKey(2026, 12)).toBe("2026-12");
  });
});

describe("monthKeyFromDate", () => {
  it("derives the key from a mid-month date", () => {
    expect(monthKeyFromDate(new Date("2026-06-15"))).toBe("2026-06");
  });
  it("handles the first and last day of a month", () => {
    expect(monthKeyFromDate(new Date("2026-01-01"))).toBe("2026-01");
    expect(monthKeyFromDate(new Date("2026-03-31"))).toBe("2026-03");
  });
});

describe("buildLockedSet", () => {
  it("includes only months where is_locked = true", () => {
    const locks = [
      { year: 2026, month: 4, is_locked: true },
      { year: 2026, month: 5, is_locked: true },
      { year: 2026, month: 6, is_locked: false },
    ];
    const set = buildLockedSet(locks);
    expect(set.has("2026-04")).toBe(true);
    expect(set.has("2026-05")).toBe(true);
    expect(set.has("2026-06")).toBe(false);
    expect(set.size).toBe(2);
  });

  it("returns an empty set when all months are unlocked", () => {
    const locks = [{ year: 2026, month: 6, is_locked: false }];
    expect(buildLockedSet(locks).size).toBe(0);
  });

  it("returns an empty set for an empty array", () => {
    expect(buildLockedSet([]).size).toBe(0);
  });
});

describe("isMonthLocked", () => {
  const locked = buildLockedSet([
    { year: 2026, month: 4, is_locked: true },
    { year: 2026, month: 5, is_locked: true },
  ]);

  it("returns true for dates inside a locked month", () => {
    expect(isMonthLocked(new Date("2026-04-01"), locked)).toBe(true);
    expect(isMonthLocked(new Date("2026-05-31"), locked)).toBe(true);
  });

  it("returns false for dates in unlocked months", () => {
    expect(isMonthLocked(new Date("2026-06-01"), locked)).toBe(false);
    expect(isMonthLocked(new Date("2026-03-15"), locked)).toBe(false);
  });

  it("is not confused by the same month in a different year", () => {
    expect(isMonthLocked(new Date("2025-04-15"), locked)).toBe(false);
    expect(isMonthLocked(new Date("2027-05-01"), locked)).toBe(false);
  });
});
