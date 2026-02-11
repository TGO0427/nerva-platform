-- Nerva Phase 1 MVP Schema
-- Postgres 16+

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Helpers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================
--  Core / Tenancy
-- ================
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_tenants_updated
BEFORE UPDATE ON tenants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_sites_tenant ON sites(tenant_id);

CREATE TRIGGER trg_sites_updated
BEFORE UPDATE ON sites
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==========
--  Security
-- ==========
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

CREATE TRIGGER trg_users_updated
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);

CREATE TRIGGER trg_roles_updated
BEFORE UPDATE ON roles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,  -- e.g. inventory.adjust, dispatch.create
  description text
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

-- User-site access (optional per-site restriction)
CREATE TABLE IF NOT EXISTS user_sites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, site_id)
);

-- ==========
--  Auditing
-- ==========
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,      -- e.g. "sales_order"
  entity_id uuid,                 -- id of entity if applicable
  action text NOT NULL,           -- e.g. CREATE, UPDATE, APPROVE, POST
  before_json jsonb,
  after_json jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_time ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(tenant_id, entity_type, entity_id);

-- =================
--  Master Data
-- =================
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  email text,
  phone text,
  vat_no text,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_postal_code text,
  billing_country text,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_postal_code text,
  shipping_country text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);

CREATE TRIGGER trg_customers_updated
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  email text,
  phone text,
  vat_no text,
  contact_person text,
  registration_no text,
  -- Postal Address
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  country text,
  -- Trading Address
  trading_address_line1 text,
  trading_address_line2 text,
  trading_city text,
  trading_postal_code text,
  trading_country text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

CREATE TRIGGER trg_suppliers_updated
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Supplier Contacts
CREATE TABLE IF NOT EXISTS supplier_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  title text,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_contacts_supplier ON supplier_contacts(supplier_id);

CREATE TRIGGER trg_supplier_contacts_updated
BEFORE UPDATE ON supplier_contacts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Supplier Notes
CREATE TABLE IF NOT EXISTS supplier_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_notes_supplier ON supplier_notes(supplier_id);

CREATE TRIGGER trg_supplier_notes_updated
BEFORE UPDATE ON supplier_notes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Supplier NCRs (Non-Conformance Reports)
CREATE TABLE IF NOT EXISTS supplier_ncrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  ncr_no text NOT NULL,
  ncr_type text NOT NULL,  -- QUALITY, DELIVERY, DOCUMENTATION, OTHER
  status text NOT NULL DEFAULT 'OPEN',  -- OPEN, IN_PROGRESS, RESOLVED, CLOSED
  description text NOT NULL,
  resolution text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (tenant_id, ncr_no)
);

CREATE INDEX IF NOT EXISTS idx_supplier_ncrs_supplier ON supplier_ncrs(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_ncrs_status ON supplier_ncrs(tenant_id, status);

CREATE TABLE IF NOT EXISTS items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku text NOT NULL,
  description text NOT NULL,
  uom text NOT NULL DEFAULT 'EA',
  weight_kg numeric(18,6),
  length_cm numeric(18,6),
  width_cm numeric(18,6),
  height_cm numeric(18,6),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_items_tenant ON items(tenant_id);

CREATE TRIGGER trg_items_updated
BEFORE UPDATE ON items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS item_barcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  barcode text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_item_barcodes_item ON item_barcodes(item_id);

-- ======================
--  Warehousing (WMS)
-- ======================
CREATE TABLE IF NOT EXISTS warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_site ON warehouses(site_id);

CREATE TRIGGER trg_warehouses_updated
BEFORE UPDATE ON warehouses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  code text NOT NULL,
  bin_type text NOT NULL DEFAULT 'STORAGE',  -- STORAGE, PICKING, RECEIVING, QUARANTINE, SHIPPING, SCRAP
  aisle text,
  rack text,
  level text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, warehouse_id, code)
);

CREATE INDEX IF NOT EXISTS idx_bins_warehouse ON bins(warehouse_id);

