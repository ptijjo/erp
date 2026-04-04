import type { VenteListItemDto } from "~/lib/api-types";
import { parseDecimal } from "~/lib/parse-decimal";

export type SaleRow = {
  id: string;
  organizationId: string;
  organizationName: string;
  saleNumber: string;
  clientName: string;
  soldAt: Date;
  paymentMode: string;
  totalFcfa: number;
  /** Produits présents sur la vente (lignes). */
  productIds: string[];
};

function formatPaymentModes(
  paiements: VenteListItemDto["paiements"] | undefined,
): string {
  if (!paiements?.length) return "—";
  return paiements.map((p) => p.modePaiement.toLowerCase()).join(" + ");
}

export function venteToSaleRow(v: VenteListItemDto): SaleRow {
  const productIds = (v.lignes ?? []).map((l) => l.productId);
  return {
    id: v.id,
    organizationId: v.organizationId,
    organizationName: v.organization?.name ?? "—",
    saleNumber:
      v.numeroTicket != null
        ? `#${String(v.numeroTicket)}`
        : v.id.slice(0, 8).toUpperCase(),
    clientName: v.user?.email ?? "—",
    soldAt: new Date(v.createdAt),
    paymentMode: formatPaymentModes(v.paiements),
    totalFcfa: parseDecimal(v.totalAmount),
    productIds,
  };
}
