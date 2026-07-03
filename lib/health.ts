/**
 * Deterministic, rules-based timesheet health classification.
 * No LLM — same input always produces same output (testable, instant, free).
 * Referenced by /api/ai/health and tests/unit/health.test.ts.
 */

export type HealthIssue = "no_note" | "too_brief" | "ok";

/**
 * Classify a single note string.
 * - no_note   → null / empty / whitespace only
 * - too_brief → fewer than 5 words after trimming
 * - ok        → 5+ words
 */
export function classifyNote(note: string | null | undefined): HealthIssue {
  const trimmed = note?.trim() ?? "";
  if (!trimmed) return "no_note";
  if (trimmed.split(/\s+/).length < 5) return "too_brief";
  return "ok";
}
