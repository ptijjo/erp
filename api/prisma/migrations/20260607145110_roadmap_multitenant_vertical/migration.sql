-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('RECEIPT_STOCK_ORDER', 'SALE', 'SALE_RETURN', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN', 'INVENTORY');

-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('PENDING', 'SHIPPED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HeritageAssetStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "LegalContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "ProductionOrderStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantityDelta" INTEGER NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "label" TEXT,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "recordedByUserId" TEXT,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fromOrganizationId" TEXT NOT NULL,
    "toOrganizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "StockTransferStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "requestedByUserId" TEXT,
    "shippedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenteReturn" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "recordedByUserId" TEXT,

    CONSTRAINT "VenteReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenteReturnLine" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "venteReturnId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "VenteReturnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeritageAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "acquiredAt" TIMESTAMP(3),
    "value" DECIMAL(65,30),
    "status" "HeritageAssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "HeritageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalContract" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "partyName" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "LegalContractStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "LegalContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ProductionOrderStatus" NOT NULL DEFAULT 'PLANNED',
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "productId" TEXT,

    CONSTRAINT "ProductionOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_organizationId_idx" ON "StockMovement"("organizationId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "StockTransfer_fromOrganizationId_idx" ON "StockTransfer"("fromOrganizationId");

-- CreateIndex
CREATE INDEX "StockTransfer_toOrganizationId_idx" ON "StockTransfer"("toOrganizationId");

-- CreateIndex
CREATE INDEX "StockTransfer_status_idx" ON "StockTransfer"("status");

-- CreateIndex
CREATE INDEX "StockTransfer_productId_idx" ON "StockTransfer"("productId");

-- CreateIndex
CREATE INDEX "VenteReturn_organizationId_idx" ON "VenteReturn"("organizationId");

-- CreateIndex
CREATE INDEX "VenteReturn_venteId_idx" ON "VenteReturn"("venteId");

-- CreateIndex
CREATE INDEX "VenteReturn_createdAt_idx" ON "VenteReturn"("createdAt");

-- CreateIndex
CREATE INDEX "VenteReturnLine_venteReturnId_idx" ON "VenteReturnLine"("venteReturnId");

-- CreateIndex
CREATE INDEX "VenteReturnLine_productId_idx" ON "VenteReturnLine"("productId");

-- CreateIndex
CREATE INDEX "HeritageAsset_organizationId_idx" ON "HeritageAsset"("organizationId");

-- CreateIndex
CREATE INDEX "HeritageAsset_status_idx" ON "HeritageAsset"("status");

-- CreateIndex
CREATE INDEX "LegalContract_organizationId_idx" ON "LegalContract"("organizationId");

-- CreateIndex
CREATE INDEX "LegalContract_status_idx" ON "LegalContract"("status");

-- CreateIndex
CREATE INDEX "LegalContract_endDate_idx" ON "LegalContract"("endDate");

-- CreateIndex
CREATE INDEX "ProductionOrder_organizationId_idx" ON "ProductionOrder"("organizationId");

-- CreateIndex
CREATE INDEX "ProductionOrder_status_idx" ON "ProductionOrder"("status");

-- CreateIndex
CREATE INDEX "ProductionOrder_productId_idx" ON "ProductionOrder"("productId");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromOrganizationId_fkey" FOREIGN KEY ("fromOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toOrganizationId_fkey" FOREIGN KEY ("toOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteReturn" ADD CONSTRAINT "VenteReturn_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteReturn" ADD CONSTRAINT "VenteReturn_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteReturn" ADD CONSTRAINT "VenteReturn_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteReturnLine" ADD CONSTRAINT "VenteReturnLine_venteReturnId_fkey" FOREIGN KEY ("venteReturnId") REFERENCES "VenteReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteReturnLine" ADD CONSTRAINT "VenteReturnLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeritageAsset" ADD CONSTRAINT "HeritageAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalContract" ADD CONSTRAINT "LegalContract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionOrder" ADD CONSTRAINT "ProductionOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
