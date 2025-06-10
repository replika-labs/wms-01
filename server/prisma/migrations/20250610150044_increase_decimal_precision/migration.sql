-- AlterTable
ALTER TABLE "material_movements" ALTER COLUMN "costPerUnit" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "totalCost" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "material_purchase_alerts" ALTER COLUMN "estimatedCost" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "order_products" ALTER COLUMN "unitPrice" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "totalPrice" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "product_variations" ALTER COLUMN "priceAdjustment" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "price" SET DATA TYPE DECIMAL(15,2);

-- AlterTable
ALTER TABLE "purchase_logs" ALTER COLUMN "pricePerUnit" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "totalCost" SET DATA TYPE DECIMAL(15,2);
