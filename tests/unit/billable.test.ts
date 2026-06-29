import { describe, it, expect } from "vitest";
import { isEntryBillable, splitHoursByBillable } from "@/lib/billable";

const A = "11111111-1111-1111-1111-111111111111"; // billable
const B = "22222222-2222-2222-2222-222222222222"; // billable
const N = "99999999-9999-9999-9999-999999999999"; // non-billable
const billable = new Set([A, B]);

describe("isEntryBillable (>=1 billable tag)", () => {
  it("billable if any tag is billable", () => {
    expect(isEntryBillable([A, N], billable)).toBe(true);
    expect(isEntryBillable([A], billable)).toBe(true);
  });
  it("non-billable when all tags are non-billable or none", () => {
    expect(isEntryBillable([N], billable)).toBe(false);
    expect(isEntryBillable([], billable)).toBe(false);
  });
});

describe("splitHoursByBillable", () => {
  it("splits and sums with no rounding drift", () => {
    const entries = [
      { hours: 1.5, tagIds: [A] }, // billable
      { hours: 0.75, tagIds: [N] }, // non-billable
      { hours: 2.0, tagIds: [B, N] }, // billable (>=1 billable)
      { hours: 0.25, tagIds: [] }, // non-billable (no tags)
    ];
    const { billable: b, nonBillable: nb, total } = splitHoursByBillable(
      entries,
      billable,
    );
    expect(b).toBe(3.5);
    expect(nb).toBe(1.0);
    expect(total).toBe(4.5);
    expect(b + nb).toBe(total); // donut invariant
  });
});
