CREATE TABLE "product_groups" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_groups_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "products" ADD COLUMN "productGroupId" UUID;

CREATE UNIQUE INDEX "product_groups_name_key" ON "product_groups"("name");
CREATE INDEX "product_groups_name_idx" ON "product_groups"("name");
CREATE INDEX "product_groups_isActive_idx" ON "product_groups"("isActive");
CREATE INDEX "products_productGroupId_idx" ON "products"("productGroupId");

ALTER TABLE "products" ADD CONSTRAINT "products_productGroupId_fkey" FOREIGN KEY ("productGroupId") REFERENCES "product_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
