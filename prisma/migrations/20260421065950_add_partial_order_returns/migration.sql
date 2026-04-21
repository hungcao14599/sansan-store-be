-- CreateEnum
CREATE TYPE "OrderReturnInvoiceAction" AS ENUM ('NONE', 'REVIEW_DRAFT', 'ISSUE_ADJUSTMENT');

-- AlterEnum
ALTER TYPE "InventoryLogType" ADD VALUE 'RETURN';

-- CreateTable
CREATE TABLE "order_returns" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "reason" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxableTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "invoiceAction" "OrderReturnInvoiceAction" NOT NULL DEFAULT 'NONE',
    "invoiceNote" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_return_items" (
    "id" UUID NOT NULL,
    "orderReturnId" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'item',
    "quantity" INTEGER NOT NULL,
    "restockedQuantity" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "lineSubtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxableAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_return_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_returns_returnNumber_key" ON "order_returns"("returnNumber");

-- CreateIndex
CREATE INDEX "order_returns_orderId_createdAt_idx" ON "order_returns"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "order_returns_createdById_createdAt_idx" ON "order_returns"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "order_returns_invoiceAction_createdAt_idx" ON "order_returns"("invoiceAction", "createdAt");

-- CreateIndex
CREATE INDEX "order_return_items_orderReturnId_idx" ON "order_return_items"("orderReturnId");

-- CreateIndex
CREATE INDEX "order_return_items_orderItemId_idx" ON "order_return_items"("orderItemId");

-- CreateIndex
CREATE INDEX "order_return_items_productId_idx" ON "order_return_items"("productId");

-- CreateIndex
CREATE INDEX "order_return_items_createdAt_idx" ON "order_return_items"("createdAt");

-- AddForeignKey
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_returns" ADD CONSTRAINT "order_returns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_orderReturnId_fkey" FOREIGN KEY ("orderReturnId") REFERENCES "order_returns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_return_items" ADD CONSTRAINT "order_return_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
