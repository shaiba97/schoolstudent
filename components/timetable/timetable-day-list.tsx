import { Badge } from "@/components/ui/badge";
import { DAY_LABELS, GRID_DAYS, breakLabel, breakPosition, type GridDay } from "./timetable-utils";
import type { StudentTimetableEntry } from "@/lib/api/types";
import { formatTime } from "@/lib/utils";

type TimelineItem =
  | { key: string; kind: "lesson"; entry: StudentTimetableEntry }
  | { key: string; kind: "break"; entry: StudentTimetableEntry; after: number };

/**
 * One day's lessons and breaks merged into a single chronological list.
 * Breaks slot in after exactly the lessons that ended before they start, so
 * the rendered position always agrees with the "After Nth" label.
 */
function dayTimeline(entries: StudentTimetableEntry[]): TimelineItem[] {
  const lessons = entries.filter((entry) => !entry.isBreak).sort((a, b) => a.periodNo - b.periodNo);
  const breaks = entries
    .filter((entry) => entry.isBreak)
    .sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  const maxPeriod = lessons.reduce((max, entry) => Math.max(max, entry.periodNo), 9);

  const items: TimelineItem[] = [];
  let emitted = 0;
  const pending = [...breaks];
  const flushBreaks = (after: number) => {
    while (pending.length > 0) {
      const next = pending[0];
      const position = breakPosition(lessons, next.startTime, maxPeriod);
      if (position !== after) break;
      pending.shift();
      items.push({ key: next.id, kind: "break", entry: next, after: position });
    }
  };

  flushBreaks(0);
  for (const lesson of lessons) {
    items.push({ key: lesson.id, kind: "lesson", entry: lesson });
    emitted += 1;
    flushBreaks(emitted);
  }
  // Anything left belongs after the final lesson of the day.
  for (const entry of pending.splice(0)) {
    const position = breakPosition(lessons, entry.startTime, maxPeriod);
    items.push({ key: entry.id, kind: "break", entry, after: position });
  }
  return items;
}

/**
 * Stacked per-day sections sharing the dashboard list anatomy. Phones render
 * this; tablets and desktops render TimetableGrid instead (see callers).
 */
export function TimetableDayList({
  entries,
  days = [...GRID_DAYS],
}: {
  entries: StudentTimetableEntry[];
  days?: GridDay[];
}) {
  const shown = days.filter((day) => entries.some((entry) => entry.dayOfWeek === day));
  return (
    <>
      {shown.map((day) => {
        const items = dayTimeline(entries.filter((entry) => entry.dayOfWeek === day));
        return (
          <section key={day} aria-label={DAY_LABELS[day]}>
            <ol className="divide-y rounded-lg border">
              {items.map((item) =>
                item.kind === "break" ? (
                  <li key={item.key} className="px-3 py-2 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">
                      Break · {breakLabel(item.after)}
                      <span className="ml-1 font-mono font-normal">
                        {formatTime(item.entry.startTime)}–{formatTime(item.entry.endTime)}
                      </span>
                    </span>
                  </li>
                ) : (
                  <li
                    key={item.key}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
                  >
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {formatTime(item.entry.startTime)}–{formatTime(item.entry.endTime)}
                    </span>
                    <span className="order-3 min-w-0 basis-full break-words font-medium sm:order-1 sm:flex-1 sm:truncate">
                      {item.entry.isBreak ? "Break" : (item.entry.subjectName ?? "—")}
                    </span>
                    {!item.entry.isBreak && item.entry.teacherName && (
                      <Badge variant="secondary" className="order-2 ml-auto shrink-0 sm:ml-0">
                        {item.entry.teacherName}
                      </Badge>
                    )}
                    {item.entry.room && (
                      <span className="order-4 hidden text-xs text-muted-foreground sm:inline">
                        {item.entry.room}
                      </span>
                    )}
                  </li>
                ),
              )}
            </ol>
          </section>
        );
      })}
    </>
  );
}
