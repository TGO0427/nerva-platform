-- Post-arrival workflow fields for import shipment lines: inspection
-- (inspector, structured failure reason, notes, NCR link) and receiving
-- (either routed through a real GRN when the line has a linked item, or
-- simple captured fields when it doesn't).

BEGIN;

ALTER TABLE import_shipment_lines
  ADD COLUMN IF NOT EXISTS inspected_by text,
  ADD COLUMN IF NOT EXISTS inspection_reason text,
  ADD COLUMN IF NOT EXISTS inspection_notes text,
  ADD COLUMN IF NOT EXISTS inspected_at timestamptz,
  ADD COLUMN IF NOT EXISTS received_by text,
  ADD COLUMN IF NOT EXISTS received_qty numeric,
  ADD COLUMN IF NOT EXISTS receiving_bin_location text,
  ADD COLUMN IF NOT EXISTS discrepancy_notes text,
  ADD COLUMN IF NOT EXISTS received_at timestamptz,
  ADD COLUMN IF NOT EXISTS grn_id uuid REFERENCES grns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ncr_id uuid REFERENCES supplier_ncrs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_isl_grn ON import_shipment_lines(grn_id);
CREATE INDEX IF NOT EXISTS idx_isl_ncr ON import_shipment_lines(ncr_id);

COMMIT;
