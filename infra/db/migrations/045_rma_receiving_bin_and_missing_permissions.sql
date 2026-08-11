-- rma_lines never recorded which bin the returned stock was actually
-- received into, so setLineDisposition couldn't move it from there - it
-- could only add stock again at the disposition bin, double-counting
-- inventory that had already been added at receive time.
--
-- Also: the Delete RMA / Delete Credit Note endpoints require rma.delete
-- and credit.delete permissions that were never inserted into the
-- permissions table, so no role could ever be granted them.

BEGIN;

ALTER TABLE rma_lines ADD COLUMN IF NOT EXISTS receiving_bin_id uuid REFERENCES bins(id) ON DELETE SET NULL;

INSERT INTO permissions (code, description) VALUES
  ('rma.delete', 'Delete open RMAs'),
  ('credit.delete', 'Delete draft credit notes')
ON CONFLICT (code) DO NOTHING;

COMMIT;
