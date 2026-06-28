"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, LogOut } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
  buildNavSections,
  navItemIsActive,
  type NavItem,
} from "~/lib/dashboard-navigation";
import { useSidebar } from "~/components/layout/sidebar-context";
import { isMainOrganization, meQueryKey, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import { cn } from "~/lib/utils";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-white shadow-sm"
          : "text-sidebar-foreground/80 hover:bg-white/8 hover:text-sidebar-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0",
          active
            ? "text-white"
            : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground",
        )}
        strokeWidth={1.75}
      />
      <span className="truncate">{item.label}</span>
      {active ? (
        <ChevronRight className="ml-auto size-4 shrink-0 text-white/90" />
      ) : null}
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { mobileOpen, setMobileOpen } = useSidebar();
  const sections = buildNavSections(me);
  const isHq = me != null && isMainOrganization(me);

  async function handleLogout() {
    try {
      await api.post("/auth/logout");
    } catch {
      /* sortie locale */
    }
    await queryClient.invalidateQueries({ queryKey: meQueryKey });
    queryClient.removeQueries({ queryKey: meQueryKey });
    router.replace("/");
  }

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 top-14 z-40 bg-black/40 lg:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed bottom-0 left-0 top-14 z-50 flex w-[min(100%,16rem)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-out lg:static lg:top-auto lg:z-auto lg:w-60 lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-accent text-sm font-bold text-white shadow-sm">
          V
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide text-white">
            {isHq ? "VIFAA HOLDING" : "VIFAA"}
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">
            {isHq ? "Console maison mère" : "ERP filiale"}
          </p>
        </div>
      </div>

      {me ? (
        <div className="px-3 py-3">
          <Badge
            variant="outline"
            className="w-full justify-center border-sidebar-border bg-white/5 py-1 text-[11px] font-normal text-sidebar-foreground/90"
          >
            {isHq ? "Maison mère" : "Filiale"} · {me.organisationName}
          </Badge>
        </div>
      ) : null}

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 pb-4">
        {sections.map((section, index) => (
          <div key={section.id} className={cn(index > 0 && "mt-4")}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <NavLink
                    item={item}
                    active={navItemIsActive(pathname, item)}
                  />
                </li>
              ))}
            </ul>
            {index < sections.length - 1 ? (
              <Separator className="mt-4 bg-sidebar-border" />
            ) : null}
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border px-2 py-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-sidebar-foreground/80 hover:bg-white/8 hover:text-sidebar-foreground"
          onClick={() => void handleLogout()}
        >
          <LogOut className="size-[18px]" strokeWidth={1.75} />
          Déconnexion
        </Button>
      </div>
    </aside>
    </>
  );
}
