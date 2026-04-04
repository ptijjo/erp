-- AlterTable
ALTER TABLE "Product" ADD COLUMN "qrCode" TEXT NOT NULL DEFAULT gen_random_uuid()::text;

-- CreateIndex
CREATE UNIQUE INDEX "Product_qrCode_key" ON "Product"("qrCode");
