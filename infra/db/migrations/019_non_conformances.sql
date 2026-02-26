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

-- Add quality permissions to the default role assignments
INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.permission
FROM roles r
CROSS JOIN (
  VALUES ('quality.view'), ('quality.create'), ('quality.edit'), ('quality.resolve')
) AS p(permission)
WHERE r.name = 'Admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission)
SELECT r.id, p.permission
FROM roles r
CROSS JOIN (
  VALUES ('quality.view'), ('quality.create')
) AS p(permission)
WHERE r.name = 'Operator'
ON CONFLICT DO NOTHING;
