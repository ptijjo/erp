import {
  computeCarriedOverDays,
  computeTotalDaysForLeaveYear,
  countInclusiveLeaveDays,
  getLeaveYear,
  LEAVE_ANNUAL_ENTITLEMENT_DAYS,
} from './leave-balance.rules';

describe('leave-balance.rules', () => {
  it('détermine l’exercice au renouvellement de mai', () => {
    expect(getLeaveYear(new Date('2026-04-30'))).toBe(2025);
    expect(getLeaveYear(new Date('2026-05-01'))).toBe(2026);
    expect(getLeaveYear(new Date('2027-03-15'))).toBe(2026);
  });

  it('cumule les jours restants des exercices précédents', () => {
    const balances = [
      { year: 2024, totalDays: 30, usedDays: 28 },
      { year: 2025, totalDays: 32, usedDays: 10 },
    ];
    expect(computeCarriedOverDays(balances, 2026)).toBe(24);
    expect(computeTotalDaysForLeaveYear(balances, 2026)).toBe(
      LEAVE_ANNUAL_ENTITLEMENT_DAYS + 24,
    );
  });

  it('compte les jours de congé de façon inclusive', () => {
    expect(
      countInclusiveLeaveDays(
        new Date('2026-06-01'),
        new Date('2026-06-03'),
      ),
    ).toBe(3);
  });
});
