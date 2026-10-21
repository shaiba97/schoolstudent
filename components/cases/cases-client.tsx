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

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

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
        setError(errorMessage(cause, "Unable to load cases"));
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
        <h1 className="text-xl font-semibold tracking-tight">Cases</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Read-only · {cases.length} record{cases.length === 1 ? "" : "s"}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">Cases</h1>
      </div>

      {cases.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FolderOpen size={20} className="mx-auto text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">No cases on file</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Disciplinary records filed against you would appear here.
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
                      Filed {formatDate(item.filedAt)}
                      {item.filedByName ? ` · ${item.filedByName}` : ""}
                    </span>
                  </span>
                  <Badge variant={severityVariant(item.severity)} className="shrink-0">
                    {item.severity.charAt(0) + item.severity.slice(1).toLowerCase()}
                  </Badge>
                  <Badge variant={statusVariant(item.status)} className="hidden shrink-0 sm:inline-flex">
                    {item.status
                      .split("_")
                      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
                      .join(" ")}
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
                      {item.status
                        .split("_")
                        .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
                        .join(" ")}
                    </Badge>
                    <p className="text-sm">{item.description}</p>
                    {item.resolutionNote && (
                      <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Resolution{item.resolvedAt ? ` · ${formatDate(item.resolvedAt)}` : ""}
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
