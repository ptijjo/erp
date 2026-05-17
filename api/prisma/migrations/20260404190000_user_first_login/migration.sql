-- AlterTable
ALTER TABLE "User" ADD COLUMN "firstLogin" BOOLEAN NOT NULL DEFAULT true;

-- Comptes déjà présents : ne pas forcer la définition du mot de passe
UPDATE "User" SET "firstLogin" = false;
