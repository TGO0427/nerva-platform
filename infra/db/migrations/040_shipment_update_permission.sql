-- The fulfilment pack/mark-ready endpoints have always checked the
-- "shipment.update" permission, but it was never seeded, so no non-admin
-- role could actually use them. Add it and grant it to whichever roles
-- already hold the closely-related "shipment.ready" permission.

BEGIN;

INSERT INTO permissions (code, description) VALUES
  ('shipment.update', 'Pack and mark shipments ready for dispatch')
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT rp.role_id, p.id
FROM role_permissions rp
JOIN permissions existing ON existing.id = rp.permission_id AND existing.code = 'shipment.ready'
JOIN permissions p ON p.code = 'shipment.update'
ON CONFLICT DO NOTHING;

COMMIT;
