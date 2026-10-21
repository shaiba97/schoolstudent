"use client";

import * as React from "react";
import { Download, GraduationCap, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { TrendIndicator } from "@/components/trends/trend-indicator";
import { getTrendVerdict } from "@/components/trends/trend";
import {
  downloadResultPdf,
  getStudentResults,
} from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import type { StudentResults } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

export function ResultsClient() {
  const [data, setData] = React.useState<StudentResults | null>(null);
  const [subject, setSubject] = React.useState("all");
  const [examType, setExamType] = React.useState("all");
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    getStudentResults().then(
      (res) => {
        setData(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(errorMessage(cause, "Unable to load results"));
        setLoading(false);
      },
    );
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // A published mark or exam lands here live; REST stays the source of truth.
  useRealtimeEvent(["marks.entered", "exam.published"], {
    onEvent: load,
    onReconnect: load,
  });

  function handleRetry() {
    setLoading(true);
    load();
  }

  async function handleDownload(examId: string, examName: string) {
    setDownloading(examId);
    setError("");
    try {
      const blob = await downloadResultPdf(examId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${examName.replace(/[^a-z0-9]+/gi, "-")}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (cause) {
      setError(errorMessage(cause, "Unable to download result slip"));
    } finally {
      setDownloading(null);
    }
  }

  const rows = React.useMemo(() => {
    if (!data) return [];
    return data.results.filter(
      (row) =>
        (subject === "all" || row.subjectName === subject) &&
        (examType === "all" || row.examType === examType),
    );
  }, [data, subject, examType]);

  const subjects = React.useMemo(
    () => [...new Set((data?.results ?? []).map((row) => row.subjectName))].sort(),
    [data],
  );
  const examTypes = React.useMemo(
    () => [...new Set((data?.results ?? []).map((row) => row.examType).filter(Boolean))].sort() as string[],
    [data],
  );

  // Per-subject trend from each subject's two most recent scored rows.
  const subjectTrend = React.useMemo(() => {
    const bySubject = new Map<string, number[]>();
    for (const row of data?.results ?? []) {
      if (row.percentage === null || row.percentage === undefined) continue;
      const list = bySubject.get(row.subjectName) ?? [];
      list.push(row.percentage);
      bySubject.set(row.subjectName, list);
    }
    return new Map(
      [...bySubject.entries()].map(([name, values]) => {
        const delta = values.length >= 2 ? Math.round((values[0] - values[1]) * 10) / 10 : null;
        return [name, { delta, verdict: getTrendVerdict(delta) }] as const;
      }),
    );
  }, [data]);

  const exams = React.useMemo(() => {
    const grouped = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = grouped.get(row.examId) ?? [];
      list.push(row);
      grouped.set(row.examId, list);
    }
    return [...grouped.values()];
  }, [rows]);

  /** Test vs Exam split for the summary card and the card sections. */
  function bucketOf(examType?: string | null): "test" | "exam" {
    return examType?.trim().toLowerCase() === "test" ? "test" : "exam";
  }

  const split = React.useMemo(() => {
    const scored = (data?.results ?? []).filter(
      (row) => row.percentage !== null && row.percentage !== undefined,
    );
    const summarize = (list: typeof scored) => ({
      average:
        list.length > 0
          ? Math.round((list.reduce((sum, row) => sum + (row.percentage as number), 0) / list.length) * 10) / 10
          : null,
      count: list.length,
    });
    return {
      test: summarize(scored.filter((row) => bucketOf(row.examType) === "test")),
      exam: summarize(scored.filter((row) => bucketOf(row.examType) !== "test")),
    };
  }, [data]);

  const sections = React.useMemo(() => {
    const byBucket = new Map<string, typeof exams>();
    for (const examRows of exams) {
      const key = examRows[0]?.examType ? bucketOf(examRows[0].examType) : "other";
      const list = byBucket.get(key) ?? [];
      list.push(examRows);
      byBucket.set(key, list);
    }
    const averageOf = (groups: typeof exams) => {
      const scored = groups
        .flatMap((group) => group)
        .filter((row) => row.percentage !== null && row.percentage !== undefined);
      return scored.length > 0
        ? Math.round((scored.reduce((sum, row) => sum + (row.percentage as number), 0) / scored.length) * 10) / 10
        : null;
    };
    return [
      { key: "test", title: "Tests", groups: byBucket.get("test") ?? [], average: null as number | null },
      { key: "exam", title: "Exams", groups: byBucket.get("exam") ?? [], average: null as number | null },
      { key: "other", title: "Other", groups: byBucket.get("other") ?? [], average: null as number | null },
    ]
      .map((section) => ({ ...section, average: averageOf(section.groups) }))
      .filter((section) => section.groups.length > 0);
  }, [exams]);

  if (loading && !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">Results</h1>
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

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Published results only
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Results</h1>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <GraduationCap size={20} className="text-muted-foreground" aria-hidden />
          <p className="text-2xl font-semibold">
            {data.averagePercentage === null || data.averagePercentage === undefined
              ? "—"
              : `${data.averagePercentage}%`}
          </p>
          <p className="text-sm text-muted-foreground">
            overall across {data.count} published result{data.count === 1 ? "" : "s"}
          </p>
          <p className="w-full text-sm text-muted-foreground">
            Tests{" "}
            <span className="font-medium text-foreground">
              {split.test.average === null ? "—" : `${split.test.average}%`}
            </span>{" "}
            ({split.test.count}) · Exams{" "}
            <span className="font-medium text-foreground">
              {split.exam.average === null ? "—" : `${split.exam.average}%`}
            </span>{" "}
            ({split.exam.count})
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Subject">
          <Button
            key="all-subjects"
            type="button"
            variant={subject === "all" ? "default" : "outline"}
            size="sm"
            className="h-10"
            onClick={() => setSubject("all")}
          >
            All subjects
          </Button>
          {subjects.map((name) => (
            <Button
              key={name}
              type="button"
              variant={subject === name ? "default" : "outline"}
              size="sm"
              className="h-10"
              onClick={() => setSubject(name)}
            >
              {name}
            </Button>
          ))}
        </div>
        <label htmlFor="results-exam-type" className="sr-only">Exam type</label>
        <select
          id="results-exam-type"
          value={examType}
          onChange={(event) => setExamType(event.target.value)}
          className="flex h-9 rounded-lg border border-input bg-background px-2 py-1 text-sm shadow-sm"
        >
          <option value="all">All types</option>
          {examTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground" role="status">
          {rows.length} shown
        </span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}

      {exams.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <GraduationCap size={20} className="mx-auto text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">No results here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Published results appear here once your exams are released.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.key} aria-label={`${section.title} results`}>
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold tracking-tight">{section.title}</h2>
                {section.average !== null && (
                  <p className="text-xs text-muted-foreground">
                    {section.title} average{" "}
                    <span className="font-medium text-foreground">{section.average}%</span>
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {section.groups.map((examRows) => {
            const first = examRows[0];
            const scored = examRows.filter((row) => row.percentage !== null && row.percentage !== undefined);
            const average =
              scored.length > 0
                ? Math.round((scored.reduce((sum, row) => sum + (row.percentage as number), 0) / scored.length) * 10) / 10
                : null;
            const busy = downloading === first.examId;
            return (
              <Card key={first.examId} className="break-inside-avoid">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-sm">
                      {first.examName} · {first.className}
                    </CardTitle>
                    <div className="flex items-center gap-1.5">
                      {first.examType && <Badge variant="outline">{first.examType}</Badge>}
                      {first.examDate && (
                        <span className="text-xs text-muted-foreground">{formatDate(first.examDate)}</span>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => void handleDownload(first.examId, first.examName)}
                      >
                        <Download size={14} aria-hidden /> {busy ? "Working…" : "Slip"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => window.print()}
                        className="print:hidden"
                      >
                        <Printer size={14} aria-hidden /> Print
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ol className="divide-y rounded-lg border">
                    {examRows.map((row) => {
                      const trend = subjectTrend.get(row.subjectName);
                      return (
                        <li
                          key={row.id}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 flex-1 truncate font-medium sm:flex-none sm:basis-48">
                            {row.subjectName}
                          </span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {row.marks === null || row.marks === undefined ? (
                              <>—/{row.maxMarks}</>
                            ) : (
                              <>{row.marks}/{row.maxMarks}</>
                            )}
                          </span>
                          <span className="order-3 min-w-0 basis-full sm:order-none sm:basis-auto">
                            {trend && trend.verdict ? (
                              <TrendIndicator delta={trend.delta} series={[]} />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  {average !== null && (
                    <p className="text-right text-sm text-muted-foreground">
                      Exam average <span className="font-medium text-foreground">{average}%</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
