-- Real status lifecycle for Supplier NCRs: assignee + due date so an NCR is
-- someone's job, and closed_by/closed_at (mirroring the existing
-- resolved_by/resolved_at pair) so closing has the same audit shape as
-- resolving.

BEGIN;

ALTER TABLE supplier_ncrs
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_supplier_ncrs_assignee ON supplier_ncrs(assignee_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ncrs_due_date ON supplier_ncrs(tenant_id, due_date);

COMMIT;
