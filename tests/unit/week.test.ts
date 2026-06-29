import { describe, it, expect } from "vitest";
import {
  weekStart,
  weekStartISO,
  weekDays,
  weekdaysMonFri,
  shiftWeek,
  weekRangeLabel,
} from "@/lib/week";

// Anchor: 1 Jan 2024 was a Monday; 7 Jan 2024 was a Sunday.
const wed = new Date(2024, 0, 3); // Wed 3 Jan 2024
const sun = new Date(2024, 0, 7); // Sun 7 Jan 2024
const nextMon = new Date(2024, 0, 8); // Mon 8 Jan 2024

describe("weekStart (Monday start)", () => {
  it("always returns a Monday", () => {
    expect(weekStart(wed).getDay()).toBe(1);
    expect(weekStart(sun).getDay()).toBe(1);
  });
  it("midweek and Sunday map to the same Monday", () => {
    expect(weekStartISO(wed)).toBe("2024-01-01");
    expect(weekStartISO(sun)).toBe("2024-01-01");
  });
  it("the next Monday starts a new week", () => {
    expect(weekStartISO(nextMon)).toBe("2024-01-08");
  });
});

describe("weekDays / weekdaysMonFri", () => {
  it("returns 7 days Mon→Sun", () => {
    const days = weekDays(weekStart(wed));
    expect(days).toHaveLength(7);
    expect(days[0].getDay()).toBe(1); // Mon
    expect(days[6].getDay()).toBe(0); // Sun
  });
  it("Mon→Fri is the first five", () => {
    const days = weekdaysMonFri(weekStart(wed));
    expect(days).toHaveLength(5);
    expect(days[4].getDay()).toBe(5); // Fri
  });
});

describe("shiftWeek / weekRangeLabel", () => {
  it("shifts by whole weeks", () => {
    const mon = weekStart(wed); // 2024-01-01
    expect(weekStartISO(shiftWeek(mon, 1))).toBe("2024-01-08");
    expect(weekStartISO(shiftWeek(mon, -1))).toBe("2023-12-25");
  });
  it("labels the Mon–Fri range", () => {
    expect(weekRangeLabel(weekStart(wed))).toBe("Jan 1 – Jan 5");
  });
});
