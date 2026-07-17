import type { LucideIcon } from "lucide-react";
import {
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Building2,
  ClipboardList,
  ContactRound,
  Factory,
  FolderTree,
  History,
  Landmark,
  ListChecks,
  Lock,
  Layers,
  LayoutDashboard,
  Megaphone,
  Package,
  Receipt,
  Scale,
  ScanLine,
  MessageSquare,
  ScrollText,
  Sparkles,
  Target,
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
import type { PermissionAction } from "~/lib/me-ability";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  requiredPermission?: { action: PermissionAction; subject: string };
  mainOnly?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

const ANALYTICS_READ_SUBJECTS = [
  "Budget",
  "Vente",
  "Stock",
  "Employee",
  "StockOrder",
  "Product",
] as const;

export function hasAnalyticsAccess(me: Me): boolean {
  return ANALYTICS_READ_SUBJECTS.some((subject) =>
    hasMePermission(me, "read", subject),
  );
}

/** Filiale : catalogue vente assigné (requis pour la caisse). */
export function subsidiaryHasSalesCatalog(me: Me): boolean {
  if (me.organizationType !== "SUBSIDIARY") return true;
  return me.hasSalesCatalog;
}

/** Filiale : voir l’entrée menu Caisse (lecture ou exploitation). */
export function canSeeCaisseNav(me: Me): boolean {
  if (isMainOrganization(me)) return false;
  if (!subsidiaryHasSalesCatalog(me)) return false;
  return (
    hasMePermission(me, "read", "SessionCaisse") ||
    hasMePermission(me, "read", "Vente") ||
    hasMePermission(me, "create", "Vente") ||
    hasMePermission(me, "create", "SessionCaisse")
  );
}

/** Filiale : ouvrir une session et/ou encaisser des ventes. */
export function canOperateCaisse(me: Me): boolean {
  if (isMainOrganization(me)) return false;
  if (!subsidiaryHasSalesCatalog(me)) return false;
  return (
    hasMePermission(me, "create", "Vente") ||
    hasMePermission(me, "create", "SessionCaisse")
  );
}

/** @deprecated Préférer canOperateCaisse ou canSeeCaisseNav */
export function canAccessCaisse(me: Me): boolean {
  return canOperateCaisse(me);
}

/** Filiale : historique des sessions de caisse. */
export function canReadSessionCaisseHistory(me: Me): boolean {
  if (isMainOrganization(me)) return false;
  if (!subsidiaryHasSalesCatalog(me)) return false;
  return hasMePermission(me, "read", "SessionCaisse");
}

const baseNavItems: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Rapports & analyses",
    href: "/dashboard/rapports",
    icon: BarChart3,
  },
  {
    label: "Utilisateurs",
    href: "/dashboard/utilisateurs",
    icon: Users,
    requiredPermission: { action: "read", subject: "User" },
  },
  {
    label: "Annuaire",
    href: "/dashboard/annuaire",
    icon: ContactRound,
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
    href: "/dashboard/hq/organisations",
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
    href: "/dashboard/hq/fournisseurs",
    icon: Truck,
    requiredPermission: { action: "read", subject: "Supplier" },
    mainOnly: true,
  },
  {
    label: "Catégories",
    href: "/dashboard/hq/categories",
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
    label: "Transferts stock",
    href: "/dashboard/stocks/transferts",
    icon: ArrowLeftRight,
    requiredPermission: { action: "read", subject: "StockTransfer" },
  },
  {
    label: "Journal mouvements",
    href: "/dashboard/stocks/mouvements",
    icon: ClipboardList,
    requiredPermission: { action: "read", subject: "StockMovement" },
  },
  {
    label: "Production",
    href: "/dashboard/production",
    icon: Factory,
    requiredPermission: { action: "read", subject: "ProductionOrder" },
  },
  {
    label: "Caisse",
    href: "/dashboard/subsidiary/caisse",
    icon: ScanLine,
  },
  {
    label: "Mes sessions caisse",
    href: "/dashboard/subsidiary/compte",
    icon: History,
  },
  {
    label: "Budgets",
    href: "/dashboard/budgets",
    icon: Wallet,
    requiredPermission: { action: "read", subject: "Budget" },
  },
  {
    label: "Clôtures comptables",
    href: "/dashboard/tresorerie",
    icon: Lock,
    requiredPermission: { action: "read", subject: "AccountingPeriod" },
  },
  {
    label: "Synthèse commandes",
    href: "/dashboard/comptabilite",
    icon: Receipt,
    requiredPermission: { action: "read", subject: "StockOrder" },
  },
  {
    label: "Commandes inter-filiales",
    href: "/dashboard/commandes-inter-filiales",
    icon: ArrowLeftRight,
    requiredPermission: { action: "read", subject: "StockOrder" },
  },
  {
    label: "Stratégie",
    href: "/dashboard/strategie",
    icon: Target,
    requiredPermission: { action: "read", subject: "StrategyProject" },
  },
  {
    label: "Marketing",
    href: "/dashboard/marketing",
    icon: Megaphone,
    requiredPermission: { action: "read", subject: "MarketingCampaign" },
  },
  {
    label: "Événements",
    href: "/dashboard/evenements",
    icon: Sparkles,
    requiredPermission: { action: "read", subject: "SpiritualEvent" },
  },
  {
    label: "Comptabilité générale",
    href: "/dashboard/comptabilite-generale",
    icon: BookOpen,
    requiredPermission: { action: "read", subject: "JournalEntry" },
  },
  {
    label: "Patrimoine",
    href: "/dashboard/patrimoine",
    icon: Landmark,
    requiredPermission: { action: "read", subject: "HeritageAsset" },
  },
  {
    label: "Juridique",
    href: "/dashboard/juridique",
    icon: Scale,
    requiredPermission: { action: "read", subject: "LegalContract" },
  },
  {
    label: "Journal d'audit",
    href: "/dashboard/audit",
    icon: ScrollText,
    requiredPermission: { action: "read", subject: "AuditLog" },
  },
  {
    label: "Mes actions",
    href: "/dashboard/mes-actions",
    icon: ListChecks,
    requiredPermission: { action: "read", subject: "Task" },
  },
  {
    label: "Événements",
    href: "/dashboard/evenements-spirituels",
    icon: Sparkles,
  },
  {
    label: "Messagerie",
    href: "/dashboard/messages",
    icon: MessageSquare,
    requiredPermission: { action: "read", subject: "Message" },
  },
];

