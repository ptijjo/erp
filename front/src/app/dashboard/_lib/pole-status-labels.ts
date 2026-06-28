import type {
  HeritageAssetStatusDto,
  LegalContractStatusDto,
  ProductionOrderStatusDto,
  StockMovementTypeDto,
  StockTransferStatusDto,
} from "~/lib/api-types";

export const HERITAGE_STATUS_LABEL: Record<HeritageAssetStatusDto, string> = {
  ACTIVE: "Actif",
  MAINTENANCE: "En maintenance",
  RETIRED: "Retiré",
};

export const LEGAL_STATUS_LABEL: Record<LegalContractStatusDto, string> = {
  DRAFT: "Brouillon",
  ACTIVE: "Actif",
  EXPIRED: "Expiré",
  TERMINATED: "Résilié",
};

export const PRODUCTION_STATUS_LABEL: Record<ProductionOrderStatusDto, string> =
  {
    PLANNED: "Planifié",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminé",
    CANCELLED: "Annulé",
  };

export const STOCK_TRANSFER_STATUS_LABEL: Record<
  StockTransferStatusDto,
  string
> = {
  PENDING: "En attente",
  SHIPPED: "Expédié",
  RECEIVED: "Reçu",
  CANCELLED: "Annulé",
};

export const STOCK_MOVEMENT_TYPE_LABEL: Record<StockMovementTypeDto, string> = {
  RECEIPT_STOCK_ORDER: "Réception commande",
  SALE: "Vente",
  SALE_RETURN: "Retour vente",
  ADJUSTMENT: "Ajustement",
  TRANSFER_OUT: "Transfert sortant",
  TRANSFER_IN: "Transfert entrant",
  INVENTORY: "Inventaire",
};
