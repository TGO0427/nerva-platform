-- Migration: Enhanced Supplier Profile
-- Adds contact_person, registration_no, trading address fields to suppliers
-- Creates supplier_contacts, supplier_notes, supplier_ncrs tables

BEGIN;

-- Add new columns to suppliers table
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS contact_person text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS registration_no text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS trading_address_line1 text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS trading_address_line2 text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS trading_city text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS trading_postal_code text;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS trading_country text;

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

DROP TRIGGER IF EXISTS trg_supplier_contacts_updated ON supplier_contacts;
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

DROP TRIGGER IF EXISTS trg_supplier_notes_updated ON supplier_notes;
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

COMMIT;
