-- Core import shipment scheduling (native rebuild, v1 slice)
-- Named import_shipments (not shipments) to avoid colliding with the
-- existing outbound fulfilment/dispatch `shipments` table.
CREATE TABLE IF NOT EXISTS import_shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  reference text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  transport_mode text NOT NULL DEFAULT 'SEA',   -- AIR, SEA, ROAD
  carrier text,
  vessel_or_awb text,
  destination_port text,
  eta_date date,
  status text NOT NULL DEFAULT 'PLANNED',        -- PLANNED, IN_TRANSIT, ARRIVED, DELAYED, CANCELLED
  quantity numeric,
  cbm numeric,
  pallet_qty numeric,
  incoterm text,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, reference)
);

-- Guarded rather than plain CREATE INDEX IF NOT EXISTS: on a database bootstrapped
-- from the current schema.sql (which already reflects migration 029's move of
-- status/eta_date onto import_shipment_lines), this table never has these
-- columns, so an unconditional CREATE INDEX here would fail replaying from
-- scratch even though the index name doesn't exist yet.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_shipments' AND column_name = 'status'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_import_shipments_status ON import_shipments(tenant_id, status);
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'import_shipments' AND column_name = 'eta_date'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_import_shipments_eta ON import_shipments(tenant_id, eta_date);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_import_shipments_updated ON import_shipments;
CREATE TRIGGER trg_import_shipments_updated
BEFORE UPDATE ON import_shipments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
