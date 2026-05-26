import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { isMainOrganizationUser } from '../auth/organization-scope';
import { isFullAccessRoleName } from '../casl/define-ability';

/** DG, directeur des opérations ou admin : validation finale des budgets. */
export function isBudgetFinalApprover(user: AuthenticatedUser): boolean {
  return isFullAccessRoleName(user.role.name);
}

/** Pôle finance (directeur ou rôles rattachés au pôle). */
export function isFinancePoleUser(user: AuthenticatedUser): boolean {
  return (
    user.role.poleCode === 'Pole_FINANCE' ||
    user.role.name === 'DIRECTOR_FINANCE'
  );
}

/** Proposition / modification de brouillon et soumission à validation. */
export function assertCanProposeBudget(user: AuthenticatedUser): void {
  if (!isMainOrganizationUser(user)) {
    throw new ForbiddenException(
      'La proposition de budget est réservée à la maison mère.',
    );
  }
  if (!isFinancePoleUser(user) && !isBudgetFinalApprover(user)) {
    throw new ForbiddenException(
      'Seul le pôle finance (ou la direction générale / opérations) peut gérer les propositions budgétaires.',
    );
  }
}

export function assertCanApproveBudget(user: AuthenticatedUser): void {
  if (!isMainOrganizationUser(user)) {
    throw new ForbiddenException(
      'La validation des budgets est réservée à la maison mère.',
    );
  }
  if (!isBudgetFinalApprover(user)) {
    throw new ForbiddenException(
      'Seuls le directeur général, le directeur des opérations ou l’administrateur peuvent valider un budget.',
    );
  }
}

export function assertCanReviewSupplementAsFinance(
  user: AuthenticatedUser,
): void {
  if (!isMainOrganizationUser(user)) {
    throw new ForbiddenException(
      'L’étude des demandes de rallonge est réservée à la maison mère.',
    );
  }
  if (!isFinancePoleUser(user) && !isBudgetFinalApprover(user)) {
    throw new ForbiddenException(
      'Seul le pôle finance peut instruire une demande de rallonge.',
    );
  }
}