/** Navigation simplifiée pour la maison mère (vue holding). */
const HQ_PRIMARY_NAV: NavItem[] = [
  {
    label: "Tableau de bord",
    href: "/dashboard/hq",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Mes actions",
    href: "/dashboard/mes-actions",
    icon: ListChecks,
    requiredPermission: { action: "read", subject: "Task" },
  },
  {
    label: "Événements",
    href: "/dashboard/evenements-spirituels",
    icon: Sparkles,
  },
  {
    label: "Filiales",
    href: "/dashboard/hq/organisations",
    icon: Building2,
    requiredPermission: { action: "read", subject: "Organization" },
  },
  {
    label: "Finances",
    href: "/dashboard/budgets",
    icon: Wallet,
    requiredPermission: { action: "read", subject: "Budget" },
  },
  {
    label: "Stocks",
    href: "/dashboard/stocks",
    icon: Layers,
    requiredPermission: { action: "read", subject: "Stock" },
  },
  {
    label: "Commandes",
    href: "/dashboard/comptabilite",
    icon: Receipt,
    requiredPermission: { action: "read", subject: "StockOrder" },
  },
  {
    label: "Commandes inter-filiales",
    href: "/dashboard/commandes-inter-filiales",
    icon: ArrowLeftRight,
    requiredPermission: { action: "read", subject: "StockOrder" },
  },
  {
    label: "Rapports",
    href: "/dashboard/rapports",
    icon: BarChart3,
  },
];

