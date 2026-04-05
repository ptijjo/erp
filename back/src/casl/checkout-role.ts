import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from './define-ability';

/**
 * Rôles « caissier » (nom contenant « caissier », insensible à la casse) :
 * droits minimaux ajoutés **en plus** des `PermissionRole` en base
 * (voir docs/PERMISSIONS-CASL.md).
 *
 * Session de caisse : lecture + **ouverture** (`create`) et **clôture** (`update`).
 * La suppression (`delete`) reste réservée aux rôles explicitement autorisés en base.
 */
export function isCheckoutRoleName(roleName: string): boolean {
  return /caissier/i.test(roleName.trim());
}

export function applyCheckoutRoleBaselineRules(
  can: AbilityBuilder<AppAbility>['can'],
): void {
  can('read', 'Product');
  can('read', 'Category');
  can('read', 'SessionCaisse');
  can('create', 'SessionCaisse');
  can('update', 'SessionCaisse');
}
