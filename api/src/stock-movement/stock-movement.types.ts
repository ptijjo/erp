import type { Prisma, StockMovementType } from '../generated/prisma/client';

export type RecordStockMovementInput = {
  organizationId: string;
  productId: string;
  quantityDelta: number;
  type: StockMovementType;
  referenceType?: string | null;
  referenceId?: string | null;
  label?: string | null;
  recordedByUserId?: string | null;
};

export type StockMovementWithProduct = Prisma.StockMovementGetPayload<{
  include: {
    product: { select: { id: true; name: true; qrCode: true } };
    organization: { select: { id: true; name: true; slug: true } };
  };
}>;
