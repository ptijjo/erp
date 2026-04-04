/** Prisma Decimal JSON → nombre JS pour l’affichage. */
export function parseDecimal(value: string | number): number {
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
