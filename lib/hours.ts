/**
 * Hours are stored as decimal hours in a numeric(5,2) column (e.g. 1.5 = 1h 30m).
 * These two functions are the single source of truth for display ⇄ value.
 * All sums must use the decimal value, never the formatted string.
 */

/** Quick-button values shown in the entry modal. */
export const QUICK_HOURS = [0.25, 0.5, 1, 2] as const;

/** Render decimal hours as "Xh Ym" (e.g. 1.5 → "1h 30m", 0.25 → "15m", 2 → "2h"). */
export function formatHours(decimal: number): string {
  if (!Number.isFinite(decimal) || decimal <= 0) return "0m";
  const totalMinutes = Math.round(decimal * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

/**
 * Parse a free-form hours input into decimal hours.
 * Accepts: "1.5", "1", "1h 30m", "1h", "30m", "90m".
 * Returns 0 for unparseable input. Rounds to 2 decimals.
 */
export function parseHours(input: string | number): number {
  if (typeof input === "number") return round2(input);
  const s = input.trim().toLowerCase();
  if (s === "") return 0;

  // Plain decimal, e.g. "1.5" or "2"
  if (/^\d+(\.\d+)?$/.test(s)) return round2(parseFloat(s));

  // "Xh Ym" / "Xh" / "Ym"
  const hMatch = s.match(/(\d+(?:\.\d+)?)\s*h/);
  const mMatch = s.match(/(\d+)\s*m/);
  if (!hMatch && !mMatch) return 0;
  const hours = hMatch ? parseFloat(hMatch[1]) : 0;
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
  return round2(hours + mins / 60);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
