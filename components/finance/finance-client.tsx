"use client";

import * as React from "react";
import { BanknoteIcon, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudentFinance } from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/locale-provider";
import type { LedgerInstallment, StudentFinance } from "@/lib/api/types";

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

function money(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

const TOTAL_STATUS_KEY: Record<StudentFinance["totals"]["status"], MessageKey> = {
  FULLY_PAID: "finance.statusFullyPaid",
  PARTIALLY_PAID: "finance.statusPartiallyPaid",
  OVERDUE: "finance.statusOverdue",
};

const INSTALLMENT_STATUS_KEY: Record<LedgerInstallment["status"], MessageKey> = {
  PAID: "finance.instPaid",
  PARTIAL: "finance.instPartial",
  OVERDUE: "finance.instOverdue",
  PENDING: "finance.instPending",
};

const INSTALLMENT_BADGE_VARIANT: Record<LedgerInstallment["status"], "success" | "warning" | "info" | "destructive"> = {
  PAID: "success",
  PARTIAL: "warning",
  OVERDUE: "destructive",
  PENDING: "info",
};

// Backend payment_method enum — displayed as-is, localized by useI18n.
const METHOD_KEY: Record<string, MessageKey> = {
  CASH: "finance.methodCash",
  BANKAK: "finance.methodBankak",
  FAWRY: "finance.methodFawry",
  OKASH: "finance.methodOkash",
  AL_MASHRIQ: "finance.methodAlMashriq",
};

export function FinanceClient() {
  const { t, locale } = useI18n();
  const dateLocale = locale === "ar" ? "ar-u-nu-latn" : "en-GB";
  const [data, setData] = React.useState<StudentFinance | null>(null);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(() => {
    getStudentFinance().then(
      (res) => {
        setData(res);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(errorMessage(cause, t("finance.loadError")));
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

  if (loading && !data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold tracking-tight">{t("finance.title")}</h1>
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
            {t("common.retry")}
          </Button>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const currency = data.totals.currency;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("finance.subtitle")} · {data.profile.name}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{t("finance.title")}</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm">{t("finance.summary")}</CardTitle>
            <Badge
              variant={
                data.totals.status === "OVERDUE"
                  ? "destructive"
                  : data.totals.status === "FULLY_PAID"
                    ? "success"
                    : "warning"
              }
            >
              {t(TOTAL_STATUS_KEY[data.totals.status])}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("finance.assigned")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{money(data.totals.assigned, currency, locale)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("finance.paid")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">{money(data.totals.paid, currency, locale)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("finance.remaining")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{money(data.totals.balance, currency, locale)}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("finance.discountGiven")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{money(data.fee.totalDiscount, currency, locale)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-sm">{t("finance.fees")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y rounded-lg border">
            {data.fee.rows.map((row) => (
              <li key={row.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate font-medium sm:flex-none sm:basis-48">{row.label}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {row.discount > 0 && (
                    <span>
                      {money(row.amount, currency, locale)} · {t("finance.minusDiscount")}{" "}
                      {money(row.discount, currency, locale)} ={" "}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-medium tabular-nums">{money(row.net, currency, locale)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader>
          <CardTitle className="text-sm">{t("finance.installments")}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.installments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("finance.noInstallments")}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {data.installments.map((inst) => (
                <li key={inst.no} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium sm:flex-none sm:basis-48">{inst.name}</span>
                  {inst.dueDate && (
                    <span className="text-xs text-muted-foreground">
                      {t("finance.due")} {new Date(inst.dueDate).toLocaleDateString(dateLocale)}
                    </span>
                  )}
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {money(inst.paid, currency, locale)} / {money(inst.amount, currency, locale)}
                  </span>
                  <Badge variant={INSTALLMENT_BADGE_VARIANT[inst.status]}>
                    {t(INSTALLMENT_STATUS_KEY[inst.status])}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="break-inside-avoid">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BanknoteIcon size={16} aria-hidden /> {t("finance.payments")}
            </CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => window.print()} className="print:hidden">
              <Printer size={14} aria-hidden /> {t("common.print")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.payments.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("finance.noPayments")}</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {data.payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{payment.ref || "—"}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {payment.at ? new Date(payment.at).toLocaleDateString(dateLocale) : "—"} · {payment.target}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {METHOD_KEY[payment.method] ? t(METHOD_KEY[payment.method]) : t("finance.methodOther")}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {money(payment.amount, payment.currencyCode, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
