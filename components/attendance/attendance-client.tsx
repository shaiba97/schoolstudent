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
import { useI18n, interpolate } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/locale-provider";

const WINDOWS: Array<{ value: TrendWindow; labelKey: MessageKey }> = [
  { value: "week", labelKey: "common.windowWeek" },
  { value: "month", labelKey: "common.windowMonth" },
  { value: "3m", labelKey: "common.window3m" },
  { value: "6m", labelKey: "common.window6m" },
  { value: "1y", labelKey: "common.window1y" },
];

const STATUS_STYLE: Record<string, string> = {
  PRESENT: "bg-success-surface text-success",
  ABSENT: "bg-destructive-surface text-destructive",
  LATE: "bg-warning-surface text-warning",
  EXCUSED: "bg-info-surface text-info",
};

const STATUS_KEY: Record<string, MessageKey> = {
  PRESENT: "attendance.statusPRESENT",
  ABSENT: "attendance.statusABSENT",
  LATE: "attendance.statusLATE",
  EXCUSED: "attendance.statusEXCUSED",
};

const STATUS_RANK: Record<string, number> = { ABSENT: 0, LATE: 1, EXCUSED: 2, PRESENT: 3 };

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthName(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
    month: "long",
    year: "numeric",
  });
}

/** Narrow weekday glyphs, Monday-first, in the active locale. */
function weekdayLetters(locale: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const probe = new Date(Date.UTC(2023, 0, 2 + i));
    out.push(
      new Intl.DateTimeFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
        weekday: "narrow",
      }).format(probe),
    );
  }
  return out;
}

function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export function AttendanceClient() {
  const { t, locale } = useI18n();
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
        setError(errorMessage(cause, t("attendance.loadError")));
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
        <h1 className="text-xl font-semibold tracking-tight">{t("attendance.title")}</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
            {t("common.retry")}
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
          {t("attendance.subtitle")}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t("attendance.title")}</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarCheck size={14} aria-hidden /> {t("attendance.rate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {summary.percentage === null || summary.percentage === undefined ? "—" : `${summary.percentage}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t("attendance.rateNote")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("attendance.present")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summary.present}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("attendance.lateCount", { count: summary.late })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("attendance.absent")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{summary.absent}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("attendance.excusedCount", { count: summary.excused })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("attendance.trend")}</CardTitle>
          </CardHeader>
          <CardContent>
            {trend ? (
              <TrendIndicator delta={trend.delta} series={trend.series} />
            ) : (
              <span className="text-xs text-muted-foreground">{t("common.unavailable")}</span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("common.trendWindowAria")}>
        {WINDOWS.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={window === option.value ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setWindow(option.value)}
          >
            {t(option.labelKey)}
          </Button>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="calendar">{t("attendance.calendar")}</TabsTrigger>
          <TabsTrigger value="list">{t("attendance.list")}</TabsTrigger>
        </TabsList>
        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm">{monthName(viewMonth, locale)}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    aria-label={t("attendance.prevMonth")}
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
                    {t("attendance.today")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8"
                    aria-label={t("attendance.nextMonth")}
                    onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
                  >
                    <ChevronRight size={14} aria-hidden />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="grid grid-cols-7 gap-1 text-center"
                role="grid"
                aria-label={t("attendance.gridAria", { month: monthName(viewMonth, locale) })}
              >
                {weekdayLetters(locale).map((d, i) => (
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
                      aria-label={
                        records.length > 0
                          ? t("attendance.dayCount", { date: day, count: records.length })
                          : t("attendance.dayNone", { date: day })
                      }
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
                    <p className="text-sm text-muted-foreground">{t("attendance.noRecordsDay")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedRecords.map((record) => (
                        <li key={record.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                          <Badge variant="outline" className={cn(STATUS_STYLE[record.status] ?? "")}>
                            {STATUS_KEY[record.status] ? t(STATUS_KEY[record.status]) : record.status}
                          </Badge>
                          <span className="min-w-0 flex-1 text-muted-foreground">
                            {record.subjectName ?? t("attendance.general")}
                            {record.className ? ` · ${record.className}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-success-surface" aria-hidden /> {t("attendance.present")}</span>
                <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-warning-surface" aria-hidden /> {t("attendance.statusLATE")}</span>
                <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-destructive-surface" aria-hidden /> {t("attendance.absent")}</span>
                <span className="inline-flex items-center gap-1"><span className="inline-block size-2.5 rounded-sm bg-info-surface" aria-hidden /> {t("attendance.statusEXCUSED")}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="list">
          <Card>
            <CardContent className="space-y-2 pt-4">
              {data.records.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("attendance.noRecordsYet")}</p>
              ) : (
                <ol className="divide-y rounded-lg border">
                  {data.records.map((record) => (
                    <li key={record.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                        {record.date}
                      </span>
                      <Badge variant="outline" className={cn("shrink-0", STATUS_STYLE[record.status] ?? "")}>
                        {STATUS_KEY[record.status] ? t(STATUS_KEY[record.status]) : record.status}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {record.subjectName ?? t("attendance.general")}
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
