"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudentProfile } from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import type { StudentProfile } from "@/lib/api/types";
import { formatDate, initials } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale-provider";

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm">{value}</p>
    </div>
  );
}

export function ProfileClient() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [profile, setProfile] = React.useState<StudentProfile | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [signingOut, setSigningOut] = React.useState(false);

  const load = React.useCallback(() => {
    getStudentProfile().then(
      (res) => {
        setProfile(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(errorMessage(cause, t("profile.loadError")));
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

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/session/logout", { method: "POST" }).catch(() => undefined);
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  if (loading && !profile) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if ((error && !profile) || (!loading && !profile)) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("profile.title")}</h1>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <span>{error || t("profile.notFound")}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;
  const { student } = profile;

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={14} aria-hidden /> {t("nav.dashboard")}
        </Link>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t("profile.title")}</h1>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground"
          >
            {initials(student.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold">{student.fullName}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="font-mono">{student.roleNumber}</span>
              <Badge variant="secondary">{profile.class.className}</Badge>
              {profile.field && <Badge variant="outline">{profile.field}</Badge>}
            </p>
          </div>
          <UserRound size={20} className="rounded-lg bg-[#CFFAFE] p-1 text-[#0284C7]" aria-hidden />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("profile.details")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Detail label={t("profile.dateOfBirth")} value={formatDate(student.dateOfBirth, locale)} />
            <Detail label={t("profile.gender")} value={student.gender ?? "—"} />
            <Detail label={t("profile.phone")} value={student.phone ?? "—"} />
            <Detail label={t("profile.email")} value={student.email ?? "—"} />
            <Detail label={t("profile.admissionDate")} value={formatDate(student.admissionDate, locale)} />
            <Detail label={t("profile.academicYear")} value={profile.year.name} />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {t("profile.detailsNote")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {t("profile.guardiansN", { count: profile.guardians.length })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {profile.guardians.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("profile.guardiansLinked")}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {profile.guardians.map((guardian) => (
                <li key={guardian.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {guardian.firstName} {guardian.lastName ?? ""}
                    </span>
                    <span className="block font-mono text-xs text-muted-foreground">
                      {guardian.phone ?? "—"}
                    </span>
                  </span>
                  <Badge variant="secondary">{guardian.relationship}</Badge>
                  {guardian.isPrimary && <Badge variant="outline">{t("profile.primary")}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("profile.signOut")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
          >
            <LogOut size={14} aria-hidden /> {signingOut ? t("profile.signingOut") : t("profile.signOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
