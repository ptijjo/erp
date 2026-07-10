import type {
  ChartAccountTypeDto,
  HeritageAssetStatusDto,
  JournalEntryStatusDto,
  LegalContractStatusDto,
  MarketingCampaignStatusDto,
  ProductionOrderStatusDto,
  SpiritualEventStatusDto,
  SpiritualParticipationResponseDto,
  StockMovementTypeDto,
  StockTransferStatusDto,
  StrategyProjectStatusDto,
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

export const STRATEGY_STATUS_LABEL: Record<StrategyProjectStatusDto, string> = {
  PLANNED: "Planifié",
  IN_PROGRESS: "En cours",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

export const MARKETING_STATUS_LABEL: Record<MarketingCampaignStatusDto, string> =
  {
    DRAFT: "Brouillon",
    ACTIVE: "Active",
    PAUSED: "En pause",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
  };

export const SPIRITUAL_STATUS_LABEL: Record<SpiritualEventStatusDto, string> = {
  PLANNED: "Planifié",
  CONFIRMED: "Confirmé",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
};

export const SPIRITUAL_PARTICIPATION_RESPONSE_LABEL: Record<
  SpiritualParticipationResponseDto,
  string
> = {
  PENDING: "Sans réponse",
  ACCEPTED: "Participe",
  DECLINED: "Ne participe pas",
};

export const CHART_ACCOUNT_TYPE_LABEL: Record<ChartAccountTypeDto, string> = {
  ASSET: "Actif",
  LIABILITY: "Passif",
  EQUITY: "Capitaux propres",
  REVENUE: "Produit",
  EXPENSE: "Charge",
};

export const JOURNAL_ENTRY_STATUS_LABEL: Record<JournalEntryStatusDto, string> =
  {
    DRAFT: "Brouillon",
    POSTED: "Comptabilisée",
  };
