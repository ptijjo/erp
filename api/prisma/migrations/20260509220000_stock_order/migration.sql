-- CreateEnum
CREATE TYPE "StockOrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "StockOrder" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subsidiaryOrganizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "StockOrderStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "requestedByUserId" TEXT,

    CONSTRAINT "StockOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockOrder_subsidiaryOrganizationId_idx" ON "StockOrder"("subsidiaryOrganizationId");

-- CreateIndex
CREATE INDEX "StockOrder_status_idx" ON "StockOrder"("status");

-- CreateIndex
CREATE INDEX "StockOrder_productId_idx" ON "StockOrder"("productId");

-- AddForeignKey
ALTER TABLE "StockOrder" ADD CONSTRAINT "StockOrder_subsidiaryOrganizationId_fkey" FOREIGN KEY ("subsidiaryOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOrder" ADD CONSTRAINT "StockOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockOrder" ADD CONSTRAINT "StockOrder_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
