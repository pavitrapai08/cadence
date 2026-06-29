import { describe, it, expect } from "vitest";
import { formatHours, parseHours } from "@/lib/hours";

describe("formatHours", () => {
  it("formats whole hours", () => {
    expect(formatHours(1)).toBe("1h");
    expect(formatHours(2)).toBe("2h");
  });
  it("formats half/quarter hours", () => {
    expect(formatHours(1.5)).toBe("1h 30m");
    expect(formatHours(0.25)).toBe("15m");
    expect(formatHours(0.5)).toBe("30m");
  });
  it("formats sub-hour and combined", () => {
    expect(formatHours(2.25)).toBe("2h 15m");
    expect(formatHours(0.75)).toBe("45m");
  });
  it("handles zero / invalid", () => {
    expect(formatHours(0)).toBe("0m");
    expect(formatHours(NaN)).toBe("0m");
  });
});

describe("parseHours", () => {
  it("parses plain decimals", () => {
    expect(parseHours("1.5")).toBe(1.5);
    expect(parseHours("2")).toBe(2);
    expect(parseHours(0.25)).toBe(0.25);
  });
  it("parses Xh Ym forms", () => {
    expect(parseHours("1h 30m")).toBe(1.5);
    expect(parseHours("1h")).toBe(1);
    expect(parseHours("45m")).toBe(0.75);
    expect(parseHours("90m")).toBe(1.5);
  });
  it("returns 0 for junk", () => {
    expect(parseHours("")).toBe(0);
    expect(parseHours("abc")).toBe(0);
  });
});

describe("no rounding drift (the donut/sum guarantee)", () => {
  it("1.5 + 0.75 = 2.25 → '2h 15m'", () => {
    const total = 1.5 + 0.75;
    expect(total).toBe(2.25);
    expect(formatHours(total)).toBe("2h 15m");
  });
});
