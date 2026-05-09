"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  FolderTree,
  Layers,
  Receipt,
  Settings,
  Building2,
  ScrollText,
  Truck,
  Wallet,
} from "lucide-react";

import {
  hasMePermission,
  isMainOrganization,
  subsidiaryOrganizationPath,
  useMe,
} from "~/hooks/use-me";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  /** Si true, seul `pathname === href` active l’entrée (évite que /dashboard matche tout). */
  exact?: boolean;
  requiredPermission?: { action: "read"; subject: string };
  /** Masqué pour les organisations filiales. */
  mainOnly?: boolean;
};

const baseNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Utilisateurs",
    href: "/dashboard/utilisateurs",
    icon: Users,
    requiredPermission: { action: "read", subject: "User" },
  },
  {
    label: "Organisations",
    href: "/dashboard/organisations",
    icon: Building2,
    requiredPermission: { action: "read", subject: "Organization" },
  },
  {
    label: "Produits",
    href: "/dashboard/produits",
    icon: Package,
    requiredPermission: { action: "read", subject: "Product" },
  },
  {
    label: "Fournisseurs",
    href: "/dashboard/fournisseurs",
    icon: Truck,
    requiredPermission: { action: "read", subject: "Supplier" },
    mainOnly: true,
  },
  {
    label: "Catégories",
    href: "/dashboard/categories",
    icon: FolderTree,
    requiredPermission: { action: "read", subject: "Category" },
  },
  {
    label: "Stocks",
    href: "/dashboard/stocks",
    icon: Layers,
    requiredPermission: { action: "read", subject: "Stock" },
  },
  {
    label: "Budgets",
    href: "/dashboard/budgets",
    icon: Wallet,
    requiredPermission: { action: "read", subject: "Budget" },
  },
  {
    label: "Journal d'audit",
    href: "/dashboard/audit",
    icon: ScrollText,
    requiredPermission: { action: "read", subject: "AuditLog" },
  },
  { label: "Comptabilité", href: "/dashboard/comptabilite", icon: Receipt },
  { label: "Gestion", href: "/dashboard/gestion", icon: Settings },
];

function itemIsActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const NavBar = () => {
  const pathname = usePathname();
  const { data: me } = useMe();

  const navItems: NavItem[] = (() => {
    if (!me) return baseNavItems.map((i) => ({ ...i, exact: i.href === "/dashboard" }));

    const orgPath = subsidiaryOrganizationPath(me);
    const filtered = baseNavItems
      .filter((item) =>
        isMainOrganization(me) || item.href !== "/dashboard/organisations",
      )
      .filter((item) => !item.mainOnly || isMainOrganization(me))
      .filter((item) => {
        if (!item.requiredPermission) return true;
        return hasMePermission(
          me,
          item.requiredPermission.action,
          item.requiredPermission.subject,
        );
      });

    const mapped: NavItem[] = [];
    for (const item of filtered) {
      if (item.href === "/dashboard") {
        mapped.push({
          ...item,
          label: isMainOrganization(me) ? "Dashboard" : "Accueil",
          exact: true,
        });
        if (orgPath) {
          mapped.push({
            label: "Mon organisation",
            href: orgPath,
            icon: Building2,
            exact: true,
          });
        }
        continue;
      }
      mapped.push({ ...item });
    }
    return mapped;
  })();

  return (
    <nav className="flex h-full w-44 max-w-44 shrink-0 flex-col bg-[#2D323E]">
      <ul className="flex min-h-0 w-full flex-1 flex-col justify-evenly gap-2 px-1">
        {navItems.map((item) => {
          const { label, href, icon: Icon } = item;
          const isActive = itemIsActive(pathname, item);
          return (
            <li key={`${label}-${href}`} className="h-10 min-h-10 w-full min-w-full">
              <Link
                href={href}
                className={`flex h-full w-full items-center rounded-lg px-2 transition-colors ${isActive
                    ? "w-full bg-[#FF8C00] text-white"
                    : "text-gray-200 hover:bg-white/10 hover:text-white"
                  }`}
                style={{ gap: "4px" }}
              >
                <Icon className="size-5 shrink-0" strokeWidth={1.75} />
                <span className="font-medium">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default NavBar;
