"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  buildNavSections,
  navItemIsActive,
  type NavItem,
} from "~/lib/dashboard-navigation";
import { isMainOrganization, useMe } from "~/hooks/use-me";
import { cn } from "~/lib/utils";

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
    </Link>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const sections = buildNavSections(me);
  const isHq = me != null && isMainOrganization(me);

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-accent text-sm font-bold text-white shadow-sm">
          V
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-wide text-white">
            VIFAA
          </p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">
            ERP groupe
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

      <div className="shrink-0 border-t border-sidebar-border px-4 py-3">
        <p className="text-[10px] text-sidebar-foreground/40">
          © VIFAA · Console métier
        </p>
      </div>
    </aside>
  );
}
