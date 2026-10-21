import * as React from "react";
import type { StudentTimetableEntry } from "@/lib/api/types";
import { formatTime } from "@/lib/utils";
import { GRID_DAYS, DAY_LABELS, breakLabel, breakPosition, ordinal, type GridDay } from "./timetable-utils";

/**
 * Week grid: period columns 1..R (R is at least 9) crossed with one row per
 * requested day. Breaks render as a strip beneath their own day's row,
 * labelled with the lesson they follow. Desktop and tablet only — phones use
 * TimetableDayList (see responsive switch in the callers).
 */
export function TimetableGrid({
  entries,
  days = [...GRID_DAYS],
  caption,
}: {
  entries: StudentTimetableEntry[];
  days?: GridDay[];
  caption?: string;
}) {
  const lessons = entries.filter((entry) => !entry.isBreak);
  const breaks = entries.filter((entry) => entry.isBreak);
  const maxPeriod = lessons.reduce((max, entry) => Math.max(max, entry.periodNo), 0);
  const columnCount = Math.max(9, maxPeriod);

  const lessonsByDay = new Map<string, Map<number, StudentTimetableEntry>>();
  for (const entry of lessons) {
    const dayMap = lessonsByDay.get(entry.dayOfWeek) ?? new Map<number, StudentTimetableEntry>();
    dayMap.set(entry.periodNo, entry);
    lessonsByDay.set(entry.dayOfWeek, dayMap);
  }

  const breaksByDay = new Map<string, StudentTimetableEntry[]>();
  for (const entry of breaks) {
    const list = breaksByDay.get(entry.dayOfWeek) ?? [];
    list.push(entry);
    breaksByDay.set(entry.dayOfWeek, list);
  }
  for (const list of breaksByDay.values()) {
    list.sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  }

  const dayLessons = (day: string) => [...(lessonsByDay.get(day)?.values() ?? [])];
  const columns = Array.from({ length: columnCount }, (_, index) => index + 1);

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 w-16 border-b border-r bg-card p-2 text-left text-xs font-medium text-muted-foreground"
            >
              Day
            </th>
            {columns.map((period) => (
              <th key={period} scope="col" className="border-b p-2 text-left text-xs font-medium text-muted-foreground">
                {ordinal(period)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {days.map((day) => {
            const positioned = (breaksByDay.get(day) ?? []).map((entry) => ({
              entry,
              after: breakPosition(dayLessons(day), entry.startTime, columnCount),
            }));
            return (
              <React.Fragment key={day}>
                <tr>
                  <th scope="row" className="sticky left-0 w-16 border-r bg-card p-2 text-left align-top text-xs font-medium">
                    {DAY_LABELS[day]}
                  </th>
                  {columns.map((period) => {
                    const entry = lessonsByDay.get(day)?.get(period) ?? null;
                    if (!entry) {
                      return (
                        <td key={period} className="p-2 align-top text-muted-foreground">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">Free period</span>
                        </td>
                      );
                    }
                    return (
                      <td key={period} className="p-2 align-top">
                        <div className="min-w-0 space-y-0.5">
                          <p className="truncate text-xs font-medium leading-tight">{entry.subjectName ?? "—"}</p>
                          {entry.teacherName && (
                            <p className="truncate text-[11px] leading-tight text-muted-foreground">
                              {entry.teacherName}
                            </p>
                          )}
                          <p className="font-mono text-[11px] leading-tight text-muted-foreground">
                            {formatTime(entry.startTime)}–{formatTime(entry.endTime)}
                          </p>
                          {entry.room && (
                            <p className="truncate text-[11px] leading-tight text-muted-foreground">{entry.room}</p>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
                {positioned.length > 0 && (
                  <tr key={`${day}-breaks`}>
                    <th scope="row" className="sticky left-0 w-16 border-r bg-card p-2 align-top">
                      <span className="sr-only">Breaks</span>
                    </th>
                    <td colSpan={columnCount} className="bg-muted/60 p-2 align-top">
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {positioned.map(({ entry, after }) => (
                          <p key={entry.id} className="text-[11px] font-medium leading-tight text-muted-foreground">
                            Break · {breakLabel(after)}
                            <span className="ml-1 font-mono font-normal">
                              {formatTime(entry.startTime)}–{formatTime(entry.endTime)}
                            </span>
                          </p>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
