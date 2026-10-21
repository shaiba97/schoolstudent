"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
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

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/results", label: "Results", icon: GraduationCap },
  { href: "/timetable", label: "Timetable", icon: Table2 },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/cases", label: "Cases", icon: FolderOpen },
  { href: "/profile", label: "Profile", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();
  // Desktop-only fetch: the mobile top bar owns the badge below `md`, so this
  // stays off there to avoid requesting the feed twice for one screen.
  const isMobile = useIsMobile();
  const { unread, loaded } = useUnreadCount(!isMobile);
  const showBadge = !isMobile && loaded && unread > 0;

  return (
    <nav aria-label="Student portal" className="flex flex-col gap-1 overflow-visible p-2">
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const withBadge = item.href === "/notifications" && showBadge;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            aria-label={withBadge ? `${item.label}, ${unread} unread` : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon size={16} aria-hidden />
            <span className="whitespace-nowrap">{item.label}</span>
            {withBadge && (
              <Badge
                aria-hidden="true"
                className={cn(
                  "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
                  // On the active row the default indigo fill would vanish
                  // against bg-primary, so the pill inverts instead.
                  active
                    ? "bg-primary-foreground/25 text-primary-foreground"
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
