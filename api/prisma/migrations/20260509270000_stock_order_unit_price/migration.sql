-- Prix unitaire figé à la commande (FCFA), aligné sur le type de Supplier.price
ALTER TABLE "StockOrder" ADD COLUMN "unitPrice" DECIMAL(65,30) NOT NULL DEFAULT 0;

UPDATE "StockOrder" AS o
SET "unitPrice" = s."price"
FROM "Supplier" AS s
WHERE o."supplierId" = s."id";
