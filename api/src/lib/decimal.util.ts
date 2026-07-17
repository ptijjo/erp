import { Prisma } from '../generated/prisma/client';

/** Convertit une valeur Decimal / string / number en Prisma.Decimal. */
export function toDecimal(
  value: Prisma.Decimal | string | number | null | undefined,
): Prisma.Decimal {
  if (value == null) {
    return new Prisma.Decimal(0);
  }
  if (value instanceof Prisma.Decimal) {
    return value;
  }
  return new Prisma.Decimal(value);
}

/** Ratio spent/planned sans conversion flottante destructive (arrondi 4 décimales). */
export function decimalUtilizationRatio(
  spent: Prisma.Decimal | string | number | null | undefined,
  planned: Prisma.Decimal | string | number | null | undefined,
): Prisma.Decimal {
  const p = toDecimal(planned);
  if (p.lte(0)) {
    return new Prisma.Decimal(0);
  }
  return toDecimal(spent).div(p);
}

export function decimalGte(
  a: Prisma.Decimal | string | number,
  b: Prisma.Decimal | string | number,
): boolean {
  return toDecimal(a).gte(toDecimal(b));
}
