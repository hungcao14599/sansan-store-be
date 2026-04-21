-- AlterTable
ALTER TABLE "products"
ADD COLUMN     "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 0;
