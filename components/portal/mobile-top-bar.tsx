"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRealtimeEvent } from "@/lib/realtime/socket";
import { useIsMobile, useUnreadCount } from "./use-unread-count";
import { LanguageToggle } from "./language-toggle";
import { useI18n } from "@/lib/i18n/locale-provider";

export function MobileTopBar() {
  const pathname = usePathname();
  const { t } = useI18n();
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
    <div className="fixed inset-x-0 top-0 z-40 border-b border-[#A5F3FC] bg-secondary text-foreground print:hidden md:hidden">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4">
        <div className="-ml-2 flex items-center">
          <Link
            href="/notifications"
            aria-current={notificationsActive ? "page" : undefined}
            aria-label={showBadge ? t("nav.unread", { label: t("nav.notificationsLabel"), count: unread }) : t("nav.notificationsLabel")}
            className={cn(
              "relative inline-flex size-10 items-center justify-center rounded-lg text-primary hover:bg-[#A5F3FC]",
              notificationsActive ? "bg-[#A5F3FC]" : "",
            )}
          >
            <Bell size={20} aria-hidden />
            {showBadge && (
              <Badge
                variant="default"
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] text-accent-foreground"
              >
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
          </Link>
        </div>
        <div className="flex items-center gap-2 min-[380px]:gap-3">
          <p className="hidden text-xs font-medium uppercase tracking-wider text-foreground min-[360px]:block">
            {t("portal.headerName")}
          </p>
          <LanguageToggle className="border-[#A5F3FC] bg-white" />
        </div>
        <Link
          href="/profile"
          aria-current={profileActive ? "page" : undefined}
          aria-label={t("nav.profileLabel")}
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-lg text-primary hover:bg-[#A5F3FC]",
            profileActive ? "bg-[#A5F3FC]" : "",
          )}
        >
          <UserRound size={20} aria-hidden />
        </Link>
      </div>
    </div>
  );
}
