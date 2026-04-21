CREATE OR REPLACE FUNCTION prevent_revenue_logs_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'revenue_logs is immutable. Insert an adjustment row instead.';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_orders_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'orders cannot be deleted. Update status to CANCELLED instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER revenue_logs_block_update
BEFORE UPDATE ON "revenue_logs"
FOR EACH ROW
EXECUTE FUNCTION prevent_revenue_logs_mutation();

CREATE TRIGGER revenue_logs_block_delete
BEFORE DELETE ON "revenue_logs"
FOR EACH ROW
EXECUTE FUNCTION prevent_revenue_logs_mutation();

CREATE TRIGGER orders_block_delete
BEFORE DELETE ON "orders"
FOR EACH ROW
EXECUTE FUNCTION prevent_orders_delete();
