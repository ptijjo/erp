import type { Prisma } from '../generated/prisma/client';
import type { RecordStockMovementInput } from './stock-movement.types';

export async function recordStockMovement(
  tx: Prisma.TransactionClient,
  input: RecordStockMovementInput,
): Promise<void> {
  if (input.quantityDelta === 0) {
    return;
  }
  await tx.stockMovement.create({
    data: {
      organizationId: input.organizationId,
      productId: input.productId,
      quantityDelta: input.quantityDelta,
      type: input.type,
      referenceType: input.referenceType?.trim() || null,
      referenceId: input.referenceId ?? null,
      label: input.label?.trim() || null,
      recordedByUserId: input.recordedByUserId ?? null,
    },
  });
}
