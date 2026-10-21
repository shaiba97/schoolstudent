"use client";

import * as React from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/students";
import { ApiError } from "@/lib/api/client";
import type { StudentNotification } from "@/lib/api/types";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { formatDateTime } from "@/lib/utils";

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback;
}

export function NotificationsClient() {
  const [items, setItems] = React.useState<StudentNotification[]>([]);
  const [filter, setFilter] = React.useState<"all" | "unread">("all");
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [markingAll, setMarkingAll] = React.useState(false);

  const load = React.useCallback(() => {
    listMyNotifications().then(
      (res) => {
        setItems(Array.isArray(res) ? res : []);
        setError("");
        setLoading(false);
      },
      (cause: unknown) => {
        setError(errorMessage(cause, "Unable to load notifications"));
        setLoading(false);
      },
    );
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // A pushed notification refreshes the feed; REST stays the source of truth.
  const refresh = React.useCallback(() => load(), [load]);
  useRealtimeEvent("notification.created", {
    onEvent: refresh,
    onReconnect: refresh,
  });

  function handleRetry() {
    setLoading(true);
    load();
  }

  async function handleOpen(item: StudentNotification) {
    if (item.readAt) return;
    try {
      await markNotificationRead(item.id);
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, readAt: new Date().toISOString() } : row)));
    } catch {
      // A failed mark-as-read must not hide the notification; the next
      // refresh reconciles the badge state from the server.
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((current) => current.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })));
    } catch (cause) {
      setError(errorMessage(cause, "Unable to mark all read"));
    } finally {
      setMarkingAll(false);
    }
  }

  const unread = items.filter((item) => !item.readAt);
  const visible = filter === "unread" ? unread : items;

  if (loading && items.length === 0) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {unread.length} unread
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">Notifications</h1>
        </div>
        {unread.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => void handleMarkAll()} disabled={markingAll}>
            {markingAll ? "Working…" : "Mark all read"}
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={handleRetry} disabled={loading}>
            Retry
          </Button>
        </p>
      )}

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
            {(["all", "unread"] as const).map((option) => (
              <Button
                key={option}
                type="button"
                variant={filter === option ? "default" : "outline"}
                size="sm"
                className="h-8"
                onClick={() => setFilter(option)}
              >
                {option === "all" ? `All (${items.length})` : `Unread (${unread.length})`}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Bell size={20} className="mx-auto text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">
              {filter === "unread" ? "All caught up" : "No notifications yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {filter === "unread"
                ? "Every announcement has been read."
                : "Announcements from your school appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => void handleOpen(item)}
                className="block w-full rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted/50"
                aria-label={item.readAt ? item.title : `${item.title} (unread)`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{item.title}</p>
                  {!item.readAt && (
                    <Badge variant="info" className="shrink-0">
                      New
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
