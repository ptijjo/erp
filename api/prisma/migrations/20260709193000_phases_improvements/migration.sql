-- Unicité maison mère (une seule org MAIN active)
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_single_main_idx"
  ON "Organization" ((1))
  WHERE "organizationType" = 'MAIN' AND "deletedAt" IS NULL;

-- Enrichissement patrimoine
ALTER TABLE "HeritageAsset" ADD COLUMN IF NOT EXISTS "depreciationRate" DECIMAL(65,30);
ALTER TABLE "HeritageAsset" ADD COLUMN IF NOT EXISTS "maintenanceNotes" TEXT;
ALTER TABLE "HeritageAsset" ADD COLUMN IF NOT EXISTS "documentUrl" TEXT;
ALTER TABLE "HeritageAsset" ADD COLUMN IF NOT EXISTS "lastInventoryAt" TIMESTAMP(3);

-- Enrichissement juridique
ALTER TABLE "LegalContract" ADD COLUMN IF NOT EXISTS "contractType" TEXT;
ALTER TABLE "LegalContract" ADD COLUMN IF NOT EXISTS "renewalAlertDays" INTEGER;
ALTER TABLE "LegalContract" ADD COLUMN IF NOT EXISTS "documentUrl" TEXT;

-- Enrichissement production
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "materialCost" DECIMAL(65,30);
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "laborCost" DECIMAL(65,30);
ALTER TABLE "ProductionOrder" ADD COLUMN IF NOT EXISTS "bomNotes" TEXT;

-- Enums nouveaux modules
CREATE TYPE "StrategyProjectStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "MarketingCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "SpiritualEventStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ChartAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
CREATE TYPE "JournalEntryStatus" AS ENUM ('DRAFT', 'POSTED');

-- Stratégie
CREATE TABLE "StrategyProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "StrategyProjectStatus" NOT NULL DEFAULT 'PLANNED',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "targetDate" TIMESTAMP(3),
    "budgetEstimate" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "StrategyProject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StrategyProject_organizationId_idx" ON "StrategyProject"("organizationId");
CREATE INDEX "StrategyProject_status_idx" ON "StrategyProject"("status");
CREATE INDEX "StrategyProject_targetDate_idx" ON "StrategyProject"("targetDate");
ALTER TABLE "StrategyProject" ADD CONSTRAINT "StrategyProject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Marketing
CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "description" TEXT,
    "status" "MarketingCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budget" DECIMAL(65,30),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketingCampaign_organizationId_idx" ON "MarketingCampaign"("organizationId");
CREATE INDEX "MarketingCampaign_status_idx" ON "MarketingCampaign"("status");
CREATE INDEX "MarketingCampaign_startDate_idx" ON "MarketingCampaign"("startDate");
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Spirituel
CREATE TABLE "SpiritualEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "eventDate" TIMESTAMP(3),
    "status" "SpiritualEventStatus" NOT NULL DEFAULT 'PLANNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "SpiritualEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SpiritualEvent_organizationId_idx" ON "SpiritualEvent"("organizationId");
CREATE INDEX "SpiritualEvent_status_idx" ON "SpiritualEvent"("status");
CREATE INDEX "SpiritualEvent_eventDate_idx" ON "SpiritualEvent"("eventDate");
ALTER TABLE "SpiritualEvent" ADD CONSTRAINT "SpiritualEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Comptabilité
CREATE TABLE "ChartAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" "ChartAccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "parentId" TEXT,
    CONSTRAINT "ChartAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ChartAccount_organizationId_code_key" ON "ChartAccount"("organizationId", "code");
CREATE INDEX "ChartAccount_organizationId_idx" ON "ChartAccount"("organizationId");
CREATE INDEX "ChartAccount_accountType_idx" ON "ChartAccount"("accountType");
CREATE INDEX "ChartAccount_parentId_idx" ON "ChartAccount"("parentId");
ALTER TABLE "ChartAccount" ADD CONSTRAINT "ChartAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChartAccount" ADD CONSTRAINT "ChartAccount_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ChartAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "status" "JournalEntryStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "JournalEntry_organizationId_idx" ON "JournalEntry"("organizationId");
CREATE INDEX "JournalEntry_entryDate_idx" ON "JournalEntry"("entryDate");
CREATE INDEX "JournalEntry_status_idx" ON "JournalEntry"("status");
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "JournalEntryLine" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "debit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "credit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "journalEntryId" TEXT NOT NULL,
    "chartAccountId" TEXT NOT NULL,
    CONSTRAINT "JournalEntryLine_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "JournalEntryLine_journalEntryId_idx" ON "JournalEntryLine"("journalEntryId");
CREATE INDEX "JournalEntryLine_chartAccountId_idx" ON "JournalEntryLine"("chartAccountId");
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JournalEntryLine" ADD CONSTRAINT "JournalEntryLine_chartAccountId_fkey" FOREIGN KEY ("chartAccountId") REFERENCES "ChartAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
