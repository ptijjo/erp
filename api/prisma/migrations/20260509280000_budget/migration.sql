-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'APPROVED');

-- CreateEnum
CREATE TYPE "BudgetLineCategory" AS ENUM ('LOYER');

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "subsidiaryOrganizationId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Budget_subsidiaryOrganizationId_year_month_key" ON "Budget"("subsidiaryOrganizationId", "year", "month");

-- CreateIndex
CREATE INDEX "Budget_subsidiaryOrganizationId_idx" ON "Budget"("subsidiaryOrganizationId");

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_subsidiaryOrganizationId_fkey" FOREIGN KEY ("subsidiaryOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetId" TEXT NOT NULL,
    "category" "BudgetLineCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "amountPlanned" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetLine_budgetId_idx" ON "BudgetLine"("budgetId");

-- AddForeignKey
ALTER TABLE "BudgetLine" ADD CONSTRAINT "BudgetLine_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
