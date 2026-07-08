-- CreateEnum
CREATE TYPE "WorkShiftStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmployeeSanctionType" AS ENUM ('WARNING', 'SUSPENSION', 'LAYOFF');

-- CreateEnum
CREATE TYPE "EmployeeDepartureReason" AS ENUM ('RESIGNATION', 'DISMISSAL', 'END_OF_CONTRACT', 'RETIREMENT', 'ABANDONMENT', 'OTHER');

-- CreateTable
CREATE TABLE "WorkShift" (
    "id" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "WorkShiftStatus" NOT NULL DEFAULT 'PLANNED',
    "note" TEXT,
    "employeeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeSanction" (
    "id" TEXT NOT NULL,
    "type" "EmployeeSanctionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "note" TEXT,
    "employeeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeSanction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeDeparture" (
    "id" TEXT NOT NULL,
    "reason" "EmployeeDepartureReason" NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "employeeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeDeparture_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkShift_employeeId_idx" ON "WorkShift"("employeeId");

-- CreateIndex
CREATE INDEX "WorkShift_organizationId_idx" ON "WorkShift"("organizationId");

-- CreateIndex
CREATE INDEX "WorkShift_startAt_idx" ON "WorkShift"("startAt");

-- CreateIndex
CREATE INDEX "EmployeeSanction_employeeId_idx" ON "EmployeeSanction"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeSanction_organizationId_idx" ON "EmployeeSanction"("organizationId");

-- CreateIndex
CREATE INDEX "EmployeeSanction_type_idx" ON "EmployeeSanction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeDeparture_employeeId_key" ON "EmployeeDeparture"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeDeparture_organizationId_idx" ON "EmployeeDeparture"("organizationId");

-- AddForeignKey
ALTER TABLE "WorkShift" ADD CONSTRAINT "WorkShift_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkShift" ADD CONSTRAINT "WorkShift_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSanction" ADD CONSTRAINT "EmployeeSanction_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSanction" ADD CONSTRAINT "EmployeeSanction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeSanction" ADD CONSTRAINT "EmployeeSanction_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDeparture" ADD CONSTRAINT "EmployeeDeparture_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDeparture" ADD CONSTRAINT "EmployeeDeparture_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDeparture" ADD CONSTRAINT "EmployeeDeparture_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
