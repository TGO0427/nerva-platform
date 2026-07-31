-- Migration: Batch Quality Status
--
-- Batches produced by manufacturing (work_orders/production_ledger's text
-- batch_no) had no quality-hold concept at all: non_conformances weren't
-- linked to a batch, and stock_snapshot/batches carried no status. This
-- meant "stock on hold pending QC" was a pure convention -- nothing in the
-- system could actually block allocation or dispatch of unreleased output.
--
-- GRN-received (purchased) batches already get a row in the `batches`
-- master table (see 002_batches_fefo.sql), but manufactured-output batches
-- never do -- recordOutput() only ever writes stock_ledger/stock_snapshot
-- with a plain text batch_no, it doesn't call batch.repository's
-- createBatch/findOrCreateBatch. So quality status can't live on `batches`
-- alone without changing how output batches are created (a much bigger,
-- riskier change to a working code path).
--
-- Instead this tracks quality status against the (tenant, item, batch_no)
-- identity already used consistently across stock_snapshot/production_ledger,
-- in a new lightweight table. Stock with no row here is treated as
-- allowed (fail-open), so existing GRN/receiving behaviour is untouched --
-- only newly-produced batches get an explicit AWAITING_QC gate going forward.

BEGIN;

CREATE TABLE IF NOT EXISTS batch_quality_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  batch_no text NOT NULL,
  quality_status text NOT NULL DEFAULT 'AWAITING_QC'
    CHECK (quality_status IN ('AWAITING_QC', 'ON_HOLD', 'APPROVED', 'REJECTED', 'RELEASED')),
  source text NOT NULL DEFAULT 'PRODUCTION' CHECK (source IN ('PRODUCTION', 'RECEIVING')),
  set_by uuid REFERENCES users(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, item_id, batch_no)
);

CREATE INDEX IF NOT EXISTS idx_batch_quality_status_lookup
  ON batch_quality_status(tenant_id, item_id, batch_no);
CREATE INDEX IF NOT EXISTS idx_batch_quality_status_status
  ON batch_quality_status(tenant_id, quality_status);

CREATE TRIGGER trg_batch_quality_status_updated
BEFORE UPDATE ON batch_quality_status
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Backfill: every distinct (item, batch_no) combination already sitting in
-- stock today (whether from GRN receipt or historical production output)
-- is assumed fine -- mark it APPROVED so nothing existing gets blocked
-- retroactively. Only batches produced after this migration ships start
-- life as AWAITING_QC.
INSERT INTO batch_quality_status (tenant_id, item_id, batch_no, quality_status, source)
SELECT DISTINCT tenant_id, item_id, batch_no, 'APPROVED', 'RECEIVING'
FROM stock_snapshot
WHERE batch_no IS NOT NULL
ON CONFLICT (tenant_id, item_id, batch_no) DO NOTHING;

-- Let a non-conformance optionally point at the specific batch it concerns.
-- Uses batch_no (nullable text) rather than a batches.id FK, since
-- manufactured-output batches don't have a `batches` row (see above) --
-- batch_no is the one identity that works for both GRN and production batches.
ALTER TABLE non_conformances ADD COLUMN IF NOT EXISTS batch_no text;
CREATE INDEX IF NOT EXISTS idx_non_conformances_batch
  ON non_conformances(tenant_id, item_id, batch_no);

COMMIT;
