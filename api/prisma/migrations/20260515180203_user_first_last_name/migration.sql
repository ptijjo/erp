/*
  Warnings:

  - You are about to drop the `Absence` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BulletinPaie` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BulletinPaieLigne` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Contrat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlanningShift` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Pointage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SessionCaisse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Vente` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VenteLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VentePaiement` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `firstName` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Absence" DROP CONSTRAINT "Absence_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Absence" DROP CONSTRAINT "Absence_userId_fkey";

-- DropForeignKey
ALTER TABLE "BulletinPaie" DROP CONSTRAINT "BulletinPaie_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "BulletinPaie" DROP CONSTRAINT "BulletinPaie_userId_fkey";

-- DropForeignKey
ALTER TABLE "BulletinPaieLigne" DROP CONSTRAINT "BulletinPaieLigne_bulletinId_fkey";

-- DropForeignKey
ALTER TABLE "Contrat" DROP CONSTRAINT "Contrat_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Contrat" DROP CONSTRAINT "Contrat_userId_fkey";

-- DropForeignKey
ALTER TABLE "PlanningShift" DROP CONSTRAINT "PlanningShift_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "PlanningShift" DROP CONSTRAINT "PlanningShift_userId_fkey";

-- DropForeignKey
ALTER TABLE "Pointage" DROP CONSTRAINT "Pointage_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Pointage" DROP CONSTRAINT "Pointage_planningShiftId_fkey";

-- DropForeignKey
ALTER TABLE "Pointage" DROP CONSTRAINT "Pointage_userId_fkey";

-- DropForeignKey
ALTER TABLE "Pointage" DROP CONSTRAINT "Pointage_validatedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "SessionCaisse" DROP CONSTRAINT "SessionCaisse_closedByUserId_fkey";

-- DropForeignKey
ALTER TABLE "SessionCaisse" DROP CONSTRAINT "SessionCaisse_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "SessionCaisse" DROP CONSTRAINT "SessionCaisse_userId_fkey";

-- DropForeignKey
ALTER TABLE "Vente" DROP CONSTRAINT "Vente_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Vente" DROP CONSTRAINT "Vente_sessionCaisseId_fkey";

-- DropForeignKey
ALTER TABLE "Vente" DROP CONSTRAINT "Vente_userId_fkey";

-- DropForeignKey
ALTER TABLE "VenteLine" DROP CONSTRAINT "VenteLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "VenteLine" DROP CONSTRAINT "VenteLine_venteId_fkey";

-- DropForeignKey
ALTER TABLE "VentePaiement" DROP CONSTRAINT "VentePaiement_venteId_fkey";

-- AlterTable
ALTER TABLE "Product" ALTER COLUMN "qrCode" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;

-- DropTable
DROP TABLE "Absence";

-- DropTable
DROP TABLE "BulletinPaie";

-- DropTable
DROP TABLE "BulletinPaieLigne";

-- DropTable
DROP TABLE "Contrat";

-- DropTable
DROP TABLE "PlanningShift";

-- DropTable
DROP TABLE "Pointage";

-- DropTable
DROP TABLE "SessionCaisse";

-- DropTable
DROP TABLE "Vente";

-- DropTable
DROP TABLE "VenteLine";

-- DropTable
DROP TABLE "VentePaiement";

-- DropEnum
DROP TYPE "AbsenceStatut";

-- DropEnum
DROP TYPE "AbsenceType";

-- DropEnum
DROP TYPE "BulletinPaieLigneSens";

-- DropEnum
DROP TYPE "BulletinPaieStatut";

-- DropEnum
DROP TYPE "ContratType";

-- DropEnum
DROP TYPE "ModePaiement";

-- DropEnum
DROP TYPE "PlanningShiftType";

-- DropEnum
DROP TYPE "PointageStatut";

-- DropEnum
DROP TYPE "SessionCaisseStatut";

-- DropEnum
DROP TYPE "VenteStatut";
