/**
 * Catalogue CASL côté front — aligné sur
 * `api/src/casl/define-ability.ts` et `api/src/seeder/casl-permission-names.ts`.
 * Utiliser ces chaînes avec `hasMePermission(me, action, subject)`.
 */

export const PERMISSION_ACTIONS = [
  "read",
  "create",
  "update",
  "delete",
  "manage",
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

/** Sujets `@CheckPolicies` — même ordre que `KNOWN_POLICY_SUBJECTS` (API). */
export const KNOWN_POLICY_SUBJECTS = [
  "User",
  "Organization",
  "Role",
  "Pole",
  "Permission",
  "AuditLog",
  "LoginAttempt",
  "Category",
  "Product",
  "Stock",
  "StockOrder",
  "Vente",
  "SessionCaisse",
  "StockMovement",
  "StockTransfer",
  "HeritageAsset",
  "LegalContract",
  "ProductionOrder",
  "AccountingPeriod",
  "Notification",
  "Message",
  "Task",
  "Supplier",
  "Budget",
  "BudgetExpense",
  "BudgetSupplementRequest",
  "Department",
  "Employee",
  "LeaveRequest",
  "LeaveBalance",
  "EmploymentContract",
  "EmployeeSalary",
] as const;

export type PolicySubject = (typeof KNOWN_POLICY_SUBJECTS)[number];

/** Noms `Permission.name` attendus en base (seed). */
export const CASL_PERMISSION_NAMES = [
  "read:User",
  "create:User",
  "update:User",
  "delete:User",
  "read:Organization",
  "create:Organization",
  "update:Organization",
  "delete:Organization",
  "read:Role",
  "create:Role",
  "update:Role",
  "delete:Role",
  "read:Pole",
  "create:Pole",
  "update:Pole",
  "delete:Pole",
  "read:Permission",
  "create:Permission",
  "update:Permission",
  "delete:Permission",
  "read:AuditLog",
  "read:LoginAttempt",
  "read:Category",
  "create:Category",
  "update:Category",
  "delete:Category",
  "read:Product",
  "create:Product",
  "update:Product",
  "delete:Product",
  "read:Stock",
  "create:Stock",
  "update:Stock",
  "delete:Stock",
  "read:StockOrder",
  "create:StockOrder",
  "update:StockOrder",
  "delete:StockOrder",
  "read:Vente",
  "create:Vente",
  "update:Vente",
  "delete:Vente",
  "read:SessionCaisse",
  "create:SessionCaisse",
  "update:SessionCaisse",
  "read:StockMovement",
  "read:StockTransfer",
  "create:StockTransfer",
  "update:StockTransfer",
  "delete:StockTransfer",
  "read:HeritageAsset",
  "create:HeritageAsset",
  "update:HeritageAsset",
  "delete:HeritageAsset",
  "read:LegalContract",
  "create:LegalContract",
  "update:LegalContract",
  "delete:LegalContract",
  "read:ProductionOrder",
  "create:ProductionOrder",
  "update:ProductionOrder",
  "delete:ProductionOrder",
  "read:AccountingPeriod",
  "manage:AccountingPeriod",
  "read:Notification",
  "update:Notification",
  "read:Message",
  "create:Message",
  "update:Message",
  "read:Task",
  "create:Task",
  "update:Task",
  "delete:Task",
  "read:Supplier",
  "create:Supplier",
  "update:Supplier",
  "delete:Supplier",
  "read:Budget",
  "create:Budget",
  "update:Budget",
  "delete:Budget",
  "read:BudgetExpense",
  "create:BudgetExpense",
  "update:BudgetExpense",
  "delete:BudgetExpense",
  "read:BudgetSupplementRequest",
  "create:BudgetSupplementRequest",
  "update:BudgetSupplementRequest",
  "delete:BudgetSupplementRequest",
  "read:Department",
  "create:Department",
  "update:Department",
  "delete:Department",
  "read:Employee",
  "create:Employee",
  "update:Employee",
  "delete:Employee",
  "read:LeaveRequest",
  "create:LeaveRequest",
  "update:LeaveRequest",
  "delete:LeaveRequest",
  "read:LeaveBalance",
  "create:LeaveBalance",
  "update:LeaveBalance",
  "delete:LeaveBalance",
  "read:EmploymentContract",
  "create:EmploymentContract",
  "update:EmploymentContract",
  "delete:EmploymentContract",
  "read:EmployeeSalary",
  "create:EmployeeSalary",
  "update:EmployeeSalary",
  "delete:EmployeeSalary",
  "read:all",
  "manage:all",
] as const;

export type CaslPermissionName = (typeof CASL_PERMISSION_NAMES)[number];

const ACTION_LABEL: Record<string, string> = {
  read: "Lecture",
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  manage: "Gestion complète",
};

/** Libellés français pour filtrer / regrouper le catalogue. */
export const SUBJECT_LABELS: Record<PolicySubject, string> = {
  User: "Utilisateurs",
  Organization: "Organisations",
  Role: "Rôles",
  Pole: "Pôles",
  Permission: "Permissions",
  AuditLog: "Journal d'audit",
  LoginAttempt: "Tentatives de connexion",
  Category: "Catégories",
  Product: "Produits",
  Stock: "Stocks",
  StockOrder: "Commandes stock",
  Vente: "Ventes / caisse",
  SessionCaisse: "Sessions de caisse",
  StockMovement: "Mouvements de stock",
  StockTransfer: "Transferts inter-filiales",
  HeritageAsset: "Patrimoine",
  LegalContract: "Contrats juridiques",
  ProductionOrder: "Ordres de production",
  AccountingPeriod: "Clôtures comptables",
  Notification: "Notifications",
  Message: "Messagerie interne",
  Task: "Mes actions (agenda)",
  Supplier: "Fournisseurs",
  Budget: "Budgets",
  BudgetExpense: "Sorties budgétaires",
  BudgetSupplementRequest: "Demandes de rallonge budgétaire",
  Department: "Départements (RH)",
  Employee: "Employés (RH)",
  LeaveRequest: "Demandes de congé (RH)",
  LeaveBalance: "Soldes de congé (RH)",
  EmploymentContract: "Contrats (RH)",
  EmployeeSalary: "Salaires (RH)",
};

/** Regroupement UI (assignation rôle ↔ permission). */
export const POLICY_SUBJECT_GROUPS: {
  id: string;
  label: string;
  subjects: readonly PolicySubject[];
}[] = [
  {
    id: "organisation",
    label: "Organisation & accès",
    subjects: ["User", "Organization", "Role", "Pole", "Permission"],
  },
  {
    id: "gouvernance",
    label: "Gouvernance",
    subjects: ["AuditLog", "LoginAttempt"],
  },
  {
    id: "catalogue",
    label: "Catalogue",
    subjects: ["Category", "Product", "Supplier"],
  },
  {
    id: "operations",
    label: "Opérations",
    subjects: [
      "Stock",
      "StockOrder",
      "StockMovement",
      "StockTransfer",
      "Vente",
      "SessionCaisse",
      "AccountingPeriod",
      "Notification",
      "Message",
      "Task",
    ],
  },
  {
    id: "poles",
    label: "Pôles métier",
    subjects: ["HeritageAsset", "LegalContract", "ProductionOrder"],
  },
  {
    id: "finance",
    label: "Finance",
    subjects: ["Budget", "BudgetExpense", "BudgetSupplementRequest"],
  },
  {
    id: "rh",
    label: "Ressources humaines",
    subjects: [
      "Department",
      "Employee",
      "LeaveRequest",
      "LeaveBalance",
      "EmploymentContract",
      "EmployeeSalary",
    ],
  },
];

export function describePermissionName(name: string): string {
  const normalized = name.trim();
  if (normalized === "read:all") {
    return "Lecture sur tous les modules (wildcard CASL)";
  }
  if (normalized === "manage:all") {
    return "Gestion complète sur tous les modules (wildcard CASL)";
  }
  const idx = normalized.indexOf(":");
  if (idx <= 0) {
    return normalized;
  }
  const action = normalized.slice(0, idx).toLowerCase();
  const subject = normalized.slice(idx + 1);
  const actionFr = ACTION_LABEL[action] ?? action;
  const subjectLabel =
    subject in SUBJECT_LABELS
      ? SUBJECT_LABELS[subject as PolicySubject]
      : subject;
  return `${actionFr} — ${subjectLabel}`;
}

export function parsePermissionName(
  name: string,
): { action: string; subject: string } | null {
  const trimmed = name.trim();
  const idx = trimmed.indexOf(":");
  if (idx <= 0 || idx === trimmed.length - 1) {
    return null;
  }
  const action = trimmed.slice(0, idx).toLowerCase();
  const subject = trimmed.slice(idx + 1);
  if (!PERMISSION_ACTIONS.includes(action as PermissionAction)) {
    return null;
  }
  return { action, subject };
}

export function subjectForPermissionName(name: string): PolicySubject | null {
  const parsed = parsePermissionName(name);
  if (!parsed || parsed.subject === "all") {
    return null;
  }
  return KNOWN_POLICY_SUBJECTS.includes(parsed.subject as PolicySubject)
    ? (parsed.subject as PolicySubject)
    : null;
}

export function actionLabelForPermissionName(name: string): string {
  const parsed = parsePermissionName(name);
  if (!parsed) {
    if (name === "read:all") return "Lecture";
    if (name === "manage:all") return "Gestion";
    return "";
  }
  return ACTION_LABEL[parsed.action] ?? parsed.action;
}

export function groupLabelForPermissionName(name: string): string {
  const subject = subjectForPermissionName(name);
  if (!subject) {
    if (name === "read:all" || name === "manage:all") {
      return "Wildcards";
    }
    return "Autre";
  }
  const group = POLICY_SUBJECT_GROUPS.find((g) => g.subjects.includes(subject));
  return group?.label ?? "Autre";
}
