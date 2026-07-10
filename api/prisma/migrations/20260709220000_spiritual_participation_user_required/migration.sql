-- Backfill userId depuis la fiche employé liée
UPDATE "SpiritualEventParticipation" AS p
SET "userId" = e."userId"
FROM "Employee" AS e
WHERE p."employeeId" = e.id
  AND p."userId" IS NULL
  AND e."userId" IS NOT NULL;

-- Supprimer les participations orphelines (aucun compte utilisateur)
DELETE FROM "SpiritualEventParticipation" WHERE "userId" IS NULL;

-- DropIndex
DROP INDEX IF EXISTS "SpiritualEventParticipation_eventId_employeeId_key";

-- AlterTable
ALTER TABLE "SpiritualEventParticipation" DROP CONSTRAINT IF EXISTS "SpiritualEventParticipation_employeeId_fkey";
ALTER TABLE "SpiritualEventParticipation" ALTER COLUMN "employeeId" DROP NOT NULL;
ALTER TABLE "SpiritualEventParticipation" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "SpiritualEventParticipation" ADD CONSTRAINT "SpiritualEventParticipation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SpiritualEventParticipation" DROP CONSTRAINT IF EXISTS "SpiritualEventParticipation_userId_fkey";
ALTER TABLE "SpiritualEventParticipation" ADD CONSTRAINT "SpiritualEventParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX "SpiritualEventParticipation_eventId_userId_key" ON "SpiritualEventParticipation"("eventId", "userId");
CREATE INDEX "SpiritualEventParticipation_employeeId_idx" ON "SpiritualEventParticipation"("employeeId");
