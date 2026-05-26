import type { Prisma } from '../generated/prisma/client';

export const venteInclude = {
  organization: {
    select: { id: true, name: true, slug: true, organizationType: true },
  },
  user: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  lines: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          qrCode: true,
          price: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  },
  paiements: true,
  sessionCaisse: {
    select: {
      id: true,
      statut: true,
      fondOuverture: true,
      openedAt: true,
    },
  },
} as const;

export type VenteWithDetails = Prisma.VenteGetPayload<{
  include: typeof venteInclude;
}>;

export type LowStockAlertDto = {
  productId: string;
  productName: string;
  quantity: number;
  minQuantity: number;
};

export type ConfirmVenteResultDto = VenteWithDetails & {
  lowStockAlerts: LowStockAlertDto[];
};

export type ScanProductForSaleDto = {
  product: {
    id: string;
    name: string;
    qrCode: string;
    price: string | number;
    category: { id: string; name: string };
  };
  stock: {
    quantity: number;
    minQuantity: number;
    maxQuantity: number | null;
  } | null;
  availableQuantity: number;
  canSell: boolean;
};
