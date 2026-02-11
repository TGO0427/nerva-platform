-- Fix purchase_orders table: add columns that were defined in migration 004
-- but never applied because the table already existed from schema.sql
-- (CREATE TABLE IF NOT EXISTS was a no-op)

ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS order_date date NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS ship_to_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tax_amount numeric(14,2) DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS total_amount numeric(14,2) DEFAULT 0;
