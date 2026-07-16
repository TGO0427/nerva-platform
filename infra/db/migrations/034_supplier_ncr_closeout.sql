-- Proper close-out for Supplier NCRs: a disposition outcome, root cause, and
-- corrective/preventive action, separate from the free-text "resolution"
-- (which now serves as the overall conclusion narrative).

BEGIN;

ALTER TABLE supplier_ncrs
  ADD COLUMN IF NOT EXISTS outcome text,  -- ACCEPTED, REJECTED, ACCEPTED_WITH_CONCESSION
  ADD COLUMN IF NOT EXISTS root_cause text,
  ADD COLUMN IF NOT EXISTS corrective_action text;

COMMIT;
