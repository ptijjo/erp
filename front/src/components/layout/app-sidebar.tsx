"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, PanelLeft } from "lucide-react";
import { Tooltip } from "radix-ui";

import { Button } from "~/components/ui/button";
import {
  buildNavSections,
  navItemIsActive,
  type NavItem,
} from "~/lib/dashboard-navigation";
import { useSidebar } from "~/components/layout/sidebar-context";
import { isMainOrganization, meQueryKey, useMe } from "~/hooks/use-me";
import { api } from "~/lib/api";
import { cn } from "~/lib/utils";

function NavLink({
  item,
  active,
  rail,
}: {
  item: NavItem;
  active: boolean;
  rail: boolean;
}) {
  const Icon = item.icon;
  const link = (
    <Link
      href={item.href}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-accent",
        rail ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2",
        active
          ? "bg-sidebar-accent text-white"
          : "text-sidebar-foreground/80 hover:bg-white/8 hover:text-sidebar-foreground",
      )}
    >
      <Icon
        className={cn(
          "size-[18px] shrink-0",
          active ? "text-white" : "text-sidebar-foreground/70",
        )}
        strokeWidth={1.75}
      />
      {rail ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className="truncate">{item.label}</span>
      )}
    </Link>
  );

  if (!rail) return link;

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={10}
          className="z-50 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md"
        >
          {item.label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { mobileOpen, setMobileOpen, collapsed, toggleCollapsed } =
    useSidebar();
  const sections = buildNavSections(me);
  const isHq = me != null && isMainOrganization(me);
  const rail = collapsed && !mobileOpen;

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
    <Tooltip.Provider delayDuration={180}>
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
          "fixed bottom-0 left-0 top-14 z-50 flex w-[min(100%,16rem)] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-xl transition-[transform,width] duration-200 ease-out lg:static lg:top-auto lg:z-auto lg:shrink-0 lg:translate-x-0 lg:shadow-none",
          rail ? "lg:w-16" : "lg:w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-sidebar-border",
            rail ? "justify-center" : "gap-3 px-3",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-bold text-white">
            V
          </div>
          {rail ? null : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {isHq ? "VIFAA" : (me?.organisationName ?? "VIFAA")}
                </p>
                <p className="truncate text-[11px] text-sidebar-foreground/55">
                  {isHq ? "Maison mère" : "Filiale"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="hidden text-sidebar-foreground/70 hover:bg-white/8 hover:text-white lg:inline-flex"
                onClick={toggleCollapsed}
                aria-pressed
                aria-label="Réduire le menu"
              >
                <PanelLeft className="size-4" />
              </Button>
            </>
          )}
        </div>

        <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2 py-2">
          {sections.map((section, index) => (
            <div key={section.id} className={cn(index > 0 && "mt-2")}>
              {rail ? (
                index > 0 ? (
                  <div
                    className="mx-2 mb-2 h-px bg-sidebar-border"
                    role="separator"
                  />
                ) : null
              ) : (
                <p className="mb-1 px-3 text-xs text-sidebar-foreground/45">
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={`${item.href}-${item.label}`}>
                    <NavLink
                      item={item}
                      active={navItemIsActive(pathname, item)}
                      rail={rail}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div
          className={cn(
            "flex shrink-0 gap-1 border-t border-sidebar-border p-2",
            rail ? "flex-col items-center" : "flex-row",
          )}
        >
          {rail ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden text-sidebar-foreground/70 hover:bg-white/8 hover:text-white lg:inline-flex"
              onClick={toggleCollapsed}
              aria-pressed={false}
              aria-label="Afficher les libellés"
            >
              <PanelLeft className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size={rail ? "icon" : "default"}
            className={cn(
              "text-sidebar-foreground/80 hover:bg-white/8 hover:text-sidebar-foreground",
              !rail && "w-full justify-start gap-3 px-3",
            )}
            aria-label="Déconnexion"
            onClick={() => void handleLogout()}
          >
            <LogOut className="size-[18px]" strokeWidth={1.75} />
            {rail ? null : "Déconnexion"}
          </Button>
        </div>
      </aside>
    </Tooltip.Provider>
  );
}
