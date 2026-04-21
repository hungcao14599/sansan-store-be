CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "order_items" AS oi
SET
  "unit" = COALESCE(p."unit", oi."unit"),
  "taxCategory" = p."taxCategory",
  "taxRate" = p."taxRate",
  "lineSubtotal" = CASE
    WHEN oi."lineSubtotal" = 0 THEN oi."lineTotal"
    ELSE oi."lineSubtotal"
  END,
  "taxableAmount" = CASE
    WHEN oi."taxableAmount" = 0 THEN oi."lineTotal"
    ELSE oi."taxableAmount"
  END
FROM "products" AS p
WHERE p."id" = oi."productId";

UPDATE "orders"
SET "taxableTotal" = GREATEST("subtotal" - "discount", 0)
WHERE "taxableTotal" = 0;

INSERT INTO "payment_transactions" (
  "id",
  "orderId",
  "type",
  "method",
  "amount",
  "receivedAmount",
  "changeAmount",
  "note",
  "processedById",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  o."id",
  'COLLECTION'::"PaymentTransactionType",
  'CASH'::"PaymentMethod",
  o."total",
  o."total",
  0,
  'Backfilled collection record for existing paid order',
  o."createdById",
  COALESCE(o."paidAt", o."createdAt"),
  COALESCE(o."paidAt", o."createdAt")
FROM "orders" AS o
WHERE o."status" = 'PAID'
  AND NOT EXISTS (
    SELECT 1
    FROM "payment_transactions" AS pt
    WHERE pt."orderId" = o."id"
      AND pt."type" = 'COLLECTION'
  );

CREATE UNIQUE INDEX IF NOT EXISTS "revenue_logs_orderId_sale_unique"
ON "revenue_logs" ("orderId")
WHERE "type" = 'SALE';

CREATE OR REPLACE FUNCTION prevent_append_only_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only. Insert a new record instead.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_block_update ON "audit_logs";
CREATE TRIGGER audit_logs_block_update
BEFORE UPDATE ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION prevent_append_only_mutation();

DROP TRIGGER IF EXISTS audit_logs_block_delete ON "audit_logs";
CREATE TRIGGER audit_logs_block_delete
BEFORE DELETE ON "audit_logs"
FOR EACH ROW
EXECUTE FUNCTION prevent_append_only_mutation();

DROP TRIGGER IF EXISTS inventory_logs_block_update ON "inventory_logs";
CREATE TRIGGER inventory_logs_block_update
BEFORE UPDATE ON "inventory_logs"
FOR EACH ROW
EXECUTE FUNCTION prevent_append_only_mutation();

DROP TRIGGER IF EXISTS inventory_logs_block_delete ON "inventory_logs";
CREATE TRIGGER inventory_logs_block_delete
BEFORE DELETE ON "inventory_logs"
FOR EACH ROW
EXECUTE FUNCTION prevent_append_only_mutation();

DROP TRIGGER IF EXISTS payment_transactions_block_update ON "payment_transactions";
CREATE TRIGGER payment_transactions_block_update
BEFORE UPDATE ON "payment_transactions"
FOR EACH ROW
EXECUTE FUNCTION prevent_append_only_mutation();

DROP TRIGGER IF EXISTS payment_transactions_block_delete ON "payment_transactions";
CREATE TRIGGER payment_transactions_block_delete
BEFORE DELETE ON "payment_transactions"
FOR EACH ROW
EXECUTE FUNCTION prevent_append_only_mutation();