CREATE TRIGGER trg_bins_updated
BEFORE UPDATE ON bins
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============
-- Stock Ledger (Source of Truth)
-- ============
CREATE TABLE IF NOT EXISTS stock_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  from_bin_id uuid REFERENCES bins(id) ON DELETE SET NULL,
  to_bin_id uuid REFERENCES bins(id) ON DELETE SET NULL,
  qty numeric(18,6) NOT NULL,
  uom text NOT NULL DEFAULT 'EA',
  reason text NOT NULL,     -- RECEIVE, PUTAWAY, PICK, PACK, SHIP, RETURN, ADJUST, IBT_OUT, IBT_IN, SCRAP, WO_CONSUME, WO_PRODUCE
  ref_type text,            -- grn, pick_task, shipment, rma, adjustment, ibt, work_order
  ref_id uuid,
  batch_no text,            -- Manufacturing-ready: nullable batch tracking
  expiry_date date,         -- Manufacturing-ready: nullable expiry
  serial_id uuid,           -- Manufacturing-ready: nullable serial tracking
  cost_price numeric(18,6), -- For FIFO/weighted avg costing later
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ledger_tenant_time ON stock_ledger(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_item_time ON stock_ledger(tenant_id, item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_bins ON stock_ledger(tenant_id, from_bin_id, to_bin_id);
CREATE INDEX IF NOT EXISTS idx_ledger_ref ON stock_ledger(tenant_id, ref_type, ref_id);

-- Cached stock snapshot (updated by application, not triggers - for performance)
CREATE TABLE IF NOT EXISTS stock_snapshot (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  bin_id uuid NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  batch_no text NOT NULL DEFAULT '',
  qty_on_hand numeric(18,6) NOT NULL DEFAULT 0,
  qty_reserved numeric(18,6) NOT NULL DEFAULT 0,
  qty_available numeric(18,6) GENERATED ALWAYS AS (qty_on_hand - qty_reserved) STORED,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, bin_id, item_id, batch_no)
);

CREATE INDEX IF NOT EXISTS idx_snapshot_item ON stock_snapshot(tenant_id, item_id);

-- =====================
-- GRN (Goods Received Notes)
-- =====================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_no text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, CONFIRMED, PARTIAL, RECEIVED, CANCELLED
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  expected_date date,
  ship_to_warehouse_id uuid REFERENCES warehouses(id) ON DELETE SET NULL,
  subtotal numeric(14,2) DEFAULT 0,
  tax_amount numeric(14,2) DEFAULT 0,
  total_amount numeric(14,2) DEFAULT 0,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, po_no)
);

CREATE INDEX IF NOT EXISTS idx_po_tenant_status ON purchase_orders(tenant_id, status);

CREATE TRIGGER trg_purchase_orders_updated
BEFORE UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_ordered numeric(18,6) NOT NULL,
  qty_received numeric(18,6) NOT NULL DEFAULT 0,
  unit_cost numeric(18,6),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_po_lines_po ON purchase_order_lines(purchase_order_id);

CREATE TABLE IF NOT EXISTS grns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES purchase_orders(id) ON DELETE SET NULL,
  grn_no text NOT NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, RECEIVED, PUTAWAY_PENDING, COMPLETE, CANCELLED
  received_at timestamptz,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, grn_no)
);

CREATE INDEX IF NOT EXISTS idx_grns_tenant_status ON grns(tenant_id, status);

CREATE TRIGGER trg_grns_updated
BEFORE UPDATE ON grns
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS grn_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grn_id uuid NOT NULL REFERENCES grns(id) ON DELETE CASCADE,
  purchase_order_line_id uuid REFERENCES purchase_order_lines(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_expected numeric(18,6) NOT NULL DEFAULT 0,
  qty_received numeric(18,6) NOT NULL,
  batch_no text,
  expiry_date date,
  receiving_bin_id uuid REFERENCES bins(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grn_lines_grn ON grn_lines(grn_id);

-- Putaway Tasks
CREATE TABLE IF NOT EXISTS putaway_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  grn_line_id uuid NOT NULL REFERENCES grn_lines(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  from_bin_id uuid NOT NULL REFERENCES bins(id) ON DELETE RESTRICT,
  to_bin_id uuid REFERENCES bins(id) ON DELETE SET NULL,
  qty numeric(18,6) NOT NULL,
  status text NOT NULL DEFAULT 'PENDING', -- PENDING, ASSIGNED, COMPLETE, CANCELLED
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_putaway_tasks_status ON putaway_tasks(tenant_id, status);

-- =====================
-- Cycle Counts / Adjustments
-- =====================
CREATE TABLE IF NOT EXISTS cycle_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  count_no text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, PENDING_APPROVAL, CLOSED, CANCELLED
  started_at timestamptz,
  closed_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, count_no)
);

CREATE TRIGGER trg_cycle_counts_updated
BEFORE UPDATE ON cycle_counts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS cycle_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cycle_count_id uuid NOT NULL REFERENCES cycle_counts(id) ON DELETE CASCADE,
  bin_id uuid NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  system_qty numeric(18,6) NOT NULL DEFAULT 0,
  counted_qty numeric(18,6),
  variance_qty numeric(18,6) GENERATED ALWAYS AS (COALESCE(counted_qty, 0) - system_qty) STORED,
  counted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  counted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cycle_lines_cc ON cycle_count_lines(cycle_count_id);

CREATE TABLE IF NOT EXISTS adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  adjustment_no text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, REJECTED, POSTED
  reason text NOT NULL,
  notes text,
  cycle_count_id uuid REFERENCES cycle_counts(id) ON DELETE SET NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, adjustment_no)
);

