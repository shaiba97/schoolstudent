"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { listMyNotifications } from "@/lib/api/students";

/**
 * Unread notification count, shared by the mobile top-bar bell and the
 * desktop sidebar pill. Fetches the feed and counts items with no `readAt`,
 * revalidating on every route change so reading items in the inbox clears it.
 * Pass `enabled: false` on viewports where another consumer already fetches,
 * so the feed is never requested twice for one screen.
 */
export function useUnreadCount(enabled: boolean): {
  unread: number;
  loaded: boolean;
  bump: () => void;
  refresh: () => void;
} {
  const pathname = usePathname();
  const [unread, setUnread] = React.useState(0);
  const [loaded, setLoaded] = React.useState(false);

  const refresh = React.useCallback(() => {
    if (!enabled) return;
    let cancelled = false;
    listMyNotifications().then(
      (items) => {
        if (cancelled) return;
        setUnread(Array.isArray(items) ? items.filter((item) => !item.readAt).length : 0);
        setLoaded(true);
      },
      () => {
        if (cancelled) return;
        setLoaded(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  React.useEffect(() => refresh(), [refresh, pathname]);

  // Live bump for socket pushes: increments immediately; the count reconciles
  // against the server on the next route change or reconnect (refresh above),
  // so drift from events arriving while a fetch is in flight self-corrects.
  const bump = React.useCallback(() => {
    setLoaded(true);
    setUnread((current) => current + 1);
  }, []);

  return { unread, loaded, bump, refresh };
}

/** True while the viewport is below the `md` breakpoint (mobile shell). */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return mobile;
}
