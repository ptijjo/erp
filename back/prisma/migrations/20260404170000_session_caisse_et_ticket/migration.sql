-- CreateEnum
CREATE TYPE "SessionCaisseStatut" AS ENUM ('OUVERTE', 'CLOTUREE');

-- CreateTable
CREATE TABLE "SessionCaisse" (
    "id" TEXT NOT NULL,
    "statut" "SessionCaisseStatut" NOT NULL DEFAULT 'OUVERTE',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "fondOuverture" DECIMAL(65,30) NOT NULL,
    "fondCloture" DECIMAL(65,30),
    "commentaireCloture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "closedByUserId" TEXT,

    CONSTRAINT "SessionCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionCaisse_organizationId_idx" ON "SessionCaisse"("organizationId");

-- CreateIndex
CREATE INDEX "SessionCaisse_userId_idx" ON "SessionCaisse"("userId");

-- CreateIndex
CREATE INDEX "SessionCaisse_statut_idx" ON "SessionCaisse"("statut");

-- CreateIndex
CREATE INDEX "SessionCaisse_openedAt_idx" ON "SessionCaisse"("openedAt");

-- AddForeignKey
ALTER TABLE "SessionCaisse" ADD CONSTRAINT "SessionCaisse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCaisse" ADD CONSTRAINT "SessionCaisse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCaisse" ADD CONSTRAINT "SessionCaisse_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Vente" ADD COLUMN "sessionCaisseId" TEXT,
ADD COLUMN "numeroTicket" INTEGER,
ADD COLUMN "ticketImprimeAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Vente_sessionCaisseId_idx" ON "Vente"("sessionCaisseId");

-- CreateIndex
CREATE UNIQUE INDEX "Vente_sessionCaisseId_numeroTicket_key" ON "Vente"("sessionCaisseId", "numeroTicket");

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_sessionCaisseId_fkey" FOREIGN KEY ("sessionCaisseId") REFERENCES "SessionCaisse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
