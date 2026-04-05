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
  'read:Vente',
  'create:Vente',
  'update:Vente',
  'delete:Vente',
  'read:VenteLine',
  'create:VenteLine',
  'update:VenteLine',
  'delete:VenteLine',
  'read:VentePaiement',
  'create:VentePaiement',
  'update:VentePaiement',
  'delete:VentePaiement',
  'read:SessionCaisse',
  'create:SessionCaisse',
  'update:SessionCaisse',
  'delete:SessionCaisse',
  'read:Contrat',
  'create:Contrat',
  'update:Contrat',
  'delete:Contrat',
  'read:PlanningShift',
  'create:PlanningShift',
  'update:PlanningShift',
  'delete:PlanningShift',
  'read:Pointage',
  'create:Pointage',
  'update:Pointage',
  'delete:Pointage',
  'read:Absence',
  'create:Absence',
  'update:Absence',
  'delete:Absence',
  'read:BulletinPaie',
  'create:BulletinPaie',
  'update:BulletinPaie',
  'delete:BulletinPaie',
  'read:BulletinPaieLigne',
  'create:BulletinPaieLigne',
  'update:BulletinPaieLigne',
  'delete:BulletinPaieLigne',
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
