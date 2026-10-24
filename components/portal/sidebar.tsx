"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BanknoteIcon,
  CalendarCheck,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Table2,
  UserRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile, useUnreadCount } from "./use-unread-count";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { MessageKey } from "@/lib/i18n/locale-provider";

const ITEMS: Array<{ href: string; labelKey: MessageKey; icon: typeof LayoutDashboard }> = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/results", labelKey: "nav.results", icon: GraduationCap },
  { href: "/timetable", labelKey: "nav.timetable", icon: Table2 },
  { href: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck },
  { href: "/finance", labelKey: "nav.finance", icon: BanknoteIcon },
  { href: "/notifications", labelKey: "nav.notifications", icon: Bell },
  { href: "/cases", labelKey: "nav.cases", icon: FolderOpen },
  { href: "/profile", labelKey: "nav.profile", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();
  const { t } = useI18n();
  // Desktop-only fetch: the mobile top bar owns the badge below `md`, so this
  // stays off there to avoid requesting the feed twice for one screen.
  const isMobile = useIsMobile();
  const { unread, loaded } = useUnreadCount(!isMobile);
  const showBadge = !isMobile && loaded && unread > 0;

  return (
    <nav aria-label={t("nav.label")} className="flex flex-col gap-1 overflow-visible p-2">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const withBadge = item.href === "/notifications" && showBadge;
        const label = t(item.labelKey);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-label={withBadge ? t("nav.unread", { label, count: unread }) : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-active text-sidebar-active-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-foreground",
            )}
          >
            {active ? (
              <span className="w-1 shrink-0 rounded-r bg-sidebar-indicator" aria-hidden />
            ) : null}
            <Icon size={16} className={active ? undefined : "text-sidebar-icon"} aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
            {withBadge && (
              <Badge
                aria-hidden="true"
                className={cn(
                  "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
                  // On the active row the default fill would vanish against the
                  // selected surface, so the pill inverts instead.
                  active
                    ? "bg-sidebar-active-foreground/25 text-sidebar-active-foreground"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {unread > 99 ? "99+" : unread}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
