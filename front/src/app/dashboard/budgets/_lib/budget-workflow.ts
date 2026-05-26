import type { Me } from "~/hooks/use-me";

const BUDGET_APPROVER_ROLES = new Set([
  "ADMIN",
  "DIRECTOR_GENERAL",
  "DIRECTOR_OPERATIONS",
]);

export function isBudgetFinalApprover(me: Me): boolean {
  return BUDGET_APPROVER_ROLES.has(me.role.name);
}

export function isFinancePoleUser(me: Me): boolean {
  return (
    me.role.poleCode === "Pole_FINANCE" ||
    me.role.name === "DIRECTOR_FINANCE"
  );
}

export function canProposeBudget(me: Me, isMain: boolean): boolean {
  return isMain && (isFinancePoleUser(me) || isBudgetFinalApprover(me));
}