CREATE TRIGGER trg_adjustments_updated
BEFORE UPDATE ON adjustments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS adjustment_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  adjustment_id uuid NOT NULL REFERENCES adjustments(id) ON DELETE CASCADE,
  bin_id uuid NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_before numeric(18,6) NOT NULL DEFAULT 0,
  qty_after numeric(18,6) NOT NULL,
  qty_delta numeric(18,6) GENERATED ALWAYS AS (qty_after - qty_before) STORED,
  batch_no text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_adjustment_lines_adj ON adjustment_lines(adjustment_id);

-- =====================
-- IBT (Internal Branch Transfer)
-- =====================
CREATE TABLE IF NOT EXISTS ibts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ibt_no text NOT NULL,
  from_warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, PICKING, IN_TRANSIT, RECEIVED, CANCELLED
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  shipped_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, ibt_no)
);

CREATE INDEX IF NOT EXISTS idx_ibts_tenant_status ON ibts(tenant_id, status);

CREATE TRIGGER trg_ibts_updated
BEFORE UPDATE ON ibts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS ibt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ibt_id uuid NOT NULL REFERENCES ibts(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_requested numeric(18,6) NOT NULL,
  qty_shipped numeric(18,6) NOT NULL DEFAULT 0,
  qty_received numeric(18,6) NOT NULL DEFAULT 0,
  from_bin_id uuid REFERENCES bins(id) ON DELETE SET NULL,
  to_bin_id uuid REFERENCES bins(id) ON DELETE SET NULL,
  batch_no text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ibt_lines_ibt ON ibt_lines(ibt_id);

-- =========================
-- Sales Orders / Fulfilment
-- =========================
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  order_no text NOT NULL,
  external_ref text,  -- customer PO number or external system ref
  status text NOT NULL DEFAULT 'DRAFT',  -- DRAFT, CONFIRMED, ALLOCATED, PICKING, PACKING, READY_TO_SHIP, SHIPPED, DELIVERED, CANCELLED
  priority int NOT NULL DEFAULT 5,  -- 1=highest, 10=lowest
  requested_ship_date date,
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_postal_code text,
  shipping_country text,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, order_no)
);

CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant_status ON sales_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_ship_date ON sales_orders(tenant_id, requested_ship_date);

CREATE TRIGGER trg_sales_orders_updated
BEFORE UPDATE ON sales_orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS sales_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  line_no int NOT NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_ordered numeric(18,6) NOT NULL,
  qty_allocated numeric(18,6) NOT NULL DEFAULT 0,
  qty_picked numeric(18,6) NOT NULL DEFAULT 0,
  qty_packed numeric(18,6) NOT NULL DEFAULT 0,
  qty_shipped numeric(18,6) NOT NULL DEFAULT 0,
  unit_price numeric(18,6),
  discount_pct numeric(5,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, sales_order_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_so_lines_order ON sales_order_lines(sales_order_id);

-- Stock Reservations (allocation)
CREATE TABLE IF NOT EXISTS stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sales_order_line_id uuid NOT NULL REFERENCES sales_order_lines(id) ON DELETE CASCADE,
  bin_id uuid NOT NULL REFERENCES bins(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty numeric(18,6) NOT NULL,
  batch_no text,
  status text NOT NULL DEFAULT 'RESERVED', -- RESERVED, PICKED, RELEASED
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_sol ON stock_reservations(sales_order_line_id);
CREATE INDEX IF NOT EXISTS idx_reservations_bin_item ON stock_reservations(tenant_id, bin_id, item_id);

-- Pick waves/tasks
CREATE TABLE IF NOT EXISTS pick_waves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  wave_no text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, COMPLETE, CANCELLED
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, wave_no)
);

