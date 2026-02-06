-- Migration: Add multi-site support
-- Adds Klapmuts K58, Klapmuts GWF, and Pretoria sites

BEGIN;

-- Insert the 3 sites for the demo tenant
-- Using subquery to get tenant_id dynamically
INSERT INTO sites (tenant_id, name, code)
SELECT id, 'Klapmuts K58', 'K58'
FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE code = 'K58')
LIMIT 1;

INSERT INTO sites (tenant_id, name, code)
SELECT id, 'Klapmuts GWF', 'GWF'
FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE code = 'GWF')
LIMIT 1;

INSERT INTO sites (tenant_id, name, code)
SELECT id, 'Pretoria', 'PTA'
FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM sites WHERE code = 'PTA')
LIMIT 1;

-- Grant all existing users access to all sites
INSERT INTO user_sites (user_id, site_id)
SELECT u.id, s.id
FROM users u
CROSS JOIN sites s
WHERE NOT EXISTS (
  SELECT 1 FROM user_sites us
  WHERE us.user_id = u.id AND us.site_id = s.id
);

COMMIT;
