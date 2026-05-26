-- CreateEnum
CREATE TYPE "BudgetLineNature" AS ENUM ('FIXED', 'VARIABLE');

-- CreateEnum
CREATE TYPE "BudgetSupplementStatus" AS ENUM ('PENDING_FINANCE', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BudgetLineCategory" ADD VALUE 'ELECTRICITE';
ALTER TYPE "BudgetLineCategory" ADD VALUE 'EAU';
ALTER TYPE "BudgetLineCategory" ADD VALUE 'INTERNET';
ALTER TYPE "BudgetLineCategory" ADD VALUE 'ASSURANCE';
ALTER TYPE "BudgetLineCategory" ADD VALUE 'STOCK';
ALTER TYPE "BudgetLineCategory" ADD VALUE 'MAINTENANCE';
ALTER TYPE "BudgetLineCategory" ADD VALUE 'MATERIEL';
ALTER TYPE "BudgetLineCategory" ADD VALUE 'TRANSPORT';
ALTER TYPE "BudgetLineCategory" ADD VALUE 'AUTRE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BudgetStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "BudgetStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "Budget" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedByUserId" TEXT,
ADD COLUMN     "financeNote" TEXT,
ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedByUserId" TEXT,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "submittedAt" TIMESTAMP(3),
ADD COLUMN     "submittedByUserId" TEXT;

-- AlterTable
ALTER TABLE "BudgetLine" ADD COLUMN     "nature" "BudgetLineNature" NOT NULL DEFAULT 'FIXED';

-- CreateTable
CREATE TABLE "BudgetSupplementRequest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetId" TEXT NOT NULL,
    "amountRequested" DECIMAL(65,30) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "BudgetSupplementStatus" NOT NULL DEFAULT 'PENDING_FINANCE',
    "financeNote" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decidedByUserId" TEXT,
    "rejectionReason" TEXT,

    CONSTRAINT "BudgetSupplementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetSupplementRequest_budgetId_idx" ON "BudgetSupplementRequest"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetSupplementRequest_status_idx" ON "BudgetSupplementRequest"("status");

-- CreateIndex
CREATE INDEX "Budget_status_idx" ON "Budget"("status");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_rejectedByUserId_fkey" FOREIGN KEY ("rejectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSupplementRequest" ADD CONSTRAINT "BudgetSupplementRequest_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSupplementRequest" ADD CONSTRAINT "BudgetSupplementRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSupplementRequest" ADD CONSTRAINT "BudgetSupplementRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetSupplementRequest" ADD CONSTRAINT "BudgetSupplementRequest_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
