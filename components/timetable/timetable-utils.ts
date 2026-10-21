import type { StudentTimetableEntry } from "@/lib/api/types";

export const GRID_DAYS = ["MON", "TUE", "WED", "THU", "SAT"] as const;
export type GridDay = (typeof GRID_DAYS)[number];

export const DAY_LABELS: Record<GridDay, string> = {
  MON: "Monday",
  TUE: "Tuesday",
  WED: "Wednesday",
  THU: "Thursday",
  SAT: "Saturday",
};

export function ordinal(period: number): string {
  const mod100 = period % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${period}th`;
  switch (period % 10) {
    case 1:
      return `${period}st`;
    case 2:
      return `${period}nd`;
    case 3:
      return `${period}rd`;
    default:
      return `${period}th`;
  }
}

/**
 * Which lesson a break follows within its day: the count of that day's
 * lessons ending at or before the break starts. Storage period numbers
 * (90+) never leak into row numbering through this path.
 */
export function breakPosition(
  dayLessons: StudentTimetableEntry[],
  breakStart: string,
  maxPeriod: number,
): number {
  const ended = dayLessons.filter((lesson) => lesson.endTime <= breakStart).length;
  return Math.min(Math.max(ended, 0), maxPeriod);
}

export function breakLabel(afterPeriod: number): string {
  return afterPeriod === 0 ? "Before classes" : `After ${ordinal(afterPeriod)}`;
}
