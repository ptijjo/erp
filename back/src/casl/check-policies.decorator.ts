import { SetMetadata } from '@nestjs/common';
import type { PolicyRule } from './policy.types';

export const CHECK_POLICIES_KEY = 'casl:policies';

/**
 * Exige que l’utilisateur authentifié puisse **toutes** les règles (ET logique).
 * À utiliser avec `JwtAuthGuard` puis `PoliciesGuard`.
 */
export const CheckPolicies = (...policies: PolicyRule[]) =>
  SetMetadata(CHECK_POLICIES_KEY, policies);
