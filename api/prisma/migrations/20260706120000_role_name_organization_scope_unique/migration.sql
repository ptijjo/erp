-- DropIndex
DROP INDEX IF EXISTS "Role_name_key";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Role_name_organizationScopeId_key" ON "Role"("name", "organizationScopeId") NULLS NOT DISTINCT;
