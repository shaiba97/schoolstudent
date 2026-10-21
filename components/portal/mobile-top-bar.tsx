"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { useIsMobile, useUnreadCount } from "./use-unread-count";

export function MobileTopBar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { unread, loaded, bump, refresh } = useUnreadCount(isMobile);
  useRealtimeEvent(
    "notification.created",
    { onEvent: bump, onReconnect: refresh },
    { enabled: isMobile },
  );

  const showBadge = isMobile && loaded && unread > 0;

  const notificationsActive = pathname === "/notifications" || pathname.startsWith("/notifications/");
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  return (
    <div className="fixed inset-x-0 top-0 z-40 border-b border-primary-foreground/20 bg-primary print:hidden md:hidden">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <div className="-ml-2 flex items-center">
          <Link
            href="/notifications"
            aria-current={notificationsActive ? "page" : undefined}
            aria-label={showBadge ? `Notifications, ${unread} unread` : "Notifications"}
            className={cn(
              "relative inline-flex size-10 items-center justify-center rounded-lg hover:bg-primary-foreground/15",
              notificationsActive ? "text-primary-foreground" : "text-primary-foreground/70 hover:text-primary-foreground",
            )}
          >
            <Bell size={20} aria-hidden />
            {showBadge && (
              <Badge
                variant="default"
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground px-1 text-[10px] text-primary"
              >
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
          </Link>
        </div>
        <p className="hidden text-xs font-medium uppercase tracking-wider text-primary-foreground/70 min-[360px]:block">
          Student Portal
        </p>
        <Link
          href="/profile"
          aria-current={profileActive ? "page" : undefined}
          aria-label="My profile"
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-lg hover:bg-primary-foreground/15",
            profileActive ? "text-primary-foreground" : "text-primary-foreground/70 hover:text-primary-foreground",
          )}
        >
          <UserRound size={20} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
