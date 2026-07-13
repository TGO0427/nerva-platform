-- Shipping Schedule: split import_shipments into header + line items.
-- Status, vessel/AWB, week, transport mode, carrier, destination port and
-- quantity move to the line level, since different products on the same
-- order/reference can travel on different vessels/weeks. Only reference,
-- supplier, incoterm and notes remain order-level (header) fields.

BEGIN;

ALTER TABLE import_shipments
  DROP COLUMN IF EXISTS transport_mode,
  DROP COLUMN IF EXISTS carrier,
  DROP COLUMN IF EXISTS vessel_or_awb,
  DROP COLUMN IF EXISTS destination_port,
  DROP COLUMN IF EXISTS eta_date,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS quantity,
  DROP COLUMN IF EXISTS cbm,
  DROP COLUMN IF EXISTS pallet_qty;

DROP INDEX IF EXISTS idx_import_shipments_status;
DROP INDEX IF EXISTS idx_import_shipments_eta;

CREATE TABLE IF NOT EXISTS import_shipment_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  import_shipment_id uuid NOT NULL REFERENCES import_shipments(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  product_description text NOT NULL,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  quantity numeric,
  cbm numeric,
  pallet_qty numeric,
  transport_mode text NOT NULL DEFAULT 'SEA',    -- AIR, SEA, ROAD
  carrier text,                                   -- forwarding agent / shipping line
  vessel_or_awb text,
  destination_port text,                          -- final POD
  status text NOT NULL DEFAULT 'PLANNED_SEAFREIGHT',
    -- PLANNED_AIRFREIGHT, PLANNED_SEAFREIGHT, IN_TRANSIT_AIRFREIGHT, AIR_CUSTOMS_CLEARANCE,
    -- IN_TRANSIT_ROADWAY, IN_TRANSIT_SEAWAY, MOORED, BERTH_WORKING, BERTH_COMPLETE, GATED_IN_PORT,
    -- ARRIVED_PTA, ARRIVED_KLM, ARRIVED_OFFSITE, DELAYED_PORT, DELAYED_CUSTOMS, DELAYED_DOCUMENTS,
    -- DELAYED_SUPPLIER, CANCELLED, UNLOADING, INSPECTION_PENDING, INSPECTING, INSPECTION_FAILED,
    -- INSPECTION_PASSED, RECEIVING, RECEIVED, STORED, ARCHIVED
  week_start_date date,
  week_end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, import_shipment_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_isl_shipment ON import_shipment_lines(import_shipment_id);
CREATE INDEX IF NOT EXISTS idx_isl_status ON import_shipment_lines(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_isl_week ON import_shipment_lines(tenant_id, week_start_date);

DROP TRIGGER IF EXISTS trg_import_shipment_lines_updated ON import_shipment_lines;
CREATE TRIGGER trg_import_shipment_lines_updated
BEFORE UPDATE ON import_shipment_lines
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- import_shipment.read/.write were referenced by the controller's
-- @RequirePermissions() since migration 028 but never actually seeded,
-- so only system.admin-bypass users could reach the feature. Fix that here.
INSERT INTO permissions (code, description) VALUES
  ('import_shipment.read', 'View shipping schedule'),
  ('import_shipment.write', 'Create and edit shipping schedule entries')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.code = 'import_shipment.read'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.code = 'import_shipment.write'
ON CONFLICT DO NOTHING;

COMMIT;
