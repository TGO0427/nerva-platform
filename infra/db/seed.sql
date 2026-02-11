-- Nerva Sample Data Seed
-- Run this after schema.sql to populate the database with demo data

BEGIN;

-- ================
-- Demo Tenant
-- ================
INSERT INTO tenants (id, name, code) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Demo Company', 'DEMO')
ON CONFLICT (code) DO NOTHING;

-- ================
-- Sites
-- ================
INSERT INTO sites (id, tenant_id, name, code) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Klapmuts K58', 'K58'),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Klapmuts GWF', 'GWF'),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'Pretoria', 'PTA')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ================
-- Roles
-- ================
INSERT INTO roles (id, tenant_id, name, description) VALUES
  ('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111111', 'Admin', 'Full system access'),
  ('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111111', 'Warehouse Manager', 'Manage warehouse operations'),
  ('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111111', 'Picker', 'Execute pick tasks'),
  ('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111111', 'Driver', 'Execute deliveries')
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Assign all permissions to Admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT '33333333-3333-3333-3333-333333333301', id FROM permissions
ON CONFLICT DO NOTHING;

-- ================
-- Users (password is 'demo123' hashed with bcrypt)
-- ================
INSERT INTO users (id, tenant_id, email, display_name, password_hash) VALUES
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111111', 'admin@demo.com', 'Admin User', '$2b$10$rQEY7BXM6kNGqQx7c.FzXOoLXGP8rGJQz3QFzPQlFPXBFGPXBFGPX'),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111111', 'warehouse@demo.com', 'Warehouse Manager', '$2b$10$rQEY7BXM6kNGqQx7c.FzXOoLXGP8rGJQz3QFzPQlFPXBFGPXBFGPX'),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111111', 'picker@demo.com', 'John Picker', '$2b$10$rQEY7BXM6kNGqQx7c.FzXOoLXGP8rGJQz3QFzPQlFPXBFGPXBFGPX'),
  ('44444444-4444-4444-4444-444444444404', '11111111-1111-1111-1111-111111111111', 'driver@demo.com', 'Mike Driver', '$2b$10$rQEY7BXM6kNGqQx7c.FzXOoLXGP8rGJQz3QFzPQlFPXBFGPXBFGPX')
ON CONFLICT (tenant_id, email) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id) VALUES
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301'),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333302'),
  ('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333303'),
  ('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333304')
ON CONFLICT DO NOTHING;