CREATE TRIGGER trg_pick_waves_updated
BEFORE UPDATE ON pick_waves
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS pick_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pick_wave_id uuid NOT NULL REFERENCES pick_waves(id) ON DELETE CASCADE,
  sales_order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  sales_order_line_id uuid NOT NULL REFERENCES sales_order_lines(id) ON DELETE CASCADE,
  reservation_id uuid REFERENCES stock_reservations(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  from_bin_id uuid NOT NULL REFERENCES bins(id) ON DELETE RESTRICT,
  qty_to_pick numeric(18,6) NOT NULL,
  qty_picked numeric(18,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, PICKED, SHORT, CANCELLED
  short_reason text,
  assigned_to uuid REFERENCES users(id) ON DELETE SET NULL,
  picked_at timestamptz,
  batch_no text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pick_tasks_wave ON pick_tasks(pick_wave_id);
CREATE INDEX IF NOT EXISTS idx_pick_tasks_assignee ON pick_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_pick_tasks_order ON pick_tasks(sales_order_id);

-- Shipments/packages
CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  sales_order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  shipment_no text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, PACKING, PACKED, READY_FOR_DISPATCH, DISPATCHED, DELIVERED, CANCELLED
  total_weight_kg numeric(18,6) DEFAULT 0,
  total_cbm numeric(18,6) DEFAULT 0,
  carrier text,
  tracking_no text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  packed_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, shipment_no)
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tenant_status ON shipments(tenant_id, status);

CREATE TRIGGER trg_shipments_updated
BEFORE UPDATE ON shipments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS shipment_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  sales_order_line_id uuid NOT NULL REFERENCES sales_order_lines(id) ON DELETE RESTRICT,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty numeric(18,6) NOT NULL,
  batch_no text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_lines_ship ON shipment_lines(shipment_id);

CREATE TABLE IF NOT EXISTS packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  package_no text NOT NULL,
  weight_kg numeric(18,6),
  length_cm numeric(18,6),
  width_cm numeric(18,6),
  height_cm numeric(18,6),
  label_ref text, -- S3/blob reference for PDF/ZPL label
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, shipment_id, package_no)
);

CREATE INDEX IF NOT EXISTS idx_packages_ship ON packages(shipment_id);

CREATE TABLE IF NOT EXISTS package_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  shipment_line_id uuid NOT NULL REFERENCES shipment_lines(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty numeric(18,6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_items_pkg ON package_items(package_id);

-- ==================
-- Dispatch / Driver
-- ==================
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  reg_no text NOT NULL,
  make text,
  model text,
  capacity_kg numeric(18,6) NOT NULL DEFAULT 0,
  capacity_cbm numeric(18,6) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, reg_no)
);

CREATE TRIGGER trg_vehicles_updated
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL, -- link to user account for app login
  name text NOT NULL,
  phone text,
  license_no text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_drivers_user ON drivers(user_id);

CREATE TRIGGER trg_drivers_updated
BEFORE UPDATE ON drivers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS dispatch_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  trip_no text NOT NULL,
  status text NOT NULL DEFAULT 'PLANNED', -- PLANNED, ASSIGNED, LOADING, IN_PROGRESS, COMPLETE, CANCELLED
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id uuid REFERENCES drivers(id) ON DELETE SET NULL,
  planned_date date,
  planned_start timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  total_weight_kg numeric(18,6) DEFAULT 0,
  total_cbm numeric(18,6) DEFAULT 0,
  total_stops int DEFAULT 0,
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, trip_no)
);

CREATE INDEX IF NOT EXISTS idx_trips_tenant_status ON dispatch_trips(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON dispatch_trips(driver_id, status);
CREATE INDEX IF NOT EXISTS idx_trips_date ON dispatch_trips(tenant_id, planned_date);

CREATE TRIGGER trg_dispatch_trips_updated
BEFORE UPDATE ON dispatch_trips
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS dispatch_stops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES dispatch_trips(id) ON DELETE CASCADE,
  sequence int NOT NULL,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  address_line1 text NOT NULL,
  address_line2 text,
  city text,
  postal_code text,
  country text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  status text NOT NULL DEFAULT 'PENDING', -- PENDING, EN_ROUTE, ARRIVED, DELIVERED, FAILED, PARTIAL, SKIPPED
  notes text,
  eta timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, trip_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_stops_trip ON dispatch_stops(trip_id);

CREATE TABLE IF NOT EXISTS manifest_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES dispatch_stops(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE RESTRICT,
  weight_kg numeric(18,6) DEFAULT 0,
  cbm numeric(18,6) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, stop_id, shipment_id)
);

