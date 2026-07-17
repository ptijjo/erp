-- AlterTable
ALTER TABLE "Organization" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "Organization_parentId_idx" ON "Organization"("parentId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Une seule maison mère (MAIN) active
CREATE UNIQUE INDEX "Organization_one_main_active"
ON "Organization" ("organizationType")
WHERE "organizationType" = 'MAIN' AND "deletedAt" IS NULL;

-- Rattacher les filiales existantes à la maison mère
UPDATE "Organization" AS sub
SET "parentId" = main.id
FROM "Organization" AS main
WHERE sub."organizationType" = 'SUBSIDIARY'
  AND sub."deletedAt" IS NULL
  AND main."organizationType" = 'MAIN'
  AND main."deletedAt" IS NULL
  AND sub."parentId" IS NULL;
