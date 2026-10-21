/**
 * Trend verdict logic shared by Results and Attendance.
 *
 * This mirrors the backend rule in `StudentsMeService` (`STABLE_DELTA = 1`):
 * a movement under one percentage point reads as Stable so day-to-day noise
 * is not dressed up as progress. The backend remains the source of truth for
 * computed verdicts; this helper exists so client-side composition (e.g.
 * per-subject deltas derived from already-fetched rows) applies the identical
 * threshold. If either side changes the rule, change both and keep the two
 * spec files in sync.
 */
export type TrendVerdict = "improving" | "declining" | "stable";

/** Below this delta (percentage points) a trend reads as Stable. */
export const STABLE_DELTA_PTS = 1;

export function getTrendVerdict(delta: number | null | undefined): TrendVerdict | null {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return null;
  if (Math.abs(delta) < STABLE_DELTA_PTS) return "stable";
  return delta > 0 ? "improving" : "declining";
}

export function formatDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined || Number.isNaN(delta)) return "—";
  const rounded = Math.round(delta * 10) / 10;
  return `${rounded >= 0 ? "+" : ""}${rounded} pts`;
}
