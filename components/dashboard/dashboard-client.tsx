"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CalendarCheck, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { GRID_DAYS } from "@/components/timetable/timetable-utils";
import type { GridDay } from "@/components/timetable/timetable-utils";
import { TimetableDayList } from "@/components/timetable/timetable-day-list";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { SubjectTeachers } from "@/components/timetable/subject-teachers";
import { TrendIndicator } from "@/components/trends/trend-indicator";
import {
  getPerformanceTrend,
  getStudentAttendance,
  getStudentProfile,
  getStudentResults,
  getStudentTimetable,
  listMyNotifications,
  type TrendWindow,
} from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/locale-provider";
import type {
  StudentAttendance,
  StudentNotification,
  StudentProfile,
  StudentResults,
  StudentTimetable,
} from "@/lib/api/types";

const DAY_KEYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const WINDOWS: Array<{ value: TrendWindow; labelKey: MessageKey }> = [
  { value: "week", labelKey: "common.windowWeek" },
  { value: "month", labelKey: "common.windowMonth" },
  { value: "3m", labelKey: "common.window3m" },
  { value: "6m", labelKey: "common.window6m" },
  { value: "1y", labelKey: "common.window1y" },
];

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

export function DashboardClient() {
  const { t } = useI18n();
  const [profile, setProfile] = React.useState<StudentProfile | null>(null);
  const [timetable, setTimetable] = React.useState<StudentTimetable | null>(null);
  const [results, setResults] = React.useState<StudentResults | null>(null);
  const [attendance, setAttendance] = React.useState<StudentAttendance | null>(null);
  const [announcements, setAnnouncements] = React.useState<StudentNotification[]>([]);
  const [window, setWindow] = React.useState<TrendWindow>("3m");
  const [resultsTrend, setResultsTrend] = React.useState<{
    delta?: number | null;
    series: Array<{ at: string; value?: number | null }>;
    current?: { average?: number | null; samples: number } | null;
    byType: {
      test: { average?: number | null; samples: number };
      exam: { average?: number | null; samples: number };
    };
  } | null>(null);
  const [attendanceTrend, setAttendanceTrend] = React.useState<{
    delta?: number | null;
    series: Array<{ at: string; value?: number | null }>;
    current?: { average?: number | null; samples: number } | null;
  } | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    Promise.all([
      getStudentProfile(),
      getStudentTimetable(),
      getStudentResults(),
      getStudentAttendance(),
      listMyNotifications(),
    ]).then(
      ([profileRes, timetableRes, resultsRes, attendanceRes, notificationsRes]) => {
        setProfile(profileRes);
        setTimetable(timetableRes);
        setResults(resultsRes);
        setAttendance(attendanceRes);
        setAnnouncements(Array.isArray(notificationsRes) ? notificationsRes.slice(0, 5) : []);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(errorMessage(cause, t("dashboard.loadError")));
        setLoading(false);
      },
    );
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const loadTrends = React.useCallback((target: TrendWindow) => {
    Promise.all([
      getPerformanceTrend("results", target),
      getPerformanceTrend("attendance", target),
    ]).then(
      ([resultsRes, attendanceRes]) => {
        setResultsTrend({
          delta: resultsRes.delta,
          series: resultsRes.series,
          current: resultsRes.current ?? null,
          byType: resultsRes.byType ?? {
            test: { average: null, samples: 0 },
            exam: { average: null, samples: 0 },
          },
        });
        setAttendanceTrend({
          delta: attendanceRes.delta,
          series: attendanceRes.series,
          current: attendanceRes.current ?? null,
        });
      },
      () => {
        setResultsTrend(null);
        setAttendanceTrend(null);
      },
    );
  }, []);

  React.useEffect(() => {
    loadTrends(window);
  }, [loadTrends, window]);

  // A pushed mark, exam publication, or reconnect after a drop refetches both
  // the dashboard queries and the visible trend window. REST stays the source
  // of truth; the socket only says "something changed".
  const refreshAll = React.useCallback(() => {
    load();
    loadTrends(window);
  }, [load, loadTrends, window]);
  useRealtimeEvent(["marks.entered", "exam.published"], {
    onEvent: refreshAll,
    onReconnect: refreshAll,
  });

  function handleRetry() {
    setLoading(true);
    load();
  }

  if (loading && !profile) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("nav.dashboard")}</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const todayKey = DAY_KEYS[new Date().getDay()];
  const todayIsGridDay = (GRID_DAYS as readonly string[]).includes(todayKey);
  const todayEntries = (timetable?.entries ?? []).filter((entry) => entry.dayOfWeek === todayKey);
  const unread = announcements.filter((item) => !item.readAt).length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {profile.year.name} · {profile.class.className}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          {t("dashboard.welcome", { name: profile.student.firstName })}
        </h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <GraduationCap size={14} aria-hidden /> {t("dashboard.averageScore")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {results?.averagePercentage === null || results?.averagePercentage === undefined
                ? "—"
                : `${results.averagePercentage}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {results
                ? results.count === 1
                  ? t("common.publishedResultOne")
                  : t("common.publishedResultMany", { count: results.count })
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <CalendarCheck size={14} aria-hidden /> {t("dashboard.attendance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {attendance?.summary.percentage === null || attendance?.summary.percentage === undefined
                ? "—"
                : `${attendance.summary.percentage}%`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {attendance
                ? t("dashboard.attendedOf", {
                    attended: attendance.summary.attended,
                    total: attendance.summary.total,
                  })
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Bell size={14} aria-hidden /> {t("dashboard.unread")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{unread}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              <Link href="/notifications" className="hover:underline">
                {t("dashboard.viewNotifications")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("dashboard.todaysClasses")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!todayIsGridDay || todayEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.noClassesToday")}</p>
          ) : (
            <>
              <div className="sm:hidden print:hidden">
                <TimetableDayList entries={todayEntries} days={[todayKey as GridDay]} />
              </div>
              <div className="hidden sm:block print:block">
                <TimetableGrid
                  entries={todayEntries}
                  days={[todayKey as GridDay]}
                  caption={t("dashboard.todayCaption")}
                />
              </div>
            </>
          )}
          {(timetable?.subjects ?? []).length > 0 && (
            <div className="mt-4">
              <SubjectTeachers subjects={timetable?.subjects ?? []} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">{t("dashboard.performance")}</CardTitle>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <span className="text-sm font-medium">{t("dashboard.results")}</span>
            {resultsTrend ? (
              <TrendIndicator delta={resultsTrend.delta} series={resultsTrend.series} />
            ) : (
              <span className="text-xs text-muted-foreground">{t("common.unavailable")}</span>
            )}
            {resultsTrend && (resultsTrend.byType.test.samples > 0 || resultsTrend.byType.exam.samples > 0) && (
              <p className="w-full text-xs text-muted-foreground">
                {t("results.tests")}{" "}
                <span className="font-medium text-foreground">
                  {resultsTrend.byType.test.average === null ||
                  resultsTrend.byType.test.average === undefined
                    ? "—"
                    : `${resultsTrend.byType.test.average}%`}
                </span>{" "}
                ({resultsTrend.byType.test.samples}) · {t("results.exams")}{" "}
                <span className="font-medium text-foreground">
                  {resultsTrend.byType.exam.average === null ||
                  resultsTrend.byType.exam.average === undefined
                    ? "—"
                    : `${resultsTrend.byType.exam.average}%`}
                </span>{" "}
                ({resultsTrend.byType.exam.samples})
              </p>
            )}
            {resultsTrend?.current?.average !== null &&
              resultsTrend?.current?.average !== undefined && (
                <p className="w-full text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {resultsTrend.current.average}%
                  </span>{" "}
                  {t("common.acrossResults", { count: resultsTrend.current.samples })}
                </p>
              )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
            <span className="text-sm font-medium">{t("dashboard.attendance")}</span>
            {attendanceTrend ? (
              <TrendIndicator delta={attendanceTrend.delta} series={attendanceTrend.series} />
            ) : (
              <span className="text-xs text-muted-foreground">{t("common.unavailable")}</span>
            )}
            {attendanceTrend?.current?.average !== null &&
              attendanceTrend?.current?.average !== undefined && (
                <p className="w-full text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {attendanceTrend.current.average}%
                  </span>{" "}
                  {t("common.acrossSessions", { count: attendanceTrend.current.samples })}
                </p>
              )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell size={14} className="text-muted-foreground" aria-hidden /> {t("dashboard.recentAnnouncements")}
            </CardTitle>
            <Link
              href="/notifications"
              className="inline-flex h-7 items-center rounded-md px-2.5 text-[0.8rem] font-medium hover:bg-muted hover:text-foreground"
            >
              {t("common.viewAll")}
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("dashboard.noAnnouncements")}</p>
          ) : (
            <ul className="space-y-2">
              {announcements.map((item) => (
                <li key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-medium leading-snug line-clamp-2">{item.title}</p>
                    {!item.readAt && (
                      <Badge variant="info" className="shrink-0">
                        {t("common.new")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
