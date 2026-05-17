-- CreateTable
CREATE TABLE "OrganizationCatalogCategory" (
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "OrganizationCatalogCategory_pkey" PRIMARY KEY ("organizationId","categoryId")
);

-- CreateTable
CREATE TABLE "OrganizationCatalogProduct" (
    "organizationId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "OrganizationCatalogProduct_pkey" PRIMARY KEY ("organizationId","productId")
);

-- CreateIndex
CREATE INDEX "OrganizationCatalogCategory_categoryId_idx" ON "OrganizationCatalogCategory"("categoryId");

-- CreateIndex
CREATE INDEX "OrganizationCatalogProduct_productId_idx" ON "OrganizationCatalogProduct"("productId");

-- AddForeignKey
ALTER TABLE "OrganizationCatalogCategory" ADD CONSTRAINT "OrganizationCatalogCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationCatalogCategory" ADD CONSTRAINT "OrganizationCatalogCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationCatalogProduct" ADD CONSTRAINT "OrganizationCatalogProduct_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationCatalogProduct" ADD CONSTRAINT "OrganizationCatalogProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