const HQ_ADMIN_NAV: NavItem[] = [
  {
    label: "Utilisateurs",
    href: "/dashboard/utilisateurs",
    icon: Users,
    requiredPermission: { action: "read", subject: "User" },
  },
  {
    label: "Annuaire",
    href: "/dashboard/annuaire",
    icon: ContactRound,
    requiredPermission: { action: "read", subject: "User" },
  },
  {
    label: "Ressources humaines",
    href: "/dashboard/rh",
    icon: UserCircle,
    requiredPermission: { action: "read", subject: "Employee" },
  },
  {
    label: "Catalogue",
    href: "/dashboard/produits",
    icon: Package,
    requiredPermission: { action: "read", subject: "Product" },
  },
  {
    label: "Catégories",
    href: "/dashboard/hq/categories",
    icon: FolderTree,
    requiredPermission: { action: "read", subject: "Category" },
  },
  {
    label: "Fournisseurs",
    href: "/dashboard/hq/fournisseurs",
    icon: Truck,
    requiredPermission: { action: "read", subject: "Supplier" },
    mainOnly: true,
  },
  {
    label: "Clôtures comptables",
    href: "/dashboard/tresorerie",
    icon: Lock,
    requiredPermission: { action: "read", subject: "AccountingPeriod" },
  },
  {
    label: "Patrimoine",
    href: "/dashboard/patrimoine",
    icon: Landmark,
    requiredPermission: { action: "read", subject: "HeritageAsset" },
  },
  {
    label: "Juridique",
    href: "/dashboard/juridique",
    icon: Scale,
    requiredPermission: { action: "read", subject: "LegalContract" },
  },
  {
    label: "Stratégie",
    href: "/dashboard/strategie",
    icon: Target,
    requiredPermission: { action: "read", subject: "StrategyProject" },
  },
  {
    label: "Marketing",
    href: "/dashboard/marketing",
    icon: Megaphone,
    requiredPermission: { action: "read", subject: "MarketingCampaign" },
  },
  {
    label: "Événements",
    href: "/dashboard/evenements",
    icon: Sparkles,
    requiredPermission: { action: "read", subject: "SpiritualEvent" },
  },
  {
    label: "Comptabilité générale",
    href: "/dashboard/comptabilite-generale",
    icon: BookOpen,
    requiredPermission: { action: "read", subject: "JournalEntry" },
  },
  {
    label: "Production",
    href: "/dashboard/production",
    icon: Factory,
    requiredPermission: { action: "read", subject: "ProductionOrder" },
  },
  {
    label: "Journal d'audit",
    href: "/dashboard/audit",
    icon: ScrollText,
    requiredPermission: { action: "read", subject: "AuditLog" },
  },
  {
    label: "Messagerie",
    href: "/dashboard/messages",
    icon: MessageSquare,
    requiredPermission: { action: "read", subject: "Message" },
  },
];

const SECTION_BY_HREF: Record<string, string> = {
  "/dashboard": "accueil",
  "/dashboard/rapports": "accueil",
  "/dashboard/utilisateurs": "organisation",
  "/dashboard/annuaire": "organisation",
  "/dashboard/rh": "rh",
  "/dashboard/hq/organisations": "organisation",
  "/dashboard/produits": "catalogue",
  "/dashboard/hq/fournisseurs": "catalogue",
  "/dashboard/hq/categories": "catalogue",
  "/dashboard/stocks": "operations",
  "/dashboard/stocks/transferts": "operations",
  "/dashboard/stocks/mouvements": "operations",
  "/dashboard/production": "operations",
  "/dashboard/patrimoine": "gouvernance",
  "/dashboard/juridique": "gouvernance",
  "/dashboard/subsidiary/caisse": "operations",
  "/dashboard/subsidiary/compte": "operations",
  "/dashboard/comptabilite": "operations",
  "/dashboard/commandes-inter-filiales": "operations",
  "/dashboard/strategie": "gouvernance",
  "/dashboard/marketing": "gouvernance",
  "/dashboard/evenements": "gouvernance",
  "/dashboard/comptabilite-generale": "finance",
  "/dashboard/budgets": "finance",
  "/dashboard/tresorerie": "finance",
  "/dashboard/audit": "gouvernance",
  "/dashboard/mes-actions": "operations",
  "/dashboard/messages": "gouvernance",
};

