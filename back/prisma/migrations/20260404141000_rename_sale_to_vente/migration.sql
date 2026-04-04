-- RenameEnum
ALTER TYPE "SaleStatus" RENAME TO "VenteStatut";

-- RenameTable
ALTER TABLE "Sale" RENAME TO "Vente";
ALTER TABLE "SaleLine" RENAME TO "VenteLine";

-- RenameColumn
ALTER TABLE "VenteLine" RENAME COLUMN "saleId" TO "venteId";

-- RenameConstraint
ALTER TABLE "Vente" RENAME CONSTRAINT "Sale_pkey" TO "Vente_pkey";
ALTER TABLE "VenteLine" RENAME CONSTRAINT "SaleLine_pkey" TO "VenteLine_pkey";
ALTER TABLE "Vente" RENAME CONSTRAINT "Sale_organizationId_fkey" TO "Vente_organizationId_fkey";
ALTER TABLE "Vente" RENAME CONSTRAINT "Sale_userId_fkey" TO "Vente_userId_fkey";
ALTER TABLE "VenteLine" RENAME CONSTRAINT "SaleLine_saleId_fkey" TO "VenteLine_venteId_fkey";
ALTER TABLE "VenteLine" RENAME CONSTRAINT "SaleLine_productId_fkey" TO "VenteLine_productId_fkey";

-- RenameIndex
ALTER INDEX "Sale_organizationId_idx" RENAME TO "Vente_organizationId_idx";
ALTER INDEX "Sale_userId_idx" RENAME TO "Vente_userId_idx";
ALTER INDEX "Sale_status_idx" RENAME TO "Vente_status_idx";
ALTER INDEX "Sale_createdAt_idx" RENAME TO "Vente_createdAt_idx";
ALTER INDEX "SaleLine_saleId_idx" RENAME TO "VenteLine_venteId_idx";
ALTER INDEX "SaleLine_productId_idx" RENAME TO "VenteLine_productId_idx";
