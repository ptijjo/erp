-- One role per user: FK on User, remove UserRole join table.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- Migrate from existing UserRole rows (one role per user kept: first by id)
UPDATE "User" u
SET "roleId" = (
  SELECT ur."roleId" FROM "UserRole" ur WHERE ur."userId" = u."id" ORDER BY ur."id" ASC LIMIT 1
)
WHERE EXISTS (SELECT 1 FROM "UserRole" ur WHERE ur."userId" = u."id");

-- Users without any UserRole: assign oldest role (requires at least one Role)
UPDATE "User"
SET "roleId" = (SELECT "id" FROM "Role" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "roleId" IS NULL;

ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

-- DropTable
DROP TABLE "UserRole";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
