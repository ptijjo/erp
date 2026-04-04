-- CreateTable
CREATE TABLE "VentePaiement" (
    "id" TEXT NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "venteId" TEXT NOT NULL,

    CONSTRAINT "VentePaiement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VentePaiement_venteId_idx" ON "VentePaiement"("venteId");

-- AddForeignKey
ALTER TABLE "VentePaiement" ADD CONSTRAINT "VentePaiement_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrer l’ancien champ unique : une ligne de paiement par vente (montant = total de la vente)
INSERT INTO "VentePaiement" ("id", "modePaiement", "amount", "createdAt", "updatedAt", "venteId")
SELECT gen_random_uuid()::text, v."modePaiement", v."totalAmount", v."createdAt", v."updatedAt", v."id"
FROM "Vente" v;

-- AlterTable
ALTER TABLE "Vente" DROP COLUMN "modePaiement";