CREATE INDEX IF NOT EXISTS idx_manifest_stop ON manifest_lines(stop_id);
CREATE INDEX IF NOT EXISTS idx_manifest_shipment ON manifest_lines(shipment_id);

-- POD (Proof of Delivery)
CREATE TABLE IF NOT EXISTS pods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stop_id uuid NOT NULL REFERENCES dispatch_stops(id) ON DELETE CASCADE,
  status text NOT NULL, -- DELIVERED, FAILED, PARTIAL, RETURNED
  recipient_name text,
  signature_ref text,   -- S3/blob reference
  photo_refs jsonb DEFAULT '[]'::jsonb, -- array of S3/blob references
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  notes text,
  failure_reason text,
  captured_by uuid REFERENCES users(id) ON DELETE SET NULL, -- driver user
  captured_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz  -- for offline mode tracking
);

CREATE INDEX IF NOT EXISTS idx_pods_stop ON pods(stop_id);

-- POD exceptions/returns captured at stop
CREATE TABLE IF NOT EXISTS pod_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  pod_id uuid NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE RESTRICT,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  exception_type text NOT NULL, -- DAMAGED, REFUSED, WRONG_ITEM, SHORT, OTHER
  qty numeric(18,6),
  notes text,
  photo_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pod_exceptions_pod ON pod_exceptions(pod_id);

-- ==================
-- Returns / Credits
-- ==================
CREATE TABLE IF NOT EXISTS rmas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  warehouse_id uuid NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  sales_order_id uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
  shipment_id uuid REFERENCES shipments(id) ON DELETE SET NULL,
  rma_no text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN', -- OPEN, AWAITING_RETURN, RECEIVED, INSPECTING, DISPOSITION_COMPLETE, CREDIT_PENDING, CREDIT_APPROVED, CLOSED, CANCELLED
  return_type text NOT NULL DEFAULT 'CUSTOMER', -- CUSTOMER, DELIVERY_EXCEPTION
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, rma_no)
);

CREATE INDEX IF NOT EXISTS idx_rmas_customer ON rmas(customer_id);
CREATE INDEX IF NOT EXISTS idx_rmas_status ON rmas(tenant_id, status);

