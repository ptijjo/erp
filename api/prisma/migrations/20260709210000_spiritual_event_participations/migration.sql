-- CreateEnum
CREATE TYPE "SpiritualEventParticipationResponse" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SPIRITUAL_EVENT_INVITATION';

-- AlterTable
ALTER TABLE "SpiritualEvent" ADD COLUMN "publishedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SpiritualEventParticipation" (
    "id" TEXT NOT NULL,
    "response" "SpiritualEventParticipationResponse" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "SpiritualEventParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpiritualEvent_publishedAt_idx" ON "SpiritualEvent"("publishedAt");

-- CreateIndex
CREATE INDEX "SpiritualEventParticipation_eventId_idx" ON "SpiritualEventParticipation"("eventId");

-- CreateIndex
CREATE INDEX "SpiritualEventParticipation_userId_idx" ON "SpiritualEventParticipation"("userId");

-- CreateIndex
CREATE INDEX "SpiritualEventParticipation_response_idx" ON "SpiritualEventParticipation"("response");

-- CreateIndex
CREATE UNIQUE INDEX "SpiritualEventParticipation_eventId_employeeId_key" ON "SpiritualEventParticipation"("eventId", "employeeId");

-- AddForeignKey
ALTER TABLE "SpiritualEventParticipation" ADD CONSTRAINT "SpiritualEventParticipation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "SpiritualEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpiritualEventParticipation" ADD CONSTRAINT "SpiritualEventParticipation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpiritualEventParticipation" ADD CONSTRAINT "SpiritualEventParticipation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
