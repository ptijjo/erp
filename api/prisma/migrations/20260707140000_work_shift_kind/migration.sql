-- CreateEnum
CREATE TYPE "WorkShiftKind" AS ENUM ('WORK', 'BREAK');

-- AlterTable
ALTER TABLE "WorkShift" ADD COLUMN "kind" "WorkShiftKind" NOT NULL DEFAULT 'WORK';

-- AlterTable
ALTER TABLE "RecurringWorkShift" ADD COLUMN "kind" "WorkShiftKind" NOT NULL DEFAULT 'WORK';
