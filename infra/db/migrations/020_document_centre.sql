-- Document Centre metadata and permissions

BEGIN;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_type text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS linked_label text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PENDING';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS expiry_date date;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(tenant_id, document_type);
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents(tenant_id, expiry_date);

INSERT INTO permissions (code, description) VALUES
  ('document.read', 'View compliance documents'),
  ('document.write', 'Upload and manage compliance documents')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.code IN ('document.read', 'document.write')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE p.code = 'document.read'
ON CONFLICT DO NOTHING;

COMMIT;
