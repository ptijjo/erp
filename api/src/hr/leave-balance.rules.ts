/** Droit annuel de congés (jours ouvrés / calendaires selon saisie des demandes). */
export const LEAVE_ANNUAL_ENTITLEMENT_DAYS = 30;

/** Mois de renouvellement (1 = janvier, 5 = mai). */
export const LEAVE_RENEWAL_MONTH = 5;

export type LeaveBalanceRow = {
  year: number;
  totalDays: number;
  usedDays: number;
};

/**
 * Année de rattachement des congés : période du 1er mai N au 30 avril N+1.
 * Ex. le 15 mars 2026 → exercice 2025 ; le 10 juin 2026 → exercice 2026.
 */
export function getLeaveYear(referenceDate: Date): number {
  const month = referenceDate.getMonth() + 1;
  const calendarYear = referenceDate.getFullYear();
  return month >= LEAVE_RENEWAL_MONTH ? calendarYear : calendarYear - 1;
}

/** Jours non consommés sur les exercices antérieurs (cumul autorisé). */
export function computeCarriedOverDays(
  balances: LeaveBalanceRow[],
  forLeaveYear: number,
): number {
  return balances
    .filter((b) => b.year < forLeaveYear)
    .reduce(
      (sum, b) => sum + Math.max(0, b.totalDays - b.usedDays),
      0,
    );
}

/** Quota total pour un nouvel exercice (30 j + report). */
export function computeTotalDaysForLeaveYear(
  balances: LeaveBalanceRow[],
  leaveYear: number,
): number {
  return (
    LEAVE_ANNUAL_ENTITLEMENT_DAYS +
    computeCarriedOverDays(balances, leaveYear)
  );
}

export function computeRemainingDays(row: LeaveBalanceRow): number {
  return Math.max(0, row.totalDays - row.usedDays);
}

/** Nombre de jours inclusifs entre deux dates (UTC date-only). */
export function countInclusiveLeaveDays(start: Date, end: Date): number {
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
  );
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const msPerDay = 86_400_000;
  return Math.floor((endUtc - startUtc) / msPerDay) + 1;
}

export function formatLeaveYearLabel(leaveYear: number): string {
  return `Mai ${leaveYear} – Avr. ${leaveYear + 1}`;
}
