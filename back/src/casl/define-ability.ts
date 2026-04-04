import {
  AbilityBuilder,
  createMongoAbility,
  MongoAbility,
} from '@casl/ability';
import type { AuthenticatedUser } from '../auth/auth.types';

export type AppAbility = MongoAbility;

/** Accès total (CRUD / `manage` sur tous les sujets). */
const FULL_ACCESS_ROLES = new Set([
  'ADMIN',
  'DIRECTOR_GENERAL',
  'DIRECTOR_OPERATIONS',
]);

/**
 * Construit l’ability CASL pour un utilisateur authentifié (JWT / `req.user`).
 * ADMIN, DIRECTOR_GENERAL, DIRECTOR_OPERATIONS : tous droits (`manage` sur `all`).
 * Tout autre rôle : lecture seule sur tous les sujets (`read` sur `all`).
 */
export function defineAbilityFor(user: AuthenticatedUser): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (FULL_ACCESS_ROLES.has(user.role.name)) {
    can('manage', 'all');
  } else {
    can('read', 'all');
  }

  return build();
}
