"use client";

import * as React from "react";
import { ChevronDown, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudentCases } from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import type { StudentCase } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { useI18n, interpolate } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/locale-provider";

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

const SEVERITY_KEY: Record<string, MessageKey> = {
  MINOR: "cases.severityMINOR",
  MODERATE: "cases.severityMODERATE",
  SEVERE: "cases.severitySEVERE",
};

const STATUS_KEY: Record<string, MessageKey> = {
  OPEN: "cases.statusOPEN",
  UNDER_REVIEW: "cases.statusUNDER_REVIEW",
  RESOLVED: "cases.statusRESOLVED",
  DISMISSED: "cases.statusDISMISSED",
};

function severityVariant(severity: string): "destructive" | "warning" | "secondary" {
  if (severity === "SEVERE") return "destructive";
  if (severity === "MODERATE") return "warning";
  return "secondary";
}

function statusVariant(status: string): "muted" | "secondary" | "success" {
  if (status === "RESOLVED" || status === "DISMISSED") return "success";
  if (status === "UNDER_REVIEW") return "secondary";
  return "muted";
}

export function CasesClient() {
  const { t, locale } = useI18n();
  const [cases, setCases] = React.useState<StudentCase[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    getStudentCases().then(
      (res) => {
        setCases(Array.isArray(res.cases) ? res.cases : []);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(errorMessage(cause, t("cases.loadError")));
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

  if (loading && cases.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error && cases.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("cases.title")}</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("cases.subtitle", { count: cases.length })}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t("cases.title")}</h1>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FolderOpen size={20} className="mx-auto text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">{t("cases.noCases")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("cases.noCasesHint")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {cases.map((item) => {
            const open = openId === item.id;
            return (
              <li key={item.id} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : item.id)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-2 p-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {interpolate(t("cases.filed"), { date: formatDate(item.filedAt, locale) })}
                      {item.filedByName ? ` · ${item.filedByName}` : ""}
                    </span>
                  </span>
                  <Badge variant={severityVariant(item.severity)} className="shrink-0">
                    {SEVERITY_KEY[item.severity] ? t(SEVERITY_KEY[item.severity]) : item.severity}
                  </Badge>
                  <Badge variant={statusVariant(item.status)} className="hidden shrink-0 sm:inline-flex">
                    {STATUS_KEY[item.status] ? t(STATUS_KEY[item.status]) : item.status}
                  </Badge>
                  <ChevronDown
                    size={16}
                    aria-hidden
                    className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                  />
                </button>
                {open && (
                  <div className="space-y-2 border-t px-3 py-3">
                    <Badge variant={statusVariant(item.status)} className="sm:hidden">
                      {STATUS_KEY[item.status] ? t(STATUS_KEY[item.status]) : item.status}
                    </Badge>
                    <p className="text-sm">{item.description}</p>
                    {item.resolutionNote && (
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {item.resolvedAt
                            ? interpolate(t("cases.resolution"), {}) + ` · ${formatDate(item.resolvedAt, locale)}`
                            : t("cases.resolution")}
                        </p>
                        <p className="mt-1 text-sm">{item.resolutionNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
