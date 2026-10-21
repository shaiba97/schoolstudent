"use client";

import * as React from "react";
import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendIndicator } from "@/components/trends/trend-indicator";
import {
  getPerformanceTrend,
  getStudentAttendance,
  type TrendWindow,
} from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import type { AttendanceRecord, StudentAttendance } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const WINDOWS: Array<{ value: TrendWindow; label: string }> = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "3m", label: "3 mo" },
  { value: "6m", label: "6 mo" },
  { value: "1y", label: "Year" },
];

const STATUS_STYLE: Record<string, string> = {
  PRESENT: "bg-success/15 text-success",
  ABSENT: "bg-destructive/10 text-destructive",
  LATE: "bg-warning/15 text-warning",
  EXCUSED: "bg-muted text-muted-foreground",
};

const STATUS_RANK: Record<string, number> = { ABSENT: 0, LATE: 1, EXCUSED: 2, PRESENT: 3 };

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthName(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function AttendanceClient() {
  const [data, setData] = React.useState<StudentAttendance | null>(null);
  const [window, setWindow] = React.useState<TrendWindow>("3m");
  const [trend, setTrend] = React.useState<{
    delta?: number | null;
    series: Array<{ at: string; value?: number | null }>;
  } | null>(null);
  const [viewMonth, setViewMonth] = React.useState(() => new Date());
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState("calendar");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    getStudentAttendance().then(
      (res) => {
        setData(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(errorMessage(cause, "Unable to load attendance"));
        setLoading(false);
      },
    );
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const loadTrend = React.useCallback((target: TrendWindow) => {
    getPerformanceTrend("attendance", target).then(
      (res) => setTrend({ delta: res.delta, series: res.series }),
      () => setTrend(null),
    );
  }, []);

  React.useEffect(() => {
    loadTrend(window);
  }, [loadTrend, window]);

  const refreshAll = React.useCallback(() => {
    load();
    loadTrend(window);
  }, [load, loadTrend, window]);
  useRealtimeEvent("attendance.marked", {
    onEvent: refreshAll,
    onReconnect: refreshAll,
  });
  useRealtimeEvent("attendance_updated", {
    onEvent: refreshAll,
    onReconnect: refreshAll,
  });

  function handleRetry() {
    setLoading(true);
    load();
  }

  const byDay = React.useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    for (const record of data?.records ?? []) {
      const list = map.get(record.date) ?? [];
      list.push(record);
      map.set(record.date, list);
    }
    return map;
  }, [data]);

  const monthCells = React.useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    // Monday-first grid: Sunday (0) becomes 6 leading blanks.
    const leading = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
    const cells: Array<string | null> = Array<null>(leading).fill(null);
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(`${monthKey(viewMonth)}-${String(day).padStart(2, "0")}`);
    }
    return cells;
  }, [viewMonth]);

  const selectedRecords = selectedDay ? (byDay.get(selectedDay) ?? []) : [];

  if (loading && !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-3 sm:grid-cols-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Attendance</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { summary } = data;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          This academic year
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Attendance</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarCheck size={14} aria-hidden /> Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {summary.percentage === null || summary.percentage === undefined ? "—" : `${summary.percentage}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Present + late count as attended</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summary.present}</p>
            <p className="mt-1 text-xs text-muted-foreground">{summary.late} late</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summary.absent}</p>
            <p className="mt-1 text-xs text-muted-foreground">{summary.excused} excused</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trend ? (
              <TrendIndicator delta={trend.delta} series={trend.series} />
            ) : (
              <span className="text-xs text-muted-foreground">Unavailable</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Trend window">
        {WINDOWS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={window === option.value ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setWindow(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{monthName(viewMonth)}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    aria-label="Previous month"
                    onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
                  >
                    <ChevronLeft size={14} aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setViewMonth(new Date());
                      setSelectedDay(null);
                    }}
                  >
                    Today
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    aria-label="Next month"
                    onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
                  >
                    <ChevronRight size={14} aria-hidden />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={`Attendance for ${monthName(viewMonth)}`}>
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                  <span key={i} className="py-1 text-xs font-medium text-muted-foreground" aria-hidden="true">
                    {d}
                  </span>
                ))}
                {monthCells.map((day, index) => {
                  if (!day) return <span key={`blank-${index}`} />;
                  const records = byDay.get(day) ?? [];
                  const worst =
                    records.length > 0
                      ? [...records].sort(
                          (a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9),
                        )[0]
                      : null;
                  const selected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(selected ? null : day)}
                      aria-pressed={selected}
                      aria-label={`${day}${records.length > 0 ? `, ${records.length} record${records.length === 1 ? "" : "s"}` : ", no records"}`}
                      className={cn(
                        "flex min-h-10 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-xs tabular-nums transition-colors",
                        worst ? (STATUS_STYLE[worst.status] ?? "bg-muted") : "text-muted-foreground hover:bg-muted",
                        selected && "ring-2 ring-ring ring-offset-0",
                      )}
                    >
                      <span className="font-medium leading-none">{Number(day.slice(-2))}</span>
                      {records.length > 1 && (
                        <span className="text-[10px] leading-none opacity-80">×{records.length}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedDay && (
                <div className="mt-3 space-y-2 border-t pt-3">
                  <p className="text-sm font-medium">{selectedDay}</p>
                  {selectedRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No records that day.</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedRecords.map((record) => (
                        <li key={record.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                          <Badge variant="outline" className={cn(STATUS_STYLE[record.status] ?? "")}>
                            {record.status.charAt(0) + record.status.slice(1).toLowerCase()}
                          </Badge>
                          <span className="min-w-0 flex-1 text-muted-foreground">
                            {record.subjectName ?? "General"}
                            {record.className ? ` · ${record.className}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-success/15" aria-hidden /> Present</span>
                <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-warning/15" aria-hidden /> Late</span>
                <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-destructive/10" aria-hidden /> Absent</span>
                <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-muted" aria-hidden /> Excused</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="list">
          <Card>
            <CardContent className="space-y-2 pt-4">
              {data.records.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance records yet.</p>
              ) : (
                <ol className="divide-y rounded-lg border">
                  {data.records.map((record) => (
                    <li key={record.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                        {record.date}
                      </span>
                      <Badge variant="outline" className={cn("shrink-0", STATUS_STYLE[record.status] ?? "")}>
                        {record.status.charAt(0) + record.status.slice(1).toLowerCase()}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {record.subjectName ?? "General"}
                        {record.className ? ` · ${record.className}` : ""}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
