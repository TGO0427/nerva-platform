-- Migration 014: Add invoicing tables (invoices, invoice_lines, invoice_payments)
-- Proper invoicing module with sequential invoice numbers, payment tracking, and due dates

-- =================
-- Invoices
-- =================
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  sales_order_id uuid REFERENCES sales_orders(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  invoice_no text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',  -- DRAFT, SENT, PAID, PARTIALLY_PAID, OVERDUE, CANCELLED, VOID
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  payment_terms text,
  subtotal numeric(18,2) DEFAULT 0,
  tax_amount numeric(18,2) DEFAULT 0,
  total_amount numeric(18,2) DEFAULT 0,
  amount_paid numeric(18,2) DEFAULT 0,
  currency text DEFAULT 'ZAR',
  notes text,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_no)
);

CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_sales_order ON invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(tenant_id, due_date);

CREATE TRIGGER trg_invoices_updated
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  sales_order_line_id uuid REFERENCES sales_order_lines(id) ON DELETE SET NULL,
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE RESTRICT,
  description text,
  qty numeric(18,6) NOT NULL,
  unit_price numeric(18,6) NOT NULL,
  discount_pct numeric(5,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 15,
  line_total numeric(18,6) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON invoice_lines(invoice_id);

-- =================
-- Invoice Payments
-- =================
CREATE TABLE IF NOT EXISTS invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric(18,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text,
  reference text,
  notes text,
  recorded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

-- =================
-- Permissions
-- =================
INSERT INTO permissions (id, code, description) VALUES
  (gen_random_uuid(), 'invoice.read', 'View invoices and payment history'),
  (gen_random_uuid(), 'invoice.create', 'Create, send, and manage invoices')
ON CONFLICT (code) DO NOTHING;