CREATE TRIGGER trg_rmas_updated
BEFORE UPDATE ON rmas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS rma_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rma_id uuid NOT NULL REFERENCES rmas(id) ON DELETE CASCADE,
  sales_order_line_id uuid REFERENCES sales_order_lines(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  qty_expected numeric(18,6) NOT NULL,
  qty_received numeric(18,6) NOT NULL DEFAULT 0,
  reason_code text NOT NULL,  -- DAMAGED, DEFECTIVE, WRONG_ITEM, NOT_ORDERED, CHANGE_OF_MIND, OTHER
  disposition text NOT NULL DEFAULT 'PENDING', -- PENDING, RESTOCK, QUARANTINE, SCRAP, RETURN_TO_SUPPLIER
  disposition_bin_id uuid REFERENCES bins(id) ON DELETE SET NULL,
  inspection_notes text,
  inspected_by uuid REFERENCES users(id) ON DELETE SET NULL,
  inspected_at timestamptz,
  unit_credit_amount numeric(18,6),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rma_lines_rma ON rma_lines(rma_id);

-- Credit Note Drafts (before posting to finance)
CREATE TABLE IF NOT EXISTS credit_notes_draft (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rma_id uuid NOT NULL REFERENCES rmas(id) ON DELETE CASCADE,
  credit_no text,
  status text NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, POSTED, REJECTED
  subtotal numeric(18,6) DEFAULT 0,
  tax_amount numeric(18,6) DEFAULT 0,
  total_amount numeric(18,6) DEFAULT 0,
  currency text DEFAULT 'ZAR',
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  posted_at timestamptz,
  external_ref text,  -- reference from finance system after posting
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_rma ON credit_notes_draft(rma_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_status ON credit_notes_draft(tenant_id, status);

CREATE TRIGGER trg_credit_notes_draft_updated
BEFORE UPDATE ON credit_notes_draft
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS credit_note_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  credit_note_id uuid NOT NULL REFERENCES credit_notes_draft(id) ON DELETE CASCADE,
  rma_line_id uuid REFERENCES rma_lines(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  description text,
  qty numeric(18,6) NOT NULL,
  unit_price numeric(18,6) NOT NULL,
  tax_rate numeric(5,2) DEFAULT 0,
  line_total numeric(18,6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_note_lines_cn ON credit_note_lines(credit_note_id);

-- =================
-- Integrations
-- =================
CREATE TABLE IF NOT EXISTS integration_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type text NOT NULL, -- sage, xero, quickbooks, evolution, sap_b1, custom_api
  name text NOT NULL,
  status text NOT NULL DEFAULT 'DISCONNECTED', -- CONNECTED, DISCONNECTED, ERROR, PENDING_AUTH
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb,  -- encrypted credentials, endpoints, mappings
  last_sync_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, type, name)
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON integration_connections(tenant_id);

CREATE TRIGGER trg_integration_connections_updated
BEFORE UPDATE ON integration_connections
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS posting_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  integration_id uuid NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  doc_type text NOT NULL, -- invoice, credit_note, stock_journal, customer, supplier
  doc_id uuid NOT NULL,
  idempotency_key text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, SUCCESS, FAILED, RETRYING, CANCELLED
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  last_error text,
  external_ref text,  -- ID returned from finance system
  next_retry_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, integration_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_posting_queue_status ON posting_queue(tenant_id, status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_posting_queue_doc ON posting_queue(tenant_id, doc_type, doc_id);

CREATE TRIGGER trg_posting_queue_updated
BEFORE UPDATE ON posting_queue
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =================
-- Seed Permissions
-- =================
INSERT INTO permissions (code, description) VALUES
  -- System
  ('system.admin', 'Full system administration'),
  ('tenant.manage', 'Manage tenant settings'),
  ('site.manage', 'Manage sites'),
  ('user.manage', 'Manage users and roles'),

  -- Master Data
  ('item.read', 'View items'),
  ('item.write', 'Create/edit items'),
  ('customer.read', 'View customers'),
  ('customer.write', 'Create/edit customers'),
  ('supplier.read', 'View suppliers'),
  ('supplier.write', 'Create/edit suppliers'),

  -- Warehouse
  ('warehouse.manage', 'Manage warehouses and bins'),
  ('grn.create', 'Create goods received notes'),
  ('grn.receive', 'Receive goods'),
  ('putaway.execute', 'Execute putaway tasks'),

  -- Inventory
  ('inventory.read', 'View inventory levels'),
  ('inventory.adjust', 'Create inventory adjustments'),
  ('inventory.adjust.approve', 'Approve inventory adjustments'),
  ('ibt.create', 'Create internal transfers'),
  ('ibt.approve', 'Approve internal transfers'),
  ('cycle_count.manage', 'Manage cycle counts'),

  -- Sales
  ('sales_order.read', 'View sales orders'),
  ('sales_order.create', 'Create sales orders'),
  ('sales_order.edit', 'Edit sales orders'),
  ('sales_order.cancel', 'Cancel sales orders'),
  ('sales_order.allocate', 'Allocate stock to orders'),

  -- Fulfilment
  ('pick_wave.create', 'Create pick waves'),
  ('pick_task.execute', 'Execute pick tasks'),
  ('pack.execute', 'Execute packing'),
  ('shipment.create', 'Create shipments'),
  ('shipment.ready', 'Mark shipments ready for dispatch'),

  -- Dispatch
  ('dispatch.plan', 'Plan dispatch trips'),
  ('dispatch.assign', 'Assign drivers/vehicles'),
  ('dispatch.execute', 'Execute deliveries (driver)'),
  ('pod.capture', 'Capture proof of delivery'),

  -- Returns
  ('rma.create', 'Create return authorizations'),
  ('rma.receive', 'Receive returned goods'),
  ('rma.disposition', 'Set return dispositions'),
  ('credit.create', 'Create credit note drafts'),
  ('credit.approve', 'Approve credit notes'),

  -- Finance/Integration
  ('integration.manage', 'Manage integrations'),
  ('posting.view', 'View posting queue'),
  ('posting.retry', 'Retry failed postings'),

  -- Reporting
  ('report.operational', 'View operational reports'),
  ('report.financial', 'View financial reports'),
  ('audit.read', 'View audit logs')
ON CONFLICT (code) DO NOTHING;

COMMIT;
