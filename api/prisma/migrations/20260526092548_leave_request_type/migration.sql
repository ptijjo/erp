-- CreateEnum
CREATE TYPE "LeaveType" AS ENUM ('PAID_LEAVE', 'RTT', 'SICK_LEAVE', 'UNPAID_LEAVE');

-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "type" "LeaveType" NOT NULL DEFAULT 'PAID_LEAVE';
