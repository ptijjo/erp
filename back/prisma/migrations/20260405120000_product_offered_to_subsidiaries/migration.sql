-- AlterTable
ALTER TABLE "Product" ADD COLUMN "offeredToSubsidiaries" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Product_offeredToSubsidiaries_idx" ON "Product"("offeredToSubsidiaries");
