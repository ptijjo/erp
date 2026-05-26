-- CreateEnum
CREATE TYPE "VenteStatut" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'CARTE', 'MOBILE_MONEY');

-- CreateTable
CREATE TABLE "Vente" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "VenteStatut" NOT NULL DEFAULT 'DRAFT',
    "totalAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VenteLine" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "venteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "VenteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VentePaiement" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "venteId" TEXT NOT NULL,

    CONSTRAINT "VentePaiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Vente_organizationId_idx" ON "Vente"("organizationId");

-- CreateIndex
CREATE INDEX "Vente_userId_idx" ON "Vente"("userId");

-- CreateIndex
CREATE INDEX "Vente_status_idx" ON "Vente"("status");

-- CreateIndex
CREATE INDEX "Vente_createdAt_idx" ON "Vente"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VenteLine_venteId_productId_key" ON "VenteLine"("venteId", "productId");

-- CreateIndex
CREATE INDEX "VenteLine_venteId_idx" ON "VenteLine"("venteId");

-- CreateIndex
CREATE INDEX "VenteLine_productId_idx" ON "VenteLine"("productId");

-- CreateIndex
CREATE INDEX "VentePaiement_venteId_idx" ON "VentePaiement"("venteId");

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteLine" ADD CONSTRAINT "VenteLine_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VenteLine" ADD CONSTRAINT "VenteLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VentePaiement" ADD CONSTRAINT "VentePaiement_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