const SECTION_LABELS: Record<string, string> = {
  accueil: "Accueil",
  organisation: "Organisation",
  rh: "Ressources humaines",
  catalogue: "Catalogue",
  operations: "Opérations",
  finance: "Finance",
  gouvernance: "Gouvernance",
};

function itemIsAllowed(me: Me, item: NavItem): boolean {
  if (item.href === "/dashboard/rapports" && !hasAnalyticsAccess(me)) {
    return false;
  }
  if (item.href === "/dashboard/subsidiary/caisse" && !canSeeCaisseNav(me)) {
    return false;
  }
  if (item.href === "/dashboard/subsidiary/compte" && !canReadSessionCaisseHistory(me)) {
    return false;
  }
  if (item.mainOnly && !isMainOrganization(me)) return false;
  if (
    !isMainOrganization(me) &&
    item.href === "/dashboard/hq/organisations"
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

  if (isMainOrganization(me)) {
    const pilotage = HQ_PRIMARY_NAV.filter((item) => itemIsAllowed(me, item));
    const administration = HQ_ADMIN_NAV.filter((item) => itemIsAllowed(me, item));
    const sections: NavSection[] = [];

    if (pilotage.length > 0) {
      sections.push({ id: "pilotage", label: "Pilotage", items: pilotage });
    }
    if (administration.length > 0) {
      sections.push({
        id: "administration",
        label: "Administration",
        items: administration,
      });
    }
    return sections;
  }

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
    href: "/dashboard/hq/organisations",
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
    title: "Rapports & analyses",
    description: "Synthèse budget, RH, stocks et commandes",
    href: "/dashboard/rapports",
    icon: BarChart3,
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
  {
    title: "Patrimoine",
    description: "Actifs et biens patrimoniaux",
    href: "/dashboard/patrimoine",
    icon: Landmark,
    subject: "HeritageAsset",
  },
  {
    title: "Juridique",
    description: "Contrats et engagements",
    href: "/dashboard/juridique",
    icon: Scale,
    subject: "LegalContract",
  },
  {
    title: "Stratégie",
    description: "Projets stratégiques et développement",
    href: "/dashboard/strategie",
    icon: Target,
    subject: "StrategyProject",
  },
  {
    title: "Marketing",
    description: "Campagnes et communication",
    href: "/dashboard/marketing",
    icon: Megaphone,
    subject: "MarketingCampaign",
  },
  {
    title: "Événements",
    description: "Créer et publier des événements groupe",
    href: "/dashboard/evenements",
    icon: Sparkles,
    subject: "SpiritualEvent",
  },
  {
    title: "Comptabilité générale",
    description: "Plan comptable et écritures",
    href: "/dashboard/comptabilite-generale",
    icon: BookOpen,
    subject: "JournalEntry",
  },
  {
    title: "Production",
    description: "Ordres de fabrication",
    href: "/dashboard/production",
    icon: Factory,
    subject: "ProductionOrder",
  },
  {
    title: "Mes actions",
    description: "Tâches et actions à traiter",
    href: "/dashboard/mes-actions",
    icon: ListChecks,
    subject: "Task",
  },
  {
    title: "Messagerie",
    description: "Échanges internes maison mère et filiales",
    href: "/dashboard/messages",
    icon: MessageSquare,
    subject: "Message",
  },
];

export function filterModuleTiles(me: Me): ModuleTile[] {
  const tiles = HQ_MODULE_TILES.filter((tile) => {
    if (tile.href === "/dashboard/rapports") {
      return hasAnalyticsAccess(me);
    }
    if (!tile.subject) return true;
    return hasMePermission(me, "read", tile.subject);
  });

  // Directeur de pôle (hors FULL_ACCESS) : modules du pôle en tête.
  const poleCode = me.role.poleCode;
  if (
    me.permissionMode !== "FULL_ACCESS" &&
    poleCode &&
    me.role.name.startsWith("DIRECTOR_")
  ) {
    const poleHrefPriority: Record<string, string[]> = {
      Pole_FINANCE: ["/dashboard/budgets", "/dashboard/comptabilite", "/dashboard/comptabilite-generale", "/dashboard/tresorerie"],
      Pole_HR: ["/dashboard/rh", "/dashboard/utilisateurs"],
      Pole_OPERATIONS: ["/dashboard/stocks", "/dashboard/produits", "/dashboard/commandes-inter-filiales"],
      Pole_PRODUCTION: ["/dashboard/production", "/dashboard/stocks"],
      Pole_LEGAL: ["/dashboard/juridique"],
      Pole_ARCHITECTURE_HERITAGE: ["/dashboard/patrimoine"],
      Pole_STRATEGY_DEVELOPMENT: ["/dashboard/strategie"],
      Pole_MARKETING_COMMUNICATION: ["/dashboard/marketing"],
    };
    const priority = new Set(poleHrefPriority[poleCode] ?? []);
    return [...tiles].sort((a, b) => {
      const ap = priority.has(a.href) ? 0 : 1;
      const bp = priority.has(b.href) ? 0 : 1;
      return ap - bp;
    });
  }

  return tiles;
}

/** Tuiles d’accueil pour les utilisateurs filiale. */
export const SUBSIDIARY_MODULE_TILES: ModuleTile[] = [
  {
    title: "Produits",
    description: "Catalogue et prix de vente",
    href: "/dashboard/produits",
    icon: Package,
    subject: "Product",
  },
  {
    title: "Stocks",
    description: "Niveaux, commandes et réceptions",
    href: "/dashboard/stocks",
    icon: Layers,
    subject: "Stock",
  },
  {
    title: "Caisse",
    description: "Sessions, scan QR et encaissement",
    href: "/dashboard/subsidiary/caisse",
    icon: ScanLine,
  },
  {
    title: "Budgets",
    description: "Enveloppe validée et sorties réelles",
    href: "/dashboard/budgets",
    icon: Wallet,
    subject: "Budget",
  },
  {
    title: "Ressources humaines",
    description: "Employés, congés et contrats",
    href: "/dashboard/rh",
    icon: UserCircle,
    subject: "Employee",
  },
  {
    title: "Transferts stock",
    description: "Échanges entre filiales",
    href: "/dashboard/stocks/transferts",
    icon: ArrowLeftRight,
    subject: "StockTransfer",
  },
  {
    title: "Mes actions",
    description: "Vos tâches et actions en attente",
    href: "/dashboard/mes-actions",
    icon: ListChecks,
    subject: "Task",
  },
  {
    title: "Messagerie",
    description: "Échanges avec la maison mère et les filiales",
    href: "/dashboard/messages",
    icon: MessageSquare,
    subject: "Message",
  },
  {
    title: "Rapports",
    description: "Synthèse de votre filiale",
    href: "/dashboard/rapports",
    icon: BarChart3,
  },
];

export function filterSubsidiaryModuleTiles(me: Me): ModuleTile[] {
  return SUBSIDIARY_MODULE_TILES.filter((tile) => {
    if (tile.href === "/dashboard/subsidiary/caisse") {
      return canSeeCaisseNav(me);
    }
    if (tile.href === "/dashboard/rapports") {
      return hasAnalyticsAccess(me);
    }
    if (!tile.subject) return true;
    return hasMePermission(me, "read", tile.subject);
  });
}
