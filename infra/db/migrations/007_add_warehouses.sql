-- Migration: Add warehouses for each site
-- Creates warehouses linked to the sites created in migration 006

BEGIN;

-- Add warehouse for K58 site
INSERT INTO warehouses (tenant_id, site_id, name, code)
SELECT t.id, s.id, 'Klapmuts K58 Warehouse', 'WH-K58'
FROM tenants t
CROSS JOIN sites s
WHERE s.code = 'K58'
  AND NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.site_id = s.id AND w.code = 'WH-K58')
LIMIT 1;

-- Add warehouse for GWF site
INSERT INTO warehouses (tenant_id, site_id, name, code)
SELECT t.id, s.id, 'Klapmuts GWF Warehouse', 'WH-GWF'
FROM tenants t
CROSS JOIN sites s
WHERE s.code = 'GWF'
  AND NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.site_id = s.id AND w.code = 'WH-GWF')
LIMIT 1;

-- Add warehouse for PTA site
INSERT INTO warehouses (tenant_id, site_id, name, code)
SELECT t.id, s.id, 'Pretoria Warehouse', 'WH-PTA'
FROM tenants t
CROSS JOIN sites s
WHERE s.code = 'PTA'
  AND NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.site_id = s.id AND w.code = 'WH-PTA')
LIMIT 1;

-- Grant all existing users access to all warehouses (if user_warehouses table exists)
-- This is optional - users may need warehouse access depending on your permission model

COMMIT;
