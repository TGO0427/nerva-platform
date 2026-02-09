-- Migration: Manufacturing + BOM/Routing Module
-- Adds workstations, BOMs, routings, work orders, and production ledger

BEGIN;

-- =================
-- Workstations
-- =================
CREATE TABLE IF NOT EXISTS workstations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  workstation_type text NOT NULL, -- MACHINE, ASSEMBLY, PACKAGING, QC
  capacity_per_hour numeric(10,2),
  cost_per_hour numeric(10,2),
  status text NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, MAINTENANCE, INACTIVE
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_workstations_tenant ON workstations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workstations_site ON workstations(site_id);

CREATE TRIGGER trg_workstations_updated
BEFORE UPDATE ON workstations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =================
-- BOM Headers (with versioning)
-- =================
CREATE TABLE IF NOT EXISTS bom_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  version int NOT NULL DEFAULT 1,
  revision text NOT NULL DEFAULT 'A',
  status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, OBSOLETE
  effective_from date,
  effective_to date,
  base_qty numeric(12,4) NOT NULL DEFAULT 1,
  uom text NOT NULL DEFAULT 'EA',
  notes text,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, item_id, version, revision)
);

CREATE INDEX IF NOT EXISTS idx_bom_headers_tenant ON bom_headers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bom_headers_item ON bom_headers(item_id);
CREATE INDEX IF NOT EXISTS idx_bom_headers_status ON bom_headers(tenant_id, status);

CREATE TRIGGER trg_bom_headers_updated
BEFORE UPDATE ON bom_headers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =================
-- BOM Lines
-- =================
CREATE TABLE IF NOT EXISTS bom_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bom_header_id uuid NOT NULL REFERENCES bom_headers(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_per numeric(12,4) NOT NULL,
  uom text NOT NULL DEFAULT 'EA',
  scrap_pct numeric(5,2) DEFAULT 0,
  is_critical boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bom_header_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_bom_lines_header ON bom_lines(bom_header_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_item ON bom_lines(item_id);

-- =================
-- Routings
-- =================
CREATE TABLE IF NOT EXISTS routings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  version int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, APPROVED, OBSOLETE
  effective_from date,
  effective_to date,
  notes text,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, item_id, version)
);

CREATE INDEX IF NOT EXISTS idx_routings_tenant ON routings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_routings_item ON routings(item_id);
CREATE INDEX IF NOT EXISTS idx_routings_status ON routings(tenant_id, status);

CREATE TRIGGER trg_routings_updated
BEFORE UPDATE ON routings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =================
-- Routing Operations
-- =================
CREATE TABLE IF NOT EXISTS routing_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  routing_id uuid NOT NULL REFERENCES routings(id) ON DELETE CASCADE,
  operation_no int NOT NULL,
  name text NOT NULL,
  description text,
  workstation_id uuid REFERENCES workstations(id) ON DELETE SET NULL,
  setup_time_mins numeric(10,2) DEFAULT 0,
  run_time_mins numeric(10,2) NOT NULL,
  queue_time_mins numeric(10,2) DEFAULT 0,
  overlap_pct numeric(5,2) DEFAULT 0,
  is_subcontracted boolean DEFAULT false,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(routing_id, operation_no)
);

CREATE INDEX IF NOT EXISTS idx_routing_ops_routing ON routing_operations(routing_id);
CREATE INDEX IF NOT EXISTS idx_routing_ops_workstation ON routing_operations(workstation_id);

-- =================
-- Work Orders
-- =================
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  work_order_no text NOT NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  bom_header_id uuid REFERENCES bom_headers(id) ON DELETE SET NULL,
  routing_id uuid REFERENCES routings(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, RELEASED, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED
  priority int DEFAULT 50,
  qty_ordered numeric(12,4) NOT NULL,
  qty_completed numeric(12,4) DEFAULT 0,
  qty_scrapped numeric(12,4) DEFAULT 0,
  planned_start date,
  planned_end date,
  actual_start timestamptz,
  actual_end timestamptz,
  sales_order_id uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
  notes text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, work_order_no)
);

