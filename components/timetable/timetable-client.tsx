"use client";

import * as React from "react";
import { Printer, Table2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GRID_DAYS } from "./timetable-utils";
import { TimetableDayList } from "./timetable-day-list";
import { TimetableGrid } from "./timetable-grid";
import { SubjectTeachers } from "./subject-teachers";
import { getStudentTimetable } from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import type { StudentTimetable } from "@/lib/api/types";
import { useI18n, interpolate } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/locale-provider";

const DAY_KEYS: Record<string, MessageKey> = {
  MON: "timetable.dayMon",
  TUE: "timetable.dayTue",
  WED: "timetable.dayWed",
  THU: "timetable.dayThu",
  SAT: "timetable.daySat",
};

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

export function TimetableClient() {
  const { t } = useI18n();
  const [data, setData] = React.useState<StudentTimetable | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    getStudentTimetable().then(
      (res) => {
        setData(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(errorMessage(cause, t("timetable.loadError")));
        setLoading(false);
      },
    );
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleRetry() {
    setLoading(true);
    load();
  }

  const days = React.useMemo(() => {
    if (!data) return [];
    return GRID_DAYS.filter((day) => data.entries.some((entry) => entry.dayOfWeek === day));
  }, [data]);

  const otherDays = React.useMemo(() => {
    if (!data) return [];
    return [...new Set(data.entries.map((entry) => entry.dayOfWeek))].filter(
      (day) => !(GRID_DAYS as readonly string[]).includes(day),
    );
  }, [data]);

  if (loading && !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("timetable.title")}</h1>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {data.year.name} · {data.class.className}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{t("timetable.title")}</h1>
        </div>
        {data.entries.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
            <Printer size={14} aria-hidden /> {t("common.print")}
          </Button>
        )}
      </div>

      {data.entries.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Table2 size={20} className="mx-auto text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">{t("timetable.noTimetable")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("timetable.noTimetableHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3 sm:hidden print:hidden">
            {days.map((day) => (
              <Card key={day} className="break-inside-avoid">
                <CardHeader>
                  <CardTitle className="text-sm">{DAY_KEYS[day] ? t(DAY_KEYS[day]) : day}</CardTitle>
                </CardHeader>
                <CardContent>
                  <TimetableDayList entries={data.entries} days={[day]} />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="hidden sm:block print:block">
            <Card className="break-inside-avoid">
              <CardHeader>
                <CardTitle className="text-sm">{t("timetable.classTimetable")}</CardTitle>
              </CardHeader>
              <CardContent>
                <TimetableGrid
                  entries={data.entries}
                  caption={t("timetable.caption")}
                />
                {otherDays.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {interpolate(t("timetable.otherDays"), { days: otherDays.join(", ") })}.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
      {(data.subjects ?? []).length > 0 && <SubjectTeachers subjects={data.subjects ?? []} />}
    </div>
  );
}
