-- Non-Conformance / Defect Tracking
CREATE TABLE non_conformances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  nc_no text NOT NULL,
  work_order_id uuid REFERENCES work_orders(id) ON DELETE SET NULL,
  item_id uuid REFERENCES items(id) ON DELETE SET NULL,
  reported_by uuid NOT NULL REFERENCES users(id),
  defect_type text NOT NULL,
  severity text NOT NULL DEFAULT 'MINOR',
  description text NOT NULL,
  qty_affected numeric(12,4) DEFAULT 0,
  disposition text,
  corrective_action text,
  status text NOT NULL DEFAULT 'OPEN',
  resolved_by uuid REFERENCES users(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, nc_no)
);

CREATE INDEX idx_non_conformances_tenant ON non_conformances(tenant_id);
CREATE INDEX idx_non_conformances_status ON non_conformances(tenant_id, status);
CREATE INDEX idx_non_conformances_work_order ON non_conformances(work_order_id);
CREATE INDEX idx_non_conformances_item ON non_conformances(item_id);

-- Add quality permissions
INSERT INTO permissions (code, description) VALUES
  ('quality.view', 'View non-conformances'),
  ('quality.create', 'Create non-conformances'),
  ('quality.edit', 'Edit non-conformances'),
  ('quality.resolve', 'Resolve and close non-conformances')
ON CONFLICT (code) DO NOTHING;

-- Grant quality permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Admin'
  AND p.code IN ('quality.view', 'quality.create', 'quality.edit', 'quality.resolve')
ON CONFLICT DO NOTHING;

-- Grant view+create to Operator role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Operator'
  AND p.code IN ('quality.view', 'quality.create')
ON CONFLICT DO NOTHING;