CREATE INDEX IF NOT EXISTS idx_work_orders_tenant ON work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_item ON work_orders(item_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_sales_order ON work_orders(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_planned ON work_orders(tenant_id, planned_start);

CREATE TRIGGER trg_work_orders_updated
BEFORE UPDATE ON work_orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =================
-- Work Order Operations
-- =================
CREATE TABLE IF NOT EXISTS work_order_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  routing_operation_id uuid REFERENCES routing_operations(id) ON DELETE SET NULL,
  operation_no int NOT NULL,
  name text NOT NULL,
  workstation_id uuid REFERENCES workstations(id) ON DELETE SET NULL,
  assigned_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'PENDING', -- PENDING, READY, IN_PROGRESS, COMPLETED, SKIPPED
  planned_start timestamptz,
  planned_end timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  qty_completed numeric(12,4) DEFAULT 0,
  qty_scrapped numeric(12,4) DEFAULT 0,
  setup_time_actual numeric(10,2),
  run_time_actual numeric(10,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(work_order_id, operation_no)
);

CREATE INDEX IF NOT EXISTS idx_wo_ops_work_order ON work_order_operations(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_ops_status ON work_order_operations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_wo_ops_assigned ON work_order_operations(assigned_user_id, status);

CREATE TRIGGER trg_work_order_operations_updated
BEFORE UPDATE ON work_order_operations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =================
-- Work Order Materials
-- =================
CREATE TABLE IF NOT EXISTS work_order_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  bom_line_id uuid REFERENCES bom_lines(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_required numeric(12,4) NOT NULL,
  qty_issued numeric(12,4) DEFAULT 0,
  qty_returned numeric(12,4) DEFAULT 0,
  status text DEFAULT 'PENDING', -- PENDING, PARTIAL, ISSUED, RETURNED
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wo_materials_work_order ON work_order_materials(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_materials_item ON work_order_materials(item_id);

CREATE TRIGGER trg_work_order_materials_updated
BEFORE UPDATE ON work_order_materials
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =================
-- Production Ledger (immutable audit trail)
-- =================
CREATE TABLE IF NOT EXISTS production_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE RESTRICT,
  work_order_operation_id uuid REFERENCES work_order_operations(id) ON DELETE SET NULL,
  entry_type text NOT NULL, -- MATERIAL_ISSUE, MATERIAL_RETURN, PRODUCTION_OUTPUT, SCRAP, REWORK
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  bin_id uuid REFERENCES bins(id) ON DELETE SET NULL,
  batch_no text,
  qty numeric(12,4) NOT NULL, -- Negative for issues, positive for output
  uom text NOT NULL,
  workstation_id uuid REFERENCES workstations(id) ON DELETE SET NULL,
  operator_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reference text,
  reason_code text,
  notes text,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prod_ledger_tenant ON production_ledger(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prod_ledger_wo ON production_ledger(work_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_ledger_item ON production_ledger(item_id);
CREATE INDEX IF NOT EXISTS idx_prod_ledger_date ON production_ledger(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prod_ledger_type ON production_ledger(tenant_id, entry_type);

-- =================
-- Permissions
-- =================
INSERT INTO permissions (code, description) VALUES
  -- Workstations
  ('workstation.view', 'View workstations'),
  ('workstation.create', 'Create workstations'),
  ('workstation.edit', 'Edit workstations'),
  ('workstation.delete', 'Delete workstations'),

  -- BOMs
  ('bom.view', 'View bills of materials'),
  ('bom.create', 'Create bills of materials'),
  ('bom.edit', 'Edit bills of materials'),
  ('bom.delete', 'Delete bills of materials'),
  ('bom.approve', 'Approve bills of materials'),

  -- Routings
  ('routing.view', 'View routings'),
  ('routing.create', 'Create routings'),
  ('routing.edit', 'Edit routings'),
  ('routing.delete', 'Delete routings'),
  ('routing.approve', 'Approve routings'),

  -- Work Orders
  ('work_order.view', 'View work orders'),
  ('work_order.create', 'Create work orders'),
  ('work_order.edit', 'Edit work orders'),
  ('work_order.delete', 'Delete work orders'),
  ('work_order.release', 'Release work orders to floor'),
  ('work_order.complete', 'Complete work orders'),
  ('work_order.cancel', 'Cancel work orders'),

  -- Production
  ('production.issue_material', 'Issue materials to work orders'),
  ('production.record_output', 'Record production output'),
  ('production.view_ledger', 'View production ledger')
ON CONFLICT (code) DO NOTHING;

COMMIT;
