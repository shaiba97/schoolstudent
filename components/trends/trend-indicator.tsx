"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Line, LineChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDelta, getTrendVerdict, type TrendVerdict } from "./trend";
import type { TrendPoint } from "@/lib/api/types";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/locale-provider";

const VERDICT_KEY: Record<TrendVerdict, MessageKey> = {
  improving: "trend.improving",
  declining: "trend.declining",
  stable: "trend.stable",
};

function verdictIcon(verdict: TrendVerdict): typeof TrendingUp {
  if (verdict === "improving") return TrendingUp;
  if (verdict === "declining") return TrendingDown;
  return Minus;
}

function VerdictIcon({ Icon }: { Icon: typeof TrendingUp }) {
  return <Icon size={12} aria-hidden />;
}

function verdictVariant(verdict: TrendVerdict): "success" | "destructive" | "muted" {
  if (verdict === "improving") return "success";
  if (verdict === "declining") return "destructive";
  return "muted";
}

/**
 * Shared verdict + delta + sparkline, used by Results, Attendance and the
 * Dashboard. Fixed-size chart (no ResizeObserver) so it prerenders
 * deterministically and never causes a hydration mismatch.
 */
export function TrendIndicator({
  delta,
  series,
  className,
}: {
  delta: number | null | undefined;
  series: TrendPoint[];
  className?: string;
}) {
  const verdict = getTrendVerdict(delta);
  const { t } = useI18n();
  if (verdict === null) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        {t("trend.insufficient")}
      </span>
    );
  }
  const points = series.map((point, index) => ({
    index,
    value: point.value ?? null,
  }));

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Badge variant={verdictVariant(verdict)}>
        <VerdictIcon Icon={verdictIcon(verdict)} />
        {t(VERDICT_KEY[verdict])}
      </Badge>
      <span className="shrink-0 text-xs font-medium tabular-nums">{formatDelta(delta)}</span>
      {points.length > 1 && (
        <span aria-hidden="true">
          <LineChart width={112} height={36} data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke="currentColor"
              strokeWidth={2}
              dot={false}
              connectNulls
              isAnimationActive={false}
              className="text-primary"
            />
          </LineChart>
        </span>
      )}
    </span>
  );
}
