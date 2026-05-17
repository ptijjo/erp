/**
 * Liste alignée sur `docs/PERMISSIONS-CASL.md` (section « Liste plate »).
 * Utilisée par le seeder pour garantir que toutes les permissions CASL existent en base.
 */
export const CASL_SEED_PERMISSION_NAMES = [
  'read:User',
  'create:User',
  'update:User',
  'delete:User',
  'read:Organization',
  'create:Organization',
  'update:Organization',
  'delete:Organization',
  'read:Role',
  'create:Role',
  'update:Role',
  'delete:Role',
  'read:Pole',
  'create:Pole',
  'update:Pole',
  'delete:Pole',
  'read:Permission',
  'create:Permission',
  'update:Permission',
  'delete:Permission',
  'read:AuditLog',
  'read:LoginAttempt',
  'read:Category',
  'create:Category',
  'update:Category',
  'delete:Category',
  'read:Product',
  'create:Product',
  'update:Product',
  'delete:Product',
  'read:Stock',
  'create:Stock',
  'update:Stock',
  'delete:Stock',
  'read:StockOrder',
  'create:StockOrder',
  'update:StockOrder',
  'delete:StockOrder',
  'read:Supplier',
  'create:Supplier',
  'update:Supplier',
  'delete:Supplier',
  'read:Budget',
  'create:Budget',
  'update:Budget',
  'delete:Budget',
  'read:BudgetExpense',
  'create:BudgetExpense',
  'update:BudgetExpense',
  'delete:BudgetExpense',
  'read:all',
  'manage:all',
] as const;

const ACTION_LABEL: Record<string, string> = {
  read: 'Lecture',
  create: 'Création',
  update: 'Modification',
  delete: 'Suppression',
  manage: 'Gestion complète',
};

/** Libellé court pour la colonne `Permission.description`. */
export function describeCaslPermission(name: string): string {
  if (name === 'read:all') {
    return 'Lecture sur tous les modules (wildcard CASL)';
  }
  if (name === 'manage:all') {
    return 'Gestion complète sur tous les modules (wildcard CASL)';
  }
  const idx = name.indexOf(':');
  if (idx <= 0) {
    return name;
  }
  const action = name.slice(0, idx).toLowerCase();
  const subject = name.slice(idx + 1);
  const actionFr = ACTION_LABEL[action] ?? action;
  return `${actionFr} — ${subject}`;
}
