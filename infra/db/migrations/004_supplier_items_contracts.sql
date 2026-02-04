-- Migration: Supplier Items and Volume Contracts
-- Links items to suppliers with pricing, adds volume contracts

BEGIN;

-- Supplier Items (Products & Services)
CREATE TABLE IF NOT EXISTS supplier_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  supplier_sku text,  -- Supplier's own SKU/part number
  unit_cost numeric(12,2),
  lead_time_days integer,
  min_order_qty integer DEFAULT 1,
  is_preferred boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, supplier_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_supplier_items_supplier ON supplier_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_items_item ON supplier_items(item_id);

DROP TRIGGER IF EXISTS trg_supplier_items_updated ON supplier_items;
CREATE TRIGGER trg_supplier_items_updated
BEFORE UPDATE ON supplier_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Volume Contracts
CREATE TABLE IF NOT EXISTS supplier_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  contract_no text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',  -- DRAFT, ACTIVE, EXPIRED, CANCELLED
  start_date date NOT NULL,
  end_date date NOT NULL,
  terms text,
  total_value numeric(14,2),
  currency text DEFAULT 'ZAR',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, contract_no)
);

CREATE INDEX IF NOT EXISTS idx_supplier_contracts_supplier ON supplier_contracts(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_contracts_status ON supplier_contracts(tenant_id, status);

DROP TRIGGER IF EXISTS trg_supplier_contracts_updated ON supplier_contracts;
CREATE TRIGGER trg_supplier_contracts_updated
BEFORE UPDATE ON supplier_contracts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Contract Line Items (pricing tiers)
CREATE TABLE IF NOT EXISTS supplier_contract_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES supplier_contracts(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  unit_price numeric(12,2) NOT NULL,
  min_qty integer DEFAULT 1,
  max_qty integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplier_contract_lines_contract ON supplier_contract_lines(contract_id);

DROP TRIGGER IF EXISTS trg_supplier_contract_lines_updated ON supplier_contract_lines;
CREATE TRIGGER trg_supplier_contract_lines_updated
BEFORE UPDATE ON supplier_contract_lines
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  po_no text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'DRAFT',  -- DRAFT, SENT, CONFIRMED, PARTIAL, RECEIVED, CANCELLED
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

CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(tenant_id, status);

DROP TRIGGER IF EXISTS trg_purchase_orders_updated ON purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated
BEFORE UPDATE ON purchase_orders
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Purchase Order Lines
CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_no integer NOT NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  description text,
  qty_ordered integer NOT NULL,
  qty_received integer NOT NULL DEFAULT 0,
  unit_cost numeric(12,2) NOT NULL,
  line_total numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (purchase_order_id, line_no)
);

CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po ON purchase_order_lines(purchase_order_id);

DROP TRIGGER IF EXISTS trg_purchase_order_lines_updated ON purchase_order_lines;
CREATE TRIGGER trg_purchase_order_lines_updated
BEFORE UPDATE ON purchase_order_lines
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Customer Contacts (for enhanced customer profile)
CREATE TABLE IF NOT EXISTS customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  title text,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON customer_contacts(customer_id);

DROP TRIGGER IF EXISTS trg_customer_contacts_updated ON customer_contacts;
CREATE TRIGGER trg_customer_contacts_updated
BEFORE UPDATE ON customer_contacts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Customer Notes
CREATE TABLE IF NOT EXISTS customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);

DROP TRIGGER IF EXISTS trg_customer_notes_updated ON customer_notes;
CREATE TRIGGER trg_customer_notes_updated
BEFORE UPDATE ON customer_notes
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
