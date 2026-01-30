-- Migration: Add Batches Master Table and FEFO Support
-- Run after schema.sql

BEGIN;

-- ================
-- Batches Master Table
-- ================
CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  batch_no VARCHAR(100) NOT NULL,
  expiry_date DATE NOT NULL,
  manufactured_date DATE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  grn_id uuid REFERENCES grns(id) ON DELETE SET NULL,
  notes TEXT,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, item_id, batch_no)
);

CREATE INDEX IF NOT EXISTS idx_batches_tenant ON batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batches_item ON batches(tenant_id, item_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(tenant_id, expiry_date);

CREATE TRIGGER trg_batches_updated
BEFORE UPDATE ON batches
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================
-- Add expiry_date to stock_snapshot
-- ================
ALTER TABLE stock_snapshot
ADD COLUMN IF NOT EXISTS expiry_date DATE;

ALTER TABLE stock_snapshot
ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;

-- Add created_at for FEFO ordering (if missing)
ALTER TABLE stock_snapshot
ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Index for FEFO ordering
CREATE INDEX IF NOT EXISTS idx_snapshot_fefo
ON stock_snapshot(tenant_id, item_id, expiry_date ASC NULLS LAST, created_at ASC);

-- ================
-- Add batch_id to related tables
-- ================
ALTER TABLE grn_lines
ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;

ALTER TABLE pick_tasks
ADD COLUMN IF NOT EXISTS expiry_date DATE;

ALTER TABLE stock_reservations
ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES batches(id) ON DELETE SET NULL;

ALTER TABLE stock_reservations
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- ================
-- Items: Add batch tracking flag
-- ================
ALTER TABLE items
ADD COLUMN IF NOT EXISTS requires_batch_tracking boolean NOT NULL DEFAULT false;

ALTER TABLE items
ADD COLUMN IF NOT EXISTS default_shelf_life_days integer;

-- ================
-- Expiry Alerts View
-- ================
CREATE OR REPLACE VIEW v_expiring_stock AS
SELECT
  ss.tenant_id,
  ss.bin_id,
  b.code as bin_code,
  ss.item_id,
  i.sku as item_sku,
  i.description as item_description,
  ss.batch_no,
  ss.expiry_date,
  ss.qty_on_hand,
  ss.qty_available,
  CASE
    WHEN ss.expiry_date <= CURRENT_DATE THEN 'EXPIRED'
    WHEN ss.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'CRITICAL'
    WHEN ss.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'WARNING'
    ELSE 'OK'
  END as expiry_status,
  ss.expiry_date - CURRENT_DATE as days_until_expiry
FROM stock_snapshot ss
JOIN items i ON i.id = ss.item_id
JOIN bins b ON b.id = ss.bin_id
WHERE ss.expiry_date IS NOT NULL
  AND ss.qty_on_hand > 0
ORDER BY ss.expiry_date ASC;

COMMIT;
