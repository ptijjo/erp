import { decimalUtilizationRatio } from '../lib/decimal.util';

describe('decimal.util', () => {
  it('calcule le ratio d’utilisation sans Number()', () => {
    const ratio = decimalUtilizationRatio('90', '100');
    expect(ratio.toString()).toBe('0.9');
    expect(ratio.gte('0.9')).toBe(true);
    expect(decimalUtilizationRatio(0, 100).toString()).toBe('0');
  });
});
