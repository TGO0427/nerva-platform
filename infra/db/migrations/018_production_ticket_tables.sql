BEGIN;

CREATE TABLE IF NOT EXISTS work_order_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  rework_product text,
  rework_qty_kgs numeric(12,4),
  theoretical_boxes numeric(12,4),
  actual_boxes numeric(12,4),
  actual_overs numeric(12,4),
  actual_total numeric(12,4),
  diff_to_theoretical numeric(12,4),
  loader_signature text,
  operations_manager_signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(work_order_id)
);
CREATE INDEX IF NOT EXISTS idx_wo_checks_wo ON work_order_checks(work_order_id);
CREATE TRIGGER trg_work_order_checks_updated
  BEFORE UPDATE ON work_order_checks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS work_order_process (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  instructions text,
  specs_json jsonb DEFAULT '{}',
  operator text,
  pot_used text,
  time_started timestamptz,
  time_85c timestamptz,
  time_flavour_added timestamptz,
  time_completed timestamptz,
  additions text,
  reason_for_addition text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(work_order_id)
);
CREATE INDEX IF NOT EXISTS idx_wo_process_wo ON work_order_process(work_order_id);
CREATE TRIGGER trg_work_order_process_updated
  BEFORE UPDATE ON work_order_process FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO permissions (code, description) VALUES
  ('production.capture_checks', 'Capture production check sheet data'),
  ('production.capture_process', 'Capture production process data')
ON CONFLICT (code) DO NOTHING;

COMMIT;
