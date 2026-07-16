-- Manufacturing non-conformances: root cause, assignee, due date, and a
-- closed_by/closed_at audit pair (mirroring the Supplier NCR workflow
-- columns added in 033/034), so this feature matches Supplier NCR depth.

BEGIN;

ALTER TABLE non_conformances
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS closed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_non_conformances_assignee ON non_conformances(assignee_id);
CREATE INDEX IF NOT EXISTS idx_non_conformances_due_date ON non_conformances(tenant_id, due_date);

COMMIT;
