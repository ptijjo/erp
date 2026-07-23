"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { AppHeader } from "~/components/layout/app-header";
import { ToastHost } from "~/components/layout/toast-host";
import { AppSidebar } from "~/components/layout/app-sidebar";
import { DashboardLoading } from "~/components/layout/dashboard-loading";
import { RealtimeStatusProvider } from "~/components/layout/realtime-status-context";
import { SessionKeepAlive } from "~/components/layout/session-keep-alive";
import { SidebarProvider } from "~/components/layout/sidebar-context";
import { SubsidiaryProvider } from "~/providers/subsidiary-context";
import { dashboardHomePath, useMe } from "~/hooks/use-me";

const FIRST_LOGIN_PATH = "/dashboard/first-login";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: me, isPending, isError } = useMe();

  const isFirstLoginRoute = pathname === FIRST_LOGIN_PATH;

  useEffect(() => {
    if (isPending) return;
    if (me === null || isError) {
      router.replace("/");
      return;
    }
    if (me.firstLogin && pathname !== FIRST_LOGIN_PATH) {
      router.replace(FIRST_LOGIN_PATH);
      return;
    }
    if (!me.firstLogin && pathname === FIRST_LOGIN_PATH) {
      router.replace(dashboardHomePath(me));
      return;
    }
  }, [isPending, me, isError, pathname, router]);

  if (isPending) {
    return <DashboardLoading />;
  }

  if (!me) {
    return null;
  }

  return (
    <SubsidiaryProvider>
      <SidebarProvider>
        <RealtimeStatusProvider>
          <SessionKeepAlive />
          <ToastHost />
          <section className="flex h-screen w-full flex-col overflow-hidden bg-background">
            <AppHeader showMenu={!isFirstLoginRoute} />
            <section className="relative flex min-h-0 flex-1">
              {!isFirstLoginRoute ? <AppSidebar /> : null}
              <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-muted/30">
                {children}
              </section>
            </section>
          </section>
        </RealtimeStatusProvider>
      </SidebarProvider>
    </SubsidiaryProvider>
  );
}
