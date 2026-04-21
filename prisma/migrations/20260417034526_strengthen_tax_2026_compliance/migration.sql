-- CreateEnum
CREATE TYPE "TaxCategory" AS ENUM ('NO_VAT', 'VAT_0', 'VAT_5', 'VAT_8', 'VAT_10');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'EWALLET', 'MIXED');

-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('COLLECTION', 'REFUND');

-- CreateEnum
CREATE TYPE "TaxDeclarationMethod" AS ENUM ('ACTUAL_REVENUE');

-- CreateEnum
CREATE TYPE "PurchaseReceiptStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventorySnapshotPeriod" AS ENUM ('DAY', 'MONTH', 'YEAR');

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "adjustmentForInvoiceId" UUID,
ADD COLUMN     "businessProfileId" UUID,
ADD COLUMN     "buyerName" TEXT,
ADD COLUMN     "buyerTaxCode" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "invoiceNumber" TEXT,
ADD COLUMN     "invoiceSeries" TEXT,
ADD COLUMN     "invoiceTemplateCode" TEXT,
ADD COLUMN     "issuedById" UUID,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "providerStatusMessage" TEXT,
ADD COLUMN     "replacementForInvoiceId" UUID,
ADD COLUMN     "sellerName" TEXT,
ADD COLUMN     "sellerTaxCode" TEXT,
ADD COLUMN     "signedXmlUrl" TEXT,
ADD COLUMN     "taxAuthorityCode" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "lineSubtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxCategory" "TaxCategory" NOT NULL DEFAULT 'NO_VAT',
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "taxableAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "unit" TEXT NOT NULL DEFAULT 'item';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "taxableTotal" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "taxCategory" "TaxCategory" NOT NULL DEFAULT 'NO_VAT',
ADD COLUMN     "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "storeName" TEXT NOT NULL,
    "taxCode" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "ownerName" TEXT,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "taxDeclarationMethod" "TaxDeclarationMethod" NOT NULL DEFAULT 'ACTUAL_REVENUE',
    "invoiceSeries" TEXT,
    "invoiceTemplateCode" TEXT,
    "defaultInvoiceProvider" "InvoiceProvider" NOT NULL DEFAULT 'MISA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "type" "PaymentTransactionType" NOT NULL DEFAULT 'COLLECTION',
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "amount" DECIMAL(18,2) NOT NULL,
    "receivedAmount" DECIMAL(18,2),
    "changeAmount" DECIMAL(18,2),
    "externalReference" TEXT,
    "note" TEXT,
    "processedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipts" (
    "id" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "businessProfileId" UUID,
    "supplierName" TEXT NOT NULL,
    "supplierTaxCode" TEXT,
    "status" "PurchaseReceiptStatus" NOT NULL DEFAULT 'CONFIRMED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipt_items" (
    "id" UUID NOT NULL,
    "purchaseReceiptId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'item',
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(18,2) NOT NULL,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_snapshots" (
    "id" UUID NOT NULL,
    "businessProfileId" UUID,
    "periodType" "InventorySnapshotPeriod" NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "totalQuantity" INTEGER NOT NULL,
    "totalCostValue" DECIMAL(18,2) NOT NULL,
    "totalRetailValue" DECIMAL(18,2) NOT NULL,
    "snapshotPayload" JSONB,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_taxCode_key" ON "business_profiles"("taxCode");

-- CreateIndex
CREATE INDEX "business_profiles_storeName_idx" ON "business_profiles"("storeName");

-- CreateIndex
CREATE INDEX "business_profiles_createdAt_idx" ON "business_profiles"("createdAt");

-- CreateIndex
CREATE INDEX "payment_transactions_orderId_type_createdAt_idx" ON "payment_transactions"("orderId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "payment_transactions_method_createdAt_idx" ON "payment_transactions"("method", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_receiptNumber_key" ON "purchase_receipts"("receiptNumber");

-- CreateIndex
CREATE INDEX "purchase_receipts_supplierName_receivedAt_idx" ON "purchase_receipts"("supplierName", "receivedAt");

-- CreateIndex
CREATE INDEX "purchase_receipts_businessProfileId_receivedAt_idx" ON "purchase_receipts"("businessProfileId", "receivedAt");

-- CreateIndex
CREATE INDEX "purchase_receipt_items_purchaseReceiptId_idx" ON "purchase_receipt_items"("purchaseReceiptId");

-- CreateIndex
CREATE INDEX "purchase_receipt_items_productId_idx" ON "purchase_receipt_items"("productId");

-- CreateIndex
CREATE INDEX "inventory_snapshots_snapshotDate_idx" ON "inventory_snapshots"("snapshotDate");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_snapshots_businessProfileId_periodType_snapshotDa_key" ON "inventory_snapshots"("businessProfileId", "periodType", "snapshotDate");

-- CreateIndex
CREATE INDEX "invoices_businessProfileId_createdAt_idx" ON "invoices"("businessProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "invoices_externalReference_idx" ON "invoices"("externalReference");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_issuedAt_idx" ON "invoices"("issuedAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_productId_idx" ON "order_items"("orderId", "productId");

-- CreateIndex
CREATE INDEX "products_taxCategory_isActive_idx" ON "products"("taxCategory", "isActive");

-- CreateIndex
CREATE INDEX "revenue_logs_createdAt_idx" ON "revenue_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_adjustmentForInvoiceId_fkey" FOREIGN KEY ("adjustmentForInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_replacementForInvoiceId_fkey" FOREIGN KEY ("replacementForInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchaseReceiptId_fkey" FOREIGN KEY ("purchaseReceiptId") REFERENCES "purchase_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_snapshots" ADD CONSTRAINT "inventory_snapshots_businessProfileId_fkey" FOREIGN KEY ("businessProfileId") REFERENCES "business_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
