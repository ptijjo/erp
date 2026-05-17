-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'CARTE');

-- AlterTable
ALTER TABLE "Vente" ADD COLUMN "modePaiement" "ModePaiement" NOT NULL DEFAULT 'ESPECES';
