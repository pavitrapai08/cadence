import { describe, it, expect } from "vitest";
import { classifyNote } from "@/lib/health";

describe("classifyNote — deterministic health rules", () => {
  describe("no_note", () => {
    it("flags null", () => expect(classifyNote(null)).toBe("no_note"));
    it("flags undefined", () => expect(classifyNote(undefined)).toBe("no_note"));
    it("flags empty string", () => expect(classifyNote("")).toBe("no_note"));
    it("flags whitespace only", () => expect(classifyNote("   ")).toBe("no_note"));
    it("flags tab/newline only", () => expect(classifyNote("\t\n")).toBe("no_note"));
  });

  describe("too_brief", () => {
    it("flags single word", () => expect(classifyNote("Meeting")).toBe("too_brief"));
    it("flags two words", () => expect(classifyNote("Client call")).toBe("too_brief"));
    it("flags four words", () => expect(classifyNote("Worked on the dashboard")).toBe("too_brief"));
    it("leading/trailing whitespace doesn't inflate word count", () =>
      expect(classifyNote("  one two three four  ")).toBe("too_brief"));
  });

  describe("ok", () => {
    it("passes exactly 5 words", () =>
      expect(classifyNote("Reviewed the client dashboard design")).toBe("ok"));
    it("passes 6+ words", () =>
      expect(classifyNote("Finalised the Dr Reddy wireframes for UAT review")).toBe("ok"));
    it("passes a realistic timesheet note", () =>
      expect(
        classifyNote(
          "Completed data ingestion pipeline for Dr. Reddy's Canada DTR COE project."
        )
      ).toBe("ok"));
  });

  describe("same input → same output (determinism)", () => {
    it("identical calls return identical results", () => {
      const note = "Worked on harmonization and transformation pipeline";
      expect(classifyNote(note)).toBe(classifyNote(note));
    });
  });
});
