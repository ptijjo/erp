-- CreateTable
CREATE TABLE "Pole" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pole_code_key" ON "Pole"("code");

-- AlterTable
ALTER TABLE "Role" ADD COLUMN "poleId" TEXT;

-- CreateIndex
CREATE INDEX "Role_poleId_idx" ON "Role"("poleId");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_poleId_fkey" FOREIGN KEY ("poleId") REFERENCES "Pole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
