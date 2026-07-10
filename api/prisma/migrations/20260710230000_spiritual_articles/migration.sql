-- CreateEnum
CREATE TYPE "SpiritualArticleStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'SPIRITUAL_ARTICLE_PUBLISHED';

-- CreateTable
CREATE TABLE "SpiritualArticle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "status" "SpiritualArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,

    CONSTRAINT "SpiritualArticle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SpiritualArticle_organizationId_idx" ON "SpiritualArticle"("organizationId");
CREATE INDEX "SpiritualArticle_status_idx" ON "SpiritualArticle"("status");
CREATE INDEX "SpiritualArticle_publishedAt_idx" ON "SpiritualArticle"("publishedAt");
CREATE INDEX "SpiritualArticle_authorUserId_idx" ON "SpiritualArticle"("authorUserId");

-- AddForeignKey
ALTER TABLE "SpiritualArticle" ADD CONSTRAINT "SpiritualArticle_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SpiritualArticle" ADD CONSTRAINT "SpiritualArticle_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
