import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  assertCanApproveBudget,
  assertCanProposeBudget,
  assertCanReviewSupplementAsFinance,
  isBudgetFinalApprover,
  isFinancePoleUser,
} from './budget-workflow.util';

const financeDirector: AuthenticatedUser = {
  sub: 'u-fin',
  email: 'df@vifaa.local',
  organisationId: 'org-main',
  organizationType: 'MAIN',
  organizationSlug: 'vifaa',
  firstLogin: false,
  role: {
    id: 'r-fin',
    name: 'DIRECTOR_FINANCE',
    description: null,
    poleCode: 'Pole_FINANCE',
  },
};

const hrDirector: AuthenticatedUser = {
  ...financeDirector,
  sub: 'u-hr',
  role: {
    id: 'r-hr',
    name: 'DIRECTOR_HR',
    description: null,
    poleCode: 'Pole_HR',
  },
};

const dg: AuthenticatedUser = {
  ...financeDirector,
  sub: 'u-dg',
  role: {
    id: 'r-dg',
    name: 'DIRECTOR_GENERAL',
    description: null,
    poleCode: null,
  },
};

describe('budget-workflow.util', () => {
  it('identifie le pôle finance', () => {
    expect(isFinancePoleUser(financeDirector)).toBe(true);
    expect(isFinancePoleUser(hrDirector)).toBe(false);
  });

  it('identifie les approbateurs finaux', () => {
    expect(isBudgetFinalApprover(dg)).toBe(true);
    expect(isBudgetFinalApprover(financeDirector)).toBe(false);
  });

  it('autorise finance et DG à proposer', () => {
    expect(() => assertCanProposeBudget(financeDirector)).not.toThrow();
    expect(() => assertCanProposeBudget(dg)).not.toThrow();
  });

  it('refuse un directeur hors finance pour proposer', () => {
    expect(() => assertCanProposeBudget(hrDirector)).toThrow(ForbiddenException);
  });

  it('autorise uniquement DG / ops / admin à approuver', () => {
    expect(() => assertCanApproveBudget(dg)).not.toThrow();
    expect(() => assertCanApproveBudget(financeDirector)).toThrow(
      ForbiddenException,
    );
  });

  it('autorise finance à instruire une rallonge', () => {
    expect(() =>
      assertCanReviewSupplementAsFinance(financeDirector),
    ).not.toThrow();
    expect(() => assertCanReviewSupplementAsFinance(hrDirector)).toThrow(
      ForbiddenException,
    );
  });
});
