-- AlterTable
ALTER TABLE "BudgetExpense" ADD COLUMN "stockOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "BudgetExpense_stockOrderId_key" ON "BudgetExpense"("stockOrderId");

-- CreateIndex
CREATE INDEX "BudgetExpense_stockOrderId_idx" ON "BudgetExpense"("stockOrderId");

-- AddForeignKey
ALTER TABLE "BudgetExpense" ADD CONSTRAINT "BudgetExpense_stockOrderId_fkey" FOREIGN KEY ("stockOrderId") REFERENCES "StockOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
