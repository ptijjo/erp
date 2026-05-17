-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "organizationScopeId" TEXT;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationScopeId_fkey" FOREIGN KEY ("organizationScopeId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
