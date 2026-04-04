-- Prisma schema uses MAIN / SUBSIDIARY; older migrations created 'main' / 'subsidiary'.
ALTER TYPE "OrganizationType" RENAME VALUE 'main' TO 'MAIN';
ALTER TYPE "OrganizationType" RENAME VALUE 'subsidiary' TO 'SUBSIDIARY';