-- ================
-- Warehouses (one per site)
-- ================
INSERT INTO warehouses (id, tenant_id, site_id, name, code) VALUES
  ('55555555-5555-5555-5555-555555555501', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 'Klapmuts K58 Warehouse', 'WH-K58'),
  ('55555555-5555-5555-5555-555555555502', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', 'Klapmuts GWF Warehouse', 'WH-GWF'),
  ('55555555-5555-5555-5555-555555555503', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', 'Pretoria Warehouse', 'WH-PTA')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ================
-- Bins
-- ================
INSERT INTO bins (id, tenant_id, warehouse_id, code, bin_type, aisle, rack, level) VALUES
  -- Receiving bins
  ('66666666-6666-6666-6666-666666666601', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'RCV-01', 'RECEIVING', null, null, null),
  ('66666666-6666-6666-6666-666666666602', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'RCV-02', 'RECEIVING', null, null, null),
  -- Storage bins
  ('66666666-6666-6666-6666-666666666610', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'A-01-01', 'STORAGE', 'A', '01', '01'),
  ('66666666-6666-6666-6666-666666666611', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'A-01-02', 'STORAGE', 'A', '01', '02'),
  ('66666666-6666-6666-6666-666666666612', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'A-01-03', 'STORAGE', 'A', '01', '03'),
  ('66666666-6666-6666-6666-666666666613', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'A-02-01', 'STORAGE', 'A', '02', '01'),
  ('66666666-6666-6666-6666-666666666614', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'A-02-02', 'STORAGE', 'A', '02', '02'),
  ('66666666-6666-6666-6666-666666666615', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'B-01-01', 'STORAGE', 'B', '01', '01'),
  ('66666666-6666-6666-6666-666666666616', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'B-01-02', 'STORAGE', 'B', '01', '02'),
  ('66666666-6666-6666-6666-666666666617', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'B-02-01', 'STORAGE', 'B', '02', '01'),
  -- Picking bins
  ('66666666-6666-6666-6666-666666666620', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'PICK-01', 'PICKING', null, null, null),
  ('66666666-6666-6666-6666-666666666621', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'PICK-02', 'PICKING', null, null, null),
  -- Shipping bin
  ('66666666-6666-6666-6666-666666666630', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'SHIP-01', 'SHIPPING', null, null, null),
  -- Quarantine bin
  ('66666666-6666-6666-6666-666666666640', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'QC-01', 'QUARANTINE', null, null, null)
ON CONFLICT (tenant_id, warehouse_id, code) DO NOTHING;

-- Bins for GWF Warehouse
INSERT INTO bins (id, tenant_id, warehouse_id, code, bin_type, aisle, rack, level) VALUES
  ('66666666-6666-6666-6666-666666666701', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555502', 'RCV-01', 'RECEIVING', null, null, null),
  ('66666666-6666-6666-6666-666666666710', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555502', 'A-01-01', 'STORAGE', 'A', '01', '01'),
  ('66666666-6666-6666-6666-666666666711', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555502', 'A-01-02', 'STORAGE', 'A', '01', '02'),
  ('66666666-6666-6666-6666-666666666712', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555502', 'A-02-01', 'STORAGE', 'A', '02', '01'),
  ('66666666-6666-6666-6666-666666666713', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555502', 'B-01-01', 'STORAGE', 'B', '01', '01'),
  ('66666666-6666-6666-6666-666666666720', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555502', 'PICK-01', 'PICKING', null, null, null),
  ('66666666-6666-6666-6666-666666666730', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555502', 'SHIP-01', 'SHIPPING', null, null, null),
  ('66666666-6666-6666-6666-666666666740', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555502', 'QC-01', 'QUARANTINE', null, null, null)
ON CONFLICT (tenant_id, warehouse_id, code) DO NOTHING;

-- Bins for PTA Warehouse
INSERT INTO bins (id, tenant_id, warehouse_id, code, bin_type, aisle, rack, level) VALUES
  ('66666666-6666-6666-6666-666666666801', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555503', 'RCV-01', 'RECEIVING', null, null, null),
  ('66666666-6666-6666-6666-666666666810', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555503', 'A-01-01', 'STORAGE', 'A', '01', '01'),
  ('66666666-6666-6666-6666-666666666811', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555503', 'A-01-02', 'STORAGE', 'A', '01', '02'),
  ('66666666-6666-6666-6666-666666666812', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555503', 'A-02-01', 'STORAGE', 'A', '02', '01'),
  ('66666666-6666-6666-6666-666666666813', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555503', 'B-01-01', 'STORAGE', 'B', '01', '01'),
  ('66666666-6666-6666-6666-666666666820', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555503', 'PICK-01', 'PICKING', null, null, null),
  ('66666666-6666-6666-6666-666666666830', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555503', 'SHIP-01', 'SHIPPING', null, null, null),
  ('66666666-6666-6666-6666-666666666840', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555503', 'QC-01', 'QUARANTINE', null, null, null)
ON CONFLICT (tenant_id, warehouse_id, code) DO NOTHING;

-- ================
-- Items
-- ================
INSERT INTO items (id, tenant_id, sku, description, uom, weight_kg) VALUES
  ('77777777-7777-7777-7777-777777777701', '11111111-1111-1111-1111-111111111111', 'WIDGET-001', 'Standard Widget', 'EA', 0.5),
  ('77777777-7777-7777-7777-777777777702', '11111111-1111-1111-1111-111111111111', 'WIDGET-002', 'Premium Widget', 'EA', 0.75),
  ('77777777-7777-7777-7777-777777777703', '11111111-1111-1111-1111-111111111111', 'GADGET-001', 'Mini Gadget', 'EA', 0.25),
  ('77777777-7777-7777-7777-777777777704', '11111111-1111-1111-1111-111111111111', 'GADGET-002', 'Super Gadget', 'EA', 1.0),
  ('77777777-7777-7777-7777-777777777705', '11111111-1111-1111-1111-111111111111', 'PART-001', 'Replacement Part A', 'EA', 0.1),
  ('77777777-7777-7777-7777-777777777706', '11111111-1111-1111-1111-111111111111', 'PART-002', 'Replacement Part B', 'EA', 0.15),
  ('77777777-7777-7777-7777-777777777707', '11111111-1111-1111-1111-111111111111', 'CABLE-USB', 'USB-C Cable 2m', 'EA', 0.05),
  ('77777777-7777-7777-7777-777777777708', '11111111-1111-1111-1111-111111111111', 'CABLE-HDMI', 'HDMI Cable 3m', 'EA', 0.08),
  ('77777777-7777-7777-7777-777777777709', '11111111-1111-1111-1111-111111111111', 'BOX-SML', 'Small Shipping Box', 'EA', 0.2),
  ('77777777-7777-7777-7777-777777777710', '11111111-1111-1111-1111-111111111111', 'BOX-LRG', 'Large Shipping Box', 'EA', 0.4)
ON CONFLICT (tenant_id, sku) DO NOTHING;

-- ================
-- Customers
-- ================
INSERT INTO customers (id, tenant_id, code, name, email, phone, shipping_address_line1, shipping_city, shipping_postal_code, shipping_country) VALUES
  ('88888888-8888-8888-8888-888888888801', '11111111-1111-1111-1111-111111111111', 'CUST001', 'Acme Corporation', 'orders@acme.co.za', '+27 11 123 4567', '123 Business Park', 'Johannesburg', '2000', 'South Africa'),
  ('88888888-8888-8888-8888-888888888802', '11111111-1111-1111-1111-111111111111', 'CUST002', 'TechStart Solutions', 'purchasing@techstart.co.za', '+27 21 234 5678', '456 Innovation Hub', 'Cape Town', '8001', 'South Africa'),
  ('88888888-8888-8888-8888-888888888803', '11111111-1111-1111-1111-111111111111', 'CUST003', 'Retail World', 'supply@retailworld.co.za', '+27 31 345 6789', '789 Commerce Street', 'Durban', '4001', 'South Africa'),
  ('88888888-8888-8888-8888-888888888804', '11111111-1111-1111-1111-111111111111', 'CUST004', 'BuildRight Construction', 'orders@buildright.co.za', '+27 12 456 7890', '321 Industrial Road', 'Pretoria', '0001', 'South Africa'),
  ('88888888-8888-8888-8888-888888888805', '11111111-1111-1111-1111-111111111111', 'CUST005', 'Green Energy Co', 'procurement@greenenergy.co.za', '+27 41 567 8901', '555 Eco Park', 'Port Elizabeth', '6001', 'South Africa')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ================
-- Suppliers
-- ================
INSERT INTO suppliers (id, tenant_id, code, name, email, phone) VALUES
  ('99999999-9999-9999-9999-999999999901', '11111111-1111-1111-1111-111111111111', 'SUP001', 'Global Parts Inc', 'sales@globalparts.com', '+1 555 123 4567'),
  ('99999999-9999-9999-9999-999999999902', '11111111-1111-1111-1111-111111111111', 'SUP002', 'China Electronics Ltd', 'export@chinaelec.cn', '+86 21 1234 5678'),
  ('99999999-9999-9999-9999-999999999903', '11111111-1111-1111-1111-111111111111', 'SUP003', 'Local Supplies SA', 'orders@localsupplies.co.za', '+27 11 999 8888')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ================
-- Stock Snapshot (Inventory on hand)
-- ================
INSERT INTO stock_snapshot (tenant_id, bin_id, item_id, batch_no, qty_on_hand, qty_reserved) VALUES
  -- Widget-001 in multiple bins
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666610', '77777777-7777-7777-7777-777777777701', '', 100, 20),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666611', '77777777-7777-7777-7777-777777777701', '', 50, 0),
  -- Widget-002
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666612', '77777777-7777-7777-7777-777777777702', '', 75, 15),
  -- Gadget-001
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666613', '77777777-7777-7777-7777-777777777703', '', 200, 30),
  -- Gadget-002
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666614', '77777777-7777-7777-7777-777777777704', '', 45, 10),
  -- Parts
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666615', '77777777-7777-7777-7777-777777777705', '', 500, 0),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666616', '77777777-7777-7777-7777-777777777706', '', 350, 50),
  -- Cables
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666617', '77777777-7777-7777-7777-777777777707', '', 1000, 100),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666617', '77777777-7777-7777-7777-777777777708', '', 500, 50),
  -- Boxes
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666610', '77777777-7777-7777-7777-777777777709', '', 200, 0),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666611', '77777777-7777-7777-7777-777777777710', '', 100, 0)
ON CONFLICT (tenant_id, bin_id, item_id, batch_no) DO UPDATE SET
  qty_on_hand = EXCLUDED.qty_on_hand,
  qty_reserved = EXCLUDED.qty_reserved;

-- ================
-- Sales Orders
-- ================
-- Order 1: Draft
INSERT INTO sales_orders (id, tenant_id, site_id, warehouse_id, customer_id, order_no, status, priority, requested_ship_date, shipping_address_line1, shipping_city, notes, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888801', 'SO-2024-0001', 'DRAFT', 5, CURRENT_DATE + INTERVAL '7 days', '123 Business Park', 'Johannesburg', 'New customer order', '44444444-4444-4444-4444-444444444401')
ON CONFLICT (tenant_id, order_no) DO NOTHING;

INSERT INTO sales_order_lines (id, tenant_id, sales_order_id, line_no, item_id, qty_ordered, unit_price) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 1, '77777777-7777-7777-7777-777777777701', 10, 99.99),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001', 2, '77777777-7777-7777-7777-777777777703', 5, 49.99)
ON CONFLICT DO NOTHING;

-- Order 2: Confirmed
INSERT INTO sales_orders (id, tenant_id, site_id, warehouse_id, customer_id, order_no, status, priority, requested_ship_date, shipping_address_line1, shipping_city, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888802', 'SO-2024-0002', 'CONFIRMED', 3, CURRENT_DATE + INTERVAL '3 days', '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401')
ON CONFLICT (tenant_id, order_no) DO NOTHING;

INSERT INTO sales_order_lines (id, tenant_id, sales_order_id, line_no, item_id, qty_ordered, unit_price) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 1, '77777777-7777-7777-7777-777777777702', 20, 149.99),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb004', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 2, '77777777-7777-7777-7777-777777777707', 50, 19.99)
ON CONFLICT DO NOTHING;

-- Order 3: Allocated (ready for picking)
INSERT INTO sales_orders (id, tenant_id, site_id, warehouse_id, customer_id, order_no, status, priority, requested_ship_date, shipping_address_line1, shipping_city, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888803', 'SO-2024-0003', 'ALLOCATED', 1, CURRENT_DATE + INTERVAL '1 day', '789 Commerce Street', 'Durban', '44444444-4444-4444-4444-444444444401')
ON CONFLICT (tenant_id, order_no) DO NOTHING;

INSERT INTO sales_order_lines (id, tenant_id, sales_order_id, line_no, item_id, qty_ordered, qty_allocated, unit_price) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb005', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 1, '77777777-7777-7777-7777-777777777704', 5, 5, 299.99),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb006', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 2, '77777777-7777-7777-7777-777777777705', 100, 100, 9.99)
ON CONFLICT DO NOTHING;

-- Order 4: Picking in progress
INSERT INTO sales_orders (id, tenant_id, site_id, warehouse_id, customer_id, order_no, status, priority, requested_ship_date, shipping_address_line1, shipping_city, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888804', 'SO-2024-0004', 'PICKING', 2, CURRENT_DATE, '321 Industrial Road', 'Pretoria', '44444444-4444-4444-4444-444444444401')
ON CONFLICT (tenant_id, order_no) DO NOTHING;

INSERT INTO sales_order_lines (id, tenant_id, sales_order_id, line_no, item_id, qty_ordered, qty_allocated, qty_picked, unit_price) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb007', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 1, '77777777-7777-7777-7777-777777777701', 15, 15, 10, 99.99),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb008', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 2, '77777777-7777-7777-7777-777777777706', 30, 30, 30, 14.99)
ON CONFLICT DO NOTHING;

-- Order 5: Shipped
INSERT INTO sales_orders (id, tenant_id, site_id, warehouse_id, customer_id, order_no, status, priority, requested_ship_date, shipping_address_line1, shipping_city, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888805', 'SO-2024-0005', 'SHIPPED', 5, CURRENT_DATE - INTERVAL '2 days', '555 Eco Park', 'Port Elizabeth', '44444444-4444-4444-4444-444444444401')
ON CONFLICT (tenant_id, order_no) DO NOTHING;

INSERT INTO sales_order_lines (id, tenant_id, sales_order_id, line_no, item_id, qty_ordered, qty_allocated, qty_picked, qty_packed, qty_shipped, unit_price) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb009', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005', 1, '77777777-7777-7777-7777-777777777708', 25, 25, 25, 25, 25, 29.99)
ON CONFLICT DO NOTHING;

-- ================
-- Pick Waves
-- ================
INSERT INTO pick_waves (id, tenant_id, warehouse_id, wave_no, status, created_by) VALUES
  ('cccccccc-cccc-cccc-cccc-ccccccccc001', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'WAVE-2024-0001', 'IN_PROGRESS', '44444444-4444-4444-4444-444444444402'),
  ('cccccccc-cccc-cccc-cccc-ccccccccc002', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555501', 'WAVE-2024-0002', 'COMPLETE', '44444444-4444-4444-4444-444444444402')
ON CONFLICT (tenant_id, wave_no) DO NOTHING;

-- Pick tasks for wave 1 (in progress)
INSERT INTO pick_tasks (id, tenant_id, pick_wave_id, sales_order_id, sales_order_line_id, item_id, from_bin_id, qty_to_pick, qty_picked, status, assigned_to) VALUES
  ('dddddddd-dddd-dddd-dddd-ddddddddd001', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-ccccccccc001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb007', '77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666610', 15, 10, 'IN_PROGRESS', '44444444-4444-4444-4444-444444444403'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd002', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-ccccccccc001', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb008', '77777777-7777-7777-7777-777777777706', '66666666-6666-6666-6666-666666666616', 30, 30, 'PICKED', '44444444-4444-4444-4444-444444444403')
ON CONFLICT DO NOTHING;

-- ================
-- Shipments
-- ================
-- Shipped shipment
INSERT INTO shipments (id, tenant_id, site_id, warehouse_id, sales_order_id, shipment_no, status, total_weight_kg, carrier, tracking_no, shipped_at, created_by) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005', 'SHIP-2024-0001', 'SHIPPED', 2.0, 'DHL Express', 'DHL123456789', CURRENT_TIMESTAMP - INTERVAL '1 day', '44444444-4444-4444-4444-444444444402')
ON CONFLICT (tenant_id, shipment_no) DO NOTHING;

-- Ready for dispatch shipments
INSERT INTO shipments (id, tenant_id, site_id, warehouse_id, sales_order_id, shipment_no, status, total_weight_kg, created_by) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003', 'SHIP-2024-0002', 'READY_FOR_DISPATCH', 5.5, '44444444-4444-4444-4444-444444444402'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002', 'SHIP-2024-0003', 'READY_FOR_DISPATCH', 3.2, '44444444-4444-4444-4444-444444444402')
ON CONFLICT (tenant_id, shipment_no) DO NOTHING;

-- Pending shipment
INSERT INTO shipments (id, tenant_id, site_id, warehouse_id, sales_order_id, shipment_no, status, total_weight_kg, created_by) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeee004', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004', 'SHIP-2024-0004', 'PENDING', 1.8, '44444444-4444-4444-4444-444444444402')
ON CONFLICT (tenant_id, shipment_no) DO NOTHING;

-- ================
-- Vehicles
-- ================
INSERT INTO vehicles (id, tenant_id, site_id, reg_no, make, model, capacity_kg, capacity_cbm) VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff01', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 'CJ 123 ABC', 'Toyota', 'Hilux', 1000, 3.5),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff02', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', 'CJ 456 DEF', 'Isuzu', 'NPR 400', 3500, 12),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff03', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', 'GP 789 GHI', 'Mercedes', 'Sprinter', 2000, 8)
ON CONFLICT (tenant_id, reg_no) DO NOTHING;

-- ================
-- Drivers
-- ================
INSERT INTO drivers (id, tenant_id, site_id, user_id, name, phone, license_no) VALUES
  ('11111111-dddd-dddd-dddd-dddddddddd01', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '44444444-4444-4444-4444-444444444404', 'Mike Driver', '+27 82 111 2222', 'DL123456'),
  ('11111111-dddd-dddd-dddd-dddddddddd02', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', null, 'Sarah Wheels', '+27 82 333 4444', 'DL789012'),
  ('11111111-dddd-dddd-dddd-dddddddddd03', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', null, 'John Roads', '+27 82 555 6666', 'DL345678')
ON CONFLICT DO NOTHING;

-- ================
-- Dispatch Trips
-- ================
-- Completed trip
INSERT INTO dispatch_trips (id, tenant_id, site_id, warehouse_id, trip_no, status, vehicle_id, driver_id, planned_date, actual_start, actual_end, total_stops, total_weight_kg, created_by) VALUES
  ('22222222-tttt-tttt-tttt-tttttttttt01', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'TRIP-2024-0001', 'COMPLETE', 'ffffffff-ffff-ffff-ffff-ffffffffffff01', '11111111-dddd-dddd-dddd-dddddddddd01', CURRENT_DATE - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day 8 hours', CURRENT_TIMESTAMP - INTERVAL '1 day 2 hours', 1, 2.0, '44444444-4444-4444-4444-444444444402')
ON CONFLICT (tenant_id, trip_no) DO NOTHING;

-- Planned trip
INSERT INTO dispatch_trips (id, tenant_id, site_id, warehouse_id, trip_no, status, planned_date, total_stops, created_by) VALUES
  ('22222222-tttt-tttt-tttt-tttttttttt02', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'TRIP-2024-0002', 'PLANNED', CURRENT_DATE + INTERVAL '1 day', 0, '44444444-4444-4444-4444-444444444402')
ON CONFLICT (tenant_id, trip_no) DO NOTHING;

-- In progress trip
INSERT INTO dispatch_trips (id, tenant_id, site_id, warehouse_id, trip_no, status, vehicle_id, driver_id, planned_date, actual_start, total_stops, total_weight_kg, created_by) VALUES
  ('22222222-tttt-tttt-tttt-tttttttttt03', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'TRIP-2024-0003', 'IN_PROGRESS', 'ffffffff-ffff-ffff-ffff-ffffffffffff02', '11111111-dddd-dddd-dddd-dddddddddd02', CURRENT_DATE, CURRENT_TIMESTAMP - INTERVAL '3 hours', 3, 8.7, '44444444-4444-4444-4444-444444444402')
ON CONFLICT (tenant_id, trip_no) DO NOTHING;

-- ================
-- Dispatch Stops
-- ================
-- Stop for completed trip
INSERT INTO dispatch_stops (id, tenant_id, trip_id, sequence, customer_id, address_line1, city, postal_code, status, arrived_at, completed_at) VALUES
  ('33333333-ssss-ssss-ssss-ssssssssss01', '11111111-1111-1111-1111-111111111111', '22222222-tttt-tttt-tttt-tttttttttt01', 1, '88888888-8888-8888-8888-888888888805', '555 Eco Park', 'Port Elizabeth', '6001', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '1 day 4 hours', CURRENT_TIMESTAMP - INTERVAL '1 day 3 hours')
ON CONFLICT (tenant_id, trip_id, sequence) DO NOTHING;

-- Stops for in-progress trip
INSERT INTO dispatch_stops (id, tenant_id, trip_id, sequence, customer_id, address_line1, city, postal_code, status, arrived_at, completed_at) VALUES
  ('33333333-ssss-ssss-ssss-ssssssssss02', '11111111-1111-1111-1111-111111111111', '22222222-tttt-tttt-tttt-tttttttttt03', 1, '88888888-8888-8888-8888-888888888801', '123 Business Park', 'Johannesburg', '2000', 'DELIVERED', CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour 45 minutes'),
  ('33333333-ssss-ssss-ssss-ssssssssss03', '11111111-1111-1111-1111-111111111111', '22222222-tttt-tttt-tttt-tttttttttt03', 2, '88888888-8888-8888-8888-888888888804', '321 Industrial Road', 'Pretoria', '0001', 'EN_ROUTE', null, null),
  ('33333333-ssss-ssss-ssss-ssssssssss04', '11111111-1111-1111-1111-111111111111', '22222222-tttt-tttt-tttt-tttttttttt03', 3, '88888888-8888-8888-8888-888888888803', '789 Commerce Street', 'Durban', '4001', 'PENDING', null, null)
ON CONFLICT (tenant_id, trip_id, sequence) DO NOTHING;

-- ================
-- Purchase Orders
-- ================
INSERT INTO purchase_orders (id, tenant_id, site_id, supplier_id, po_no, status, order_date, expected_date, ship_to_warehouse_id, subtotal, tax_amount, total_amount, notes, created_by) VALUES
  ('pppppppp-pppp-pppp-pppp-ppppppppp001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999901', 'PO-2024-0001', 'DRAFT', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', '55555555-5555-5555-5555-555555555501', 5000.00, 750.00, 5750.00, 'Initial stock order for Q1', '44444444-4444-4444-4444-444444444401'),
  ('pppppppp-pppp-pppp-pppp-ppppppppp002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999902', 'PO-2024-0002', 'SENT', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days', '55555555-5555-5555-5555-555555555501', 12500.00, 1875.00, 14375.00, 'Urgent electronics order', '44444444-4444-4444-4444-444444444401'),
  ('pppppppp-pppp-pppp-pppp-ppppppppp003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999903', 'PO-2024-0003', 'CONFIRMED', CURRENT_DATE - INTERVAL '10 days', CURRENT_DATE + INTERVAL '3 days', '55555555-5555-5555-5555-555555555501', 3200.00, 480.00, 3680.00, 'Regular monthly order', '44444444-4444-4444-4444-444444444401'),
  ('pppppppp-pppp-pppp-pppp-ppppppppp004', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999901', 'PO-2024-0004', 'PARTIAL', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days', '55555555-5555-5555-5555-555555555501', 8000.00, 1200.00, 9200.00, 'Partial delivery received', '44444444-4444-4444-4444-444444444401'),
  ('pppppppp-pppp-pppp-pppp-ppppppppp005', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999902', 'PO-2024-0005', 'RECEIVED', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '15 days', '55555555-5555-5555-5555-555555555501', 15000.00, 2250.00, 17250.00, 'Completed order', '44444444-4444-4444-4444-444444444401')
ON CONFLICT (tenant_id, po_no) DO NOTHING;

INSERT INTO purchase_order_lines (id, tenant_id, purchase_order_id, line_no, item_id, qty_ordered, qty_received, unit_cost) VALUES
  -- PO-2024-0001 lines (Draft)
  ('polllll-llll-llll-llll-lllllllll001', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp001', 1, '77777777-7777-7777-7777-777777777701', 50, 0, 80.00),
  ('polllll-llll-llll-llll-lllllllll002', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp001', 2, '77777777-7777-7777-7777-777777777702', 20, 0, 125.00),
  -- PO-2024-0002 lines (Sent)
  ('polllll-llll-llll-llll-lllllllll003', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp002', 1, '77777777-7777-7777-7777-777777777707', 500, 0, 15.00),
  ('polllll-llll-llll-llll-lllllllll004', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp002', 2, '77777777-7777-7777-7777-777777777708', 250, 0, 20.00),
  -- PO-2024-0003 lines (Confirmed)
  ('polllll-llll-llll-llll-lllllllll005', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp003', 1, '77777777-7777-7777-7777-777777777705', 200, 0, 8.00),
  ('polllll-llll-llll-llll-lllllllll006', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp003', 2, '77777777-7777-7777-7777-777777777706', 100, 0, 16.00),
  -- PO-2024-0004 lines (Partial)
  ('polllll-llll-llll-llll-lllllllll007', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp004', 1, '77777777-7777-7777-7777-777777777703', 100, 60, 40.00),
  ('polllll-llll-llll-llll-lllllllll008', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp004', 2, '77777777-7777-7777-7777-777777777704', 20, 15, 200.00),
  -- PO-2024-0005 lines (Received)
  ('polllll-llll-llll-llll-lllllllll009', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp005', 1, '77777777-7777-7777-7777-777777777701', 100, 100, 80.00),
  ('polllll-llll-llll-llll-lllllllll010', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp005', 2, '77777777-7777-7777-7777-777777777703', 150, 150, 40.00),
  ('polllll-llll-llll-llll-lllllllll011', '11111111-1111-1111-1111-111111111111', 'pppppppp-pppp-pppp-pppp-ppppppppp005', 3, '77777777-7777-7777-7777-777777777709', 50, 50, 10.00)
ON CONFLICT DO NOTHING;

-- ================
-- RMAs (Returns)
-- ================
INSERT INTO rmas (id, tenant_id, site_id, warehouse_id, customer_id, rma_no, status, return_type, notes, created_by) VALUES
  ('44444444-rrrr-rrrr-rrrr-rrrrrrrrrr01', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888801', 'RMA-2024-0001', 'OPEN', 'CUSTOMER', 'Customer requested return - wrong size ordered', '44444444-4444-4444-4444-444444444401'),
  ('44444444-rrrr-rrrr-rrrr-rrrrrrrrrr02', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888802', 'RMA-2024-0002', 'RECEIVED', 'CUSTOMER', 'Defective product', '44444444-4444-4444-4444-444444444401')
ON CONFLICT (tenant_id, rma_no) DO NOTHING;

INSERT INTO rma_lines (id, tenant_id, rma_id, item_id, qty_expected, qty_received, reason_code, disposition) VALUES
  ('55555555-rlll-rlll-rlll-rllllllll001', '11111111-1111-1111-1111-111111111111', '44444444-rrrr-rrrr-rrrr-rrrrrrrrrr01', '77777777-7777-7777-7777-777777777701', 5, 0, 'WRONG_ITEM', 'PENDING'),
  ('55555555-rlll-rlll-rlll-rllllllll002', '11111111-1111-1111-1111-111111111111', '44444444-rrrr-rrrr-rrrr-rrrrrrrrrr02', '77777777-7777-7777-7777-777777777702', 3, 3, 'DEFECTIVE', 'QUARANTINE')
ON CONFLICT DO NOTHING;

-- ================
-- GRNs (Goods Received)
-- ================
INSERT INTO grns (id, tenant_id, site_id, warehouse_id, supplier_id, grn_no, status, received_at, notes, created_by) VALUES
  ('66666666-gggg-gggg-gggg-gggggggggg01', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '99999999-9999-9999-9999-999999999901', 'GRN-2024-0001', 'COMPLETE', CURRENT_TIMESTAMP - INTERVAL '7 days', 'Regular stock replenishment', '44444444-4444-4444-4444-444444444402'),
  ('66666666-gggg-gggg-gggg-gggggggggg02', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '99999999-9999-9999-9999-999999999902', 'GRN-2024-0002', 'PUTAWAY_PENDING', CURRENT_TIMESTAMP - INTERVAL '1 day', 'Urgent order', '44444444-4444-4444-4444-444444444402')
ON CONFLICT (tenant_id, grn_no) DO NOTHING;

INSERT INTO grn_lines (id, tenant_id, grn_id, item_id, qty_expected, qty_received, receiving_bin_id) VALUES
  ('77777777-glll-glll-glll-gllllllll001', '11111111-1111-1111-1111-111111111111', '66666666-gggg-gggg-gggg-gggggggggg01', '77777777-7777-7777-7777-777777777701', 100, 100, '66666666-6666-6666-6666-666666666601'),
  ('77777777-glll-glll-glll-gllllllll002', '11111111-1111-1111-1111-111111111111', '66666666-gggg-gggg-gggg-gggggggggg01', '77777777-7777-7777-7777-777777777703', 200, 200, '66666666-6666-6666-6666-666666666601'),
  ('77777777-glll-glll-glll-gllllllll003', '11111111-1111-1111-1111-111111111111', '66666666-gggg-gggg-gggg-gggggggggg02', '77777777-7777-7777-7777-777777777707', 500, 500, '66666666-6666-6666-6666-666666666602'),
  ('77777777-glll-glll-glll-gllllllll004', '11111111-1111-1111-1111-111111111111', '66666666-gggg-gggg-gggg-gggggggggg02', '77777777-7777-7777-7777-777777777708', 250, 250, '66666666-6666-6666-6666-666666666602')
ON CONFLICT DO NOTHING;

COMMIT;

-- Summary of seeded data:
-- 1 Tenant (Demo Company)
-- 3 Sites (Klapmuts K58, Klapmuts GWF, Pretoria)
-- 4 Users (Admin, Warehouse Manager, Picker, Driver)
-- 4 Roles with permissions
-- 3 Warehouses with bins (K58: 14 bins, GWF: 8 bins, PTA: 8 bins)
-- 10 Items
-- 5 Customers
-- 3 Suppliers
-- Inventory in stock_snapshot (K58 warehouse)
-- 5 Sales Orders (various statuses, K58 site)
-- 5 Purchase Orders (DRAFT, SENT, CONFIRMED, PARTIAL, RECEIVED)
-- 2 Pick Waves with tasks
-- 4 Shipments (various statuses, K58 site)
-- 3 Vehicles (2 K58, 1 PTA)
-- 3 Drivers (2 K58, 1 PTA)
-- 3 Dispatch Trips with stops (K58 site)
-- 2 RMAs (K58 site)
-- 2 GRNs (K58 site)
