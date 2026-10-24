import { BottomNav } from "@/components/portal/bottom-nav";
import { LanguageToggle } from "@/components/portal/language-toggle";
import { TenantLockedNotice } from "@/components/portal/tenant-locked-notice";
import { MobileTopBar } from "@/components/portal/mobile-top-bar";
import { PortalName } from "@/components/portal/portal-name";
import { Sidebar } from "@/components/portal/sidebar";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
 className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 overflow-x-clip p-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] pt-[3.75rem] supports-[height:100dvh]:min-h-dvh md:flex-row md:p-4">
      <TenantLockedNotice />
      <MobileTopBar />
      <header className="hidden shrink-0 self-start print:hidden md:sticky md:top-4 md:block md:max-h-[calc(100vh-2rem)] md:w-56 md:overflow-y-auto">
        <div className="flex items-center justify-between px-3 pb-2 pt-1">
          <PortalName />
          <LanguageToggle />
        </div>
        <Sidebar />
      </header>
      <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
      <BottomNav />
    </div>
  );
}
