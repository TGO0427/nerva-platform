-- Migration 015: Portal & Driver App support
-- Adds user_type + customer_id to users, documents table, portal/driver permissions

BEGIN;

-- Users table: add user_type + customer_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type text NOT NULL DEFAULT 'internal';
ALTER TABLE users ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_customer ON users(customer_id);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(tenant_id, user_type);

-- Documents table (S3 file metadata)
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type text NOT NULL,    -- 'pod', 'invoice', 'rma', 'signature', 'photo'
  entity_id uuid,
  file_name text NOT NULL,
  file_type text NOT NULL,      -- MIME type
  file_size_bytes bigint,
  s3_key text NOT NULL,
  s3_bucket text NOT NULL,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(tenant_id, entity_type, entity_id);

-- Portal permissions
INSERT INTO permissions (id, code, description) VALUES
  (gen_random_uuid(), 'portal.orders.read', 'View own orders in customer portal'),
  (gen_random_uuid(), 'portal.invoices.read', 'View own invoices in customer portal'),
  (gen_random_uuid(), 'portal.invoices.download', 'Download invoice PDFs from portal'),
  (gen_random_uuid(), 'portal.pod.read', 'View proof of delivery in portal'),
  (gen_random_uuid(), 'portal.pod.download', 'Download POD documents from portal'),
  (gen_random_uuid(), 'portal.tracking.read', 'Track deliveries in portal'),
  (gen_random_uuid(), 'portal.returns.create', 'Raise return requests from portal'),
  (gen_random_uuid(), 'portal.returns.read', 'View return status in portal')
ON CONFLICT (code) DO NOTHING;

-- Driver permissions
INSERT INTO permissions (id, code, description) VALUES
  (gen_random_uuid(), 'driver.trips.read', 'View assigned trips'),
  (gen_random_uuid(), 'driver.trips.start', 'Start assigned trips'),
  (gen_random_uuid(), 'driver.trips.complete', 'Complete trips'),
  (gen_random_uuid(), 'driver.stops.update', 'Update stop status'),
  (gen_random_uuid(), 'driver.pod.capture', 'Capture proof of delivery'),
  (gen_random_uuid(), 'driver.upload', 'Upload photos and signatures')
ON CONFLICT (code) DO NOTHING;

COMMIT;
