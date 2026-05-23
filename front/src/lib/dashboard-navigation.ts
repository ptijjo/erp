import type { LucideIcon } from "lucide-react";
import {
  Building2,
  FolderTree,
  Layers,
  LayoutDashboard,
  Package,
  Receipt,
  ScrollText,
  Truck,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";

import {
  hasMePermission,
  isMainOrganization,
  subsidiaryOrganizationPath,
  type Me,
} from "~/hooks/use-me";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  requiredPermission?: { action: "read"; subject: string };
  mainOnly?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const baseNavItems: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Utilisateurs",
    href: "/dashboard/utilisateurs",
    icon: Users,
    requiredPermission: { action: "read", subject: "User" },
  },
  {
    label: "Ressources humaines",
    href: "/dashboard/rh",
    icon: UserCircle,
    requiredPermission: { action: "read", subject: "Employee" },
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
    label: "Synthèse commandes",
    href: "/dashboard/comptabilite",
    icon: Receipt,
    requiredPermission: { action: "read", subject: "StockOrder" },
  },
  {
    label: "Journal d'audit",
    href: "/dashboard/audit",
    icon: ScrollText,
    requiredPermission: { action: "read", subject: "AuditLog" },
  },
];

const SECTION_BY_HREF: Record<string, string> = {
  "/dashboard": "accueil",
  "/dashboard/utilisateurs": "organisation",
  "/dashboard/rh": "rh",
  "/dashboard/organisations": "organisation",
  "/dashboard/produits": "catalogue",
  "/dashboard/fournisseurs": "catalogue",
  "/dashboard/categories": "catalogue",
  "/dashboard/stocks": "operations",
  "/dashboard/comptabilite": "operations",
  "/dashboard/budgets": "finance",
  "/dashboard/audit": "gouvernance",
};

const SECTION_LABELS: Record<string, string> = {
  accueil: "Accueil",
  organisation: "Organisation",
  catalogue: "Catalogue",
  operations: "Opérations",
  finance: "Finance",
  gouvernance: "Gouvernance",
};

function itemIsAllowed(me: Me, item: NavItem): boolean {
  if (item.mainOnly && !isMainOrganization(me)) return false;
  if (
    !isMainOrganization(me) &&
    item.href === "/dashboard/organisations"
  ) {
    return false;
  }
  if (!item.requiredPermission) return true;
  return hasMePermission(
    me,
    item.requiredPermission.action,
    item.requiredPermission.subject,
  );
}

export function buildNavSections(me: Me | null | undefined): NavSection[] {
  if (!me) return [];

  const orgPath = subsidiaryOrganizationPath(me);
  const items: NavItem[] = [];

  for (const item of baseNavItems) {
    if (!itemIsAllowed(me, item)) continue;

    if (item.href === "/dashboard") {
      items.push({
        ...item,
        label: isMainOrganization(me) ? "Tableau de bord" : "Accueil",
        exact: true,
      });
      if (orgPath) {
        items.push({
          label: "Mon organisation",
          href: orgPath,
          icon: Building2,
          exact: true,
        });
      }
      continue;
    }
    items.push({ ...item });
  }

  const bySection = new Map<string, NavItem[]>();
  for (const item of items) {
    const baseHref =
      Object.keys(SECTION_BY_HREF).find(
        (h) => item.href === h || item.href.startsWith(`${h}/`),
      ) ?? "/dashboard";
    const sectionId =
      item.label === "Mon organisation"
        ? "accueil"
        : (SECTION_BY_HREF[baseHref] ?? "accueil");
    const list = bySection.get(sectionId) ?? [];
    list.push(item);
    bySection.set(sectionId, list);
  }

  const order = [
    "accueil",
    "organisation",
    "rh",
    "catalogue",
    "operations",
    "finance",
    "gouvernance",
  ];

  return order
    .filter((id) => bySection.has(id))
    .map((id) => ({
      id,
      label: SECTION_LABELS[id] ?? id,
      items: bySection.get(id) ?? [],
    }));
}

export function navItemIsActive(pathname: string, item: NavItem): boolean {
  if (item.exact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export type ModuleTile = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  subject?: string;
};

export const HQ_MODULE_TILES: ModuleTile[] = [
  {
    title: "Organisations",
    description: "Maison mère, filiales et pôles",
    href: "/dashboard/organisations",
    icon: Building2,
    subject: "Organization",
  },
  {
    title: "Utilisateurs",
    description: "Comptes, rôles et accès",
    href: "/dashboard/utilisateurs",
    icon: Users,
    subject: "User",
  },
  {
    title: "Ressources humaines",
    description: "Employés, congés et contrats",
    href: "/dashboard/rh",
    icon: UserCircle,
    subject: "Employee",
  },
  {
    title: "Catalogue produits",
    description: "Référentiel et catégories",
    href: "/dashboard/produits",
    icon: Package,
    subject: "Product",
  },
  {
    title: "Stocks",
    description: "Niveaux et seuils par filiale",
    href: "/dashboard/stocks",
    icon: Layers,
    subject: "Stock",
  },
  {
    title: "Budgets",
    description: "Enveloppes et lignes budgétaires",
    href: "/dashboard/budgets",
    icon: Wallet,
    subject: "Budget",
  },
  {
    title: "Synthèse commandes",
    description: "Volumes fournisseurs en FCFA",
    href: "/dashboard/comptabilite",
    icon: Receipt,
    subject: "StockOrder",
  },
  {
    title: "Journal d'audit",
    description: "Traçabilité des actions sensibles",
    href: "/dashboard/audit",
    icon: ScrollText,
    subject: "AuditLog",
  },
];

export function filterModuleTiles(me: Me): ModuleTile[] {
  return HQ_MODULE_TILES.filter((tile) => {
    if (!tile.subject) return true;
    return hasMePermission(me, "read", tile.subject);
  });
}
