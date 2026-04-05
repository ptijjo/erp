import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import {
  applyCheckoutRoleBaselineRules,
  isCheckoutRoleName,
} from './checkout-role';

export type AppAbility = MongoAbility;

/**
 * Rôles avec accès total applicatif (CASL ignore la table Permission).
 * Même ensemble que pour la modification des permissions (garde dédiée).
 */
export const FULL_ACCESS_ROLE_NAMES = new Set([
  'ADMIN',
  'DIRECTOR_GENERAL',
  'DIRECTOR_OPERATIONS',
]);

export function isFullAccessRoleName(roleName: string): boolean {
  return FULL_ACCESS_ROLE_NAMES.has(roleName);
}

/**
 * Sujets utilisés dans les décorateurs `@CheckPolicies` (pour `read:all`, `manage:all`, etc.).
 * À tenir à jour si vous ajoutez des contrôleurs sécurisés.
 */
export const KNOWN_POLICY_SUBJECTS = [
  'User',
  'Organization',
  'Role',
  'Permission',
  'AuditLog',
  'LoginAttempt',
  'Category',
  'Product',
  'Stock',
  'Vente',
  'VenteLine',
  'VentePaiement',
  'SessionCaisse',
  'Contrat',
  'PlanningShift',
  'Pointage',
  'Absence',
  'BulletinPaie',
  'BulletinPaieLigne',
] as const;

const VALID_ACTIONS = new Set(['read', 'create', 'update', 'delete', 'manage']);

/**
 * Parse `Permission.name` au format `action:Subject` (ex. `read:Vente`, `manage:Stock`).
 * `read:all` / `manage:all` / etc. s’appliquent à tous les sujets connus.
 */
export function parsePermissionName(
  name: string,
): { action: string; subject: string } | null {
  const trimmed = name.trim();
  const idx = trimmed.indexOf(':');
  if (idx <= 0 || idx === trimmed.length - 1) {
    return null;
  }
  const action = trimmed.slice(0, idx).toLowerCase().trim();
  const subject = trimmed.slice(idx + 1).trim();
  if (!subject || !VALID_ACTIONS.has(action)) {
    return null;
  }
  return { action, subject };
}

/**
 * Fallback si aucune permission n’est liée au rôle en base (comportement historique).
 */
export function defineAbilityFor(user: AuthenticatedUser): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (isFullAccessRoleName(user.role.name)) {
    can('manage', 'all');
  } else {
    can('read', 'all');
  }

  return build();
}

function applyParsedRule(
  can: AbilityBuilder<AppAbility>['can'],
  action: string,
  subject: string,
): void {
  if (subject === 'all') {
    for (const s of KNOWN_POLICY_SUBJECTS) {
      can(action as 'read' | 'create' | 'update' | 'delete' | 'manage', s);
    }
    return;
  }
  can(action as 'read' | 'create' | 'update' | 'delete' | 'manage', subject);
}

/**
 * Ability à partir des liaisons `PermissionRole` du rôle JWT.
 * - Rôles FULL_ACCESS_* : identique à `defineAbilityFor` (ignore la base).
 * - Rôle sans aucune permission liée : fallback `defineAbilityFor`.
 * - Sinon : une règle CASL par permission au format `action:Subject`.
 */
export async function buildAbilityFromDatabase(
  user: AuthenticatedUser,
  prisma: PrismaService,
): Promise<AppAbility> {
  if (isFullAccessRoleName(user.role.name)) {
    return defineAbilityFor(user);
  }

  if (!user.role?.id) {
    return defineAbilityFor(user);
  }

  const links = await prisma.permissionRole.findMany({
    where: { roleId: user.role.id },
    include: { permission: true },
  });

  if (links.length === 0) {
    return defineAbilityFor(user);
  }

  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  for (const row of links) {
    const parsed = parsePermissionName(row.permission.name);
    if (parsed) {
      applyParsedRule(can, parsed.action, parsed.subject);
    }
  }

  if (isCheckoutRoleName(user.role.name)) {
    applyCheckoutRoleBaselineRules(can);
  }

  return build();
}
