-- CreateEnum
CREATE TYPE "ContratType" AS ENUM ('CDI', 'CDD', 'TEMPS_PARTIEL', 'STAGE', 'FREELANCE', 'AUTRE');

-- CreateEnum
CREATE TYPE "PlanningShiftType" AS ENUM ('TRAVAIL', 'FORMATION', 'REUNION', 'AUTRE');

-- CreateEnum
CREATE TYPE "PointageStatut" AS ENUM ('EN_COURS', 'COMPLETE', 'ANNULE');

-- CreateEnum
CREATE TYPE "AbsenceType" AS ENUM ('CONGE_PAYE', 'ARRET_MALADIE', 'SANS_SOLDE', 'RTT', 'MATERNITE', 'AUTRE');

-- CreateEnum
CREATE TYPE "AbsenceStatut" AS ENUM ('DEMANDE', 'VALIDE', 'REFUSE', 'ANNULE');

-- CreateEnum
CREATE TYPE "BulletinPaieStatut" AS ENUM ('BROUILLON', 'VALIDE', 'PAYE');

-- CreateEnum
CREATE TYPE "BulletinPaieLigneSens" AS ENUM ('GAIN', 'RETENUE', 'INFORMATION');

-- CreateTable
CREATE TABLE "Contrat" (
    "id" TEXT NOT NULL,
    "type" "ContratType" NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "heuresHebdomadaires" DECIMAL(65,30),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Contrat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningShift" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "type" "PlanningShiftType" NOT NULL DEFAULT 'TRAVAIL',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "PlanningShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pointage" (
    "id" TEXT NOT NULL,
    "entreeAt" TIMESTAMP(3) NOT NULL,
    "sortieAt" TIMESTAMP(3),
    "statut" "PointageStatut" NOT NULL DEFAULT 'EN_COURS',
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planningShiftId" TEXT,
    "validatedByUserId" TEXT,

    CONSTRAINT "Pointage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Absence" (
    "id" TEXT NOT NULL,
    "type" "AbsenceType" NOT NULL,
    "debut" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "statut" "AbsenceStatut" NOT NULL DEFAULT 'DEMANDE',
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "Absence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinPaie" (
    "id" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "mois" INTEGER NOT NULL,
    "statut" "BulletinPaieStatut" NOT NULL DEFAULT 'BROUILLON',
    "brutTotal" DECIMAL(65,30),
    "netAPayer" DECIMAL(65,30),
    "chargesPatronales" DECIMAL(65,30),
    "chargesSalariales" DECIMAL(65,30),
    "donneesBrutes" JSONB,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "BulletinPaie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinPaieLigne" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "montant" DECIMAL(65,30) NOT NULL,
    "sens" "BulletinPaieLigneSens" NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bulletinId" TEXT NOT NULL,

    CONSTRAINT "BulletinPaieLigne_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contrat_userId_actif_idx" ON "Contrat"("userId", "actif");

-- CreateIndex
CREATE INDEX "Contrat_organizationId_idx" ON "Contrat"("organizationId");

-- CreateIndex
CREATE INDEX "Contrat_dateDebut_idx" ON "Contrat"("dateDebut");

-- CreateIndex
CREATE INDEX "PlanningShift_userId_startsAt_idx" ON "PlanningShift"("userId", "startsAt");

-- CreateIndex
CREATE INDEX "PlanningShift_organizationId_idx" ON "PlanningShift"("organizationId");

-- CreateIndex
CREATE INDEX "PlanningShift_startsAt_idx" ON "PlanningShift"("startsAt");

-- CreateIndex
CREATE INDEX "Pointage_userId_entreeAt_idx" ON "Pointage"("userId", "entreeAt");

-- CreateIndex
CREATE INDEX "Pointage_organizationId_idx" ON "Pointage"("organizationId");

-- CreateIndex
CREATE INDEX "Pointage_planningShiftId_idx" ON "Pointage"("planningShiftId");

-- CreateIndex
CREATE INDEX "Absence_userId_debut_idx" ON "Absence"("userId", "debut");

-- CreateIndex
CREATE INDEX "Absence_organizationId_idx" ON "Absence"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "BulletinPaie_userId_organizationId_annee_mois_key" ON "BulletinPaie"("userId", "organizationId", "annee", "mois");

-- CreateIndex
CREATE INDEX "BulletinPaie_organizationId_annee_mois_idx" ON "BulletinPaie"("organizationId", "annee", "mois");

-- CreateIndex
CREATE INDEX "BulletinPaieLigne_bulletinId_idx" ON "BulletinPaieLigne"("bulletinId");

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contrat" ADD CONSTRAINT "Contrat_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningShift" ADD CONSTRAINT "PlanningShift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningShift" ADD CONSTRAINT "PlanningShift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_planningShiftId_fkey" FOREIGN KEY ("planningShiftId") REFERENCES "PlanningShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pointage" ADD CONSTRAINT "Pointage_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Absence" ADD CONSTRAINT "Absence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinPaie" ADD CONSTRAINT "BulletinPaie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinPaie" ADD CONSTRAINT "BulletinPaie_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinPaieLigne" ADD CONSTRAINT "BulletinPaieLigne_bulletinId_fkey" FOREIGN KEY ("bulletinId") REFERENCES "BulletinPaie"("id") ON DELETE CASCADE ON UPDATE CASCADE;
