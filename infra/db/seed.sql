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

-- ================
-- Additional Stock (GWF & PTA warehouses for distribution charts)
-- ================
INSERT INTO stock_snapshot (tenant_id, bin_id, item_id, batch_no, qty_on_hand, qty_reserved) VALUES
  -- GWF Warehouse stock
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666710', '77777777-7777-7777-7777-777777777701', '', 80, 10),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666711', '77777777-7777-7777-7777-777777777702', '', 40, 5),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666712', '77777777-7777-7777-7777-777777777703', '', 120, 15),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666713', '77777777-7777-7777-7777-777777777704', '', 30, 5),
  -- PTA Warehouse stock
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666810', '77777777-7777-7777-7777-777777777701', '', 60, 8),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666811', '77777777-7777-7777-7777-777777777705', '', 300, 20),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666812', '77777777-7777-7777-7777-777777777707', '', 400, 30),
  ('11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666813', '77777777-7777-7777-7777-777777777708', '', 200, 15)
ON CONFLICT (tenant_id, bin_id, item_id, batch_no) DO UPDATE SET
  qty_on_hand = EXCLUDED.qty_on_hand,
  qty_reserved = EXCLUDED.qty_reserved;

-- ================
-- Historical Sales Orders (12 months of trending data for charts)
-- ================
INSERT INTO sales_orders (id, tenant_id, site_id, warehouse_id, customer_id, order_no, status, priority, shipping_address_line1, shipping_city, created_by, created_at) VALUES
  -- 12 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888801', 'SO-2024-0101', 'DELIVERED', 5, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '365 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888803', 'SO-2024-0102', 'DELIVERED', 3, '789 Commerce Street', 'Durban', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '353 days'),
  -- 11 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888802', 'SO-2024-0103', 'DELIVERED', 5, '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '335 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00004', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888804', 'SO-2024-0104', 'DELIVERED', 3, '321 Industrial Road', 'Pretoria', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '320 days'),
  -- 10 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00005', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888805', 'SO-2024-0105', 'DELIVERED', 5, '555 Eco Park', 'Port Elizabeth', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '305 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00006', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888801', 'SO-2024-0106', 'DELIVERED', 3, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '292 days'),
  -- 9 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00007', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888803', 'SO-2024-0107', 'DELIVERED', 5, '789 Commerce Street', 'Durban', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '275 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00008', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888802', 'SO-2024-0108', 'DELIVERED', 3, '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '260 days'),
  -- 8 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00009', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888804', 'SO-2024-0109', 'DELIVERED', 5, '321 Industrial Road', 'Pretoria', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '245 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00010', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888801', 'SO-2024-0110', 'DELIVERED', 3, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '232 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00011', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888805', 'SO-2024-0111', 'DELIVERED', 5, '555 Eco Park', 'Port Elizabeth', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '218 days'),
  -- 7 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00012', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888801', 'SO-2024-0112', 'DELIVERED', 3, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '210 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00013', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888803', 'SO-2024-0113', 'DELIVERED', 5, '789 Commerce Street', 'Durban', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '196 days'),
  -- 6 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00014', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888802', 'SO-2024-0114', 'DELIVERED', 3, '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '183 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00015', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888804', 'SO-2024-0115', 'DELIVERED', 5, '321 Industrial Road', 'Pretoria', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '170 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00016', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888801', 'SO-2024-0116', 'DELIVERED', 3, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '158 days'),
  -- 5 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00017', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888805', 'SO-2024-0117', 'DELIVERED', 5, '555 Eco Park', 'Port Elizabeth', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '150 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00018', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888803', 'SO-2024-0118', 'SHIPPED', 3, '789 Commerce Street', 'Durban', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '138 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00019', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888801', 'SO-2024-0119', 'DELIVERED', 5, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '125 days'),
  -- 4 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00020', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888802', 'SO-2024-0120', 'SHIPPED', 3, '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '118 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00021', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888804', 'SO-2024-0121', 'DELIVERED', 5, '321 Industrial Road', 'Pretoria', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '105 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00022', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888801', 'SO-2024-0122', 'SHIPPED', 3, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '93 days'),
  -- 3 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00023', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888805', 'SO-2024-0123', 'SHIPPED', 5, '555 Eco Park', 'Port Elizabeth', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '85 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00024', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888803', 'SO-2024-0124', 'DELIVERED', 3, '789 Commerce Street', 'Durban', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '72 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00025', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888802', 'SO-2024-0125', 'SHIPPED', 5, '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '62 days'),
  -- 2 months ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00026', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888801', 'SO-2024-0126', 'SHIPPED', 3, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '55 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00027', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888804', 'SO-2024-0127', 'DELIVERED', 5, '321 Industrial Road', 'Pretoria', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '43 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00028', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888805', 'SO-2024-0128', 'SHIPPED', 3, '555 Eco Park', 'Port Elizabeth', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '35 days'),
  -- 1 month ago
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00029', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888803', 'SO-2024-0129', 'CONFIRMED', 3, '789 Commerce Street', 'Durban', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '25 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00030', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888801', 'SO-2024-0130', 'SHIPPED', 5, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '15 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00031', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888802', 'SO-2024-0131', 'ALLOCATED', 3, '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '7 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00032', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', '88888888-8888-8888-8888-888888888804', 'SO-2024-0132', 'PICKING', 5, '321 Industrial Road', 'Pretoria', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '3 days')
ON CONFLICT (tenant_id, order_no) DO NOTHING;

-- Historical Sales Order Lines (increasing order values over time = upward trend)
INSERT INTO sales_order_lines (id, tenant_id, sales_order_id, line_no, item_id, qty_ordered, unit_price) VALUES
  -- 12 months ago (~R7k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00001', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00001', 1, '77777777-7777-7777-7777-777777777701', 25, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00002', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00001', 2, '77777777-7777-7777-7777-777777777704', 15, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00003', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00002', 1, '77777777-7777-7777-7777-777777777702', 20, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00004', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00002', 2, '77777777-7777-7777-7777-777777777707', 80, 19.99),
  -- 11 months ago (~R8k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00005', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00003', 1, '77777777-7777-7777-7777-777777777704', 18, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00006', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00003', 2, '77777777-7777-7777-7777-777777777703', 60, 49.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00007', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00004', 1, '77777777-7777-7777-7777-777777777701', 35, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00008', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00004', 2, '77777777-7777-7777-7777-777777777708', 100, 29.99),
  -- 10 months ago (~R9k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00009', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00005', 1, '77777777-7777-7777-7777-777777777702', 30, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00010', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00005', 2, '77777777-7777-7777-7777-777777777705', 200, 9.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00011', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00006', 1, '77777777-7777-7777-7777-777777777701', 40, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00012', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00006', 2, '77777777-7777-7777-7777-777777777704', 20, 299.99),
  -- 9 months ago (~R10k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00013', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00007', 1, '77777777-7777-7777-7777-777777777704', 25, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00014', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00007', 2, '77777777-7777-7777-7777-777777777707', 120, 19.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00015', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00008', 1, '77777777-7777-7777-7777-777777777702', 35, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00016', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00008', 2, '77777777-7777-7777-7777-777777777706', 200, 14.99),
  -- 8 months ago (~R11k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00017', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00009', 1, '77777777-7777-7777-7777-777777777701', 50, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00018', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00009', 2, '77777777-7777-7777-7777-777777777704', 20, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00019', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00010', 1, '77777777-7777-7777-7777-777777777702', 40, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00020', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00010', 2, '77777777-7777-7777-7777-777777777708', 80, 29.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00021', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00011', 1, '77777777-7777-7777-7777-777777777703', 80, 49.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00022', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00011', 2, '77777777-7777-7777-7777-777777777701', 45, 99.99),
  -- 7 months ago (~R12k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00023', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00012', 1, '77777777-7777-7777-7777-777777777704', 30, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00024', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00012', 2, '77777777-7777-7777-7777-777777777707', 150, 19.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00025', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00013', 1, '77777777-7777-7777-7777-777777777702', 45, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00026', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00013', 2, '77777777-7777-7777-7777-777777777705', 300, 9.99),
  -- 6 months ago (~R14k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00027', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00014', 1, '77777777-7777-7777-7777-777777777704', 35, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00028', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00014', 2, '77777777-7777-7777-7777-777777777703', 100, 49.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00029', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00015', 1, '77777777-7777-7777-7777-777777777701', 60, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00030', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00015', 2, '77777777-7777-7777-7777-777777777704', 25, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00031', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00016', 1, '77777777-7777-7777-7777-777777777702', 50, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00032', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00016', 2, '77777777-7777-7777-7777-777777777708', 120, 29.99),
  -- 5 months ago (~R15k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00033', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00017', 1, '77777777-7777-7777-7777-777777777704', 40, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00034', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00017', 2, '77777777-7777-7777-7777-777777777701', 30, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00035', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00018', 1, '77777777-7777-7777-7777-777777777702', 55, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00036', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00018', 2, '77777777-7777-7777-7777-777777777706', 250, 14.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00037', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00019', 1, '77777777-7777-7777-7777-777777777701', 70, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00038', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00019', 2, '77777777-7777-7777-7777-777777777703', 90, 49.99),
  -- 4 months ago (~R17k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00039', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00020', 1, '77777777-7777-7777-7777-777777777704', 45, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00040', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00020', 2, '77777777-7777-7777-7777-777777777707', 200, 19.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00041', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00021', 1, '77777777-7777-7777-7777-777777777702', 60, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00042', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00021', 2, '77777777-7777-7777-7777-777777777704', 25, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00043', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00022', 1, '77777777-7777-7777-7777-777777777701', 80, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00044', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00022', 2, '77777777-7777-7777-7777-777777777708', 150, 29.99),
  -- 3 months ago (~R19k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00045', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00023', 1, '77777777-7777-7777-7777-777777777704', 50, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00046', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00023', 2, '77777777-7777-7777-7777-777777777703', 80, 49.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00047', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00024', 1, '77777777-7777-7777-7777-777777777702', 65, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00048', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00024', 2, '77777777-7777-7777-7777-777777777707', 180, 19.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00049', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00025', 1, '77777777-7777-7777-7777-777777777701', 90, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00050', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00025', 2, '77777777-7777-7777-7777-777777777706', 300, 14.99),
  -- 2 months ago (~R21k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00051', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00026', 1, '77777777-7777-7777-7777-777777777704', 55, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00052', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00026', 2, '77777777-7777-7777-7777-777777777702', 30, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00053', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00027', 1, '77777777-7777-7777-7777-777777777701', 100, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00054', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00027', 2, '77777777-7777-7777-7777-777777777704', 35, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00055', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00028', 1, '77777777-7777-7777-7777-777777777703', 120, 49.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00056', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00028', 2, '77777777-7777-7777-7777-777777777708', 200, 29.99),
  -- 1 month ago (~R24k per order)
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00057', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00029', 1, '77777777-7777-7777-7777-777777777704', 60, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00058', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00029', 2, '77777777-7777-7777-7777-777777777701', 50, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00059', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00030', 1, '77777777-7777-7777-7777-777777777702', 75, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00060', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00030', 2, '77777777-7777-7777-7777-777777777704', 40, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00061', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00031', 1, '77777777-7777-7777-7777-777777777701', 110, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00062', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00031', 2, '77777777-7777-7777-7777-777777777708', 250, 29.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00063', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00032', 1, '77777777-7777-7777-7777-777777777704', 65, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00064', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00032', 2, '77777777-7777-7777-7777-777777777703', 100, 49.99)
ON CONFLICT DO NOTHING;

-- ================
-- Historical Purchase Orders (12 months of trending data)
-- ================
INSERT INTO purchase_orders (id, tenant_id, site_id, supplier_id, po_no, status, order_date, expected_date, ship_to_warehouse_id, subtotal, tax_amount, total_amount, created_by, created_at) VALUES
  -- 12 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999901', 'PO-2024-0101', 'RECEIVED', CURRENT_DATE - INTERVAL '365 days', CURRENT_DATE - INTERVAL '351 days', '55555555-5555-5555-5555-555555555501', 6400.00, 960.00, 7360.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '365 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00002', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999903', 'PO-2024-0102', 'RECEIVED', CURRENT_DATE - INTERVAL '350 days', CURRENT_DATE - INTERVAL '336 days', '55555555-5555-5555-5555-555555555502', 4800.00, 720.00, 5520.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '350 days'),
  -- 11 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00003', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999902', 'PO-2024-0103', 'RECEIVED', CURRENT_DATE - INTERVAL '330 days', CURRENT_DATE - INTERVAL '316 days', '55555555-5555-5555-5555-555555555501', 8500.00, 1275.00, 9775.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '330 days'),
  -- 10 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00004', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999901', 'PO-2024-0104', 'RECEIVED', CURRENT_DATE - INTERVAL '300 days', CURRENT_DATE - INTERVAL '286 days', '55555555-5555-5555-5555-555555555501', 9200.00, 1380.00, 10580.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '300 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00005', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999903', 'PO-2024-0105', 'RECEIVED', CURRENT_DATE - INTERVAL '288 days', CURRENT_DATE - INTERVAL '274 days', '55555555-5555-5555-5555-555555555503', 5600.00, 840.00, 6440.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '288 days'),
  -- 9 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00006', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999902', 'PO-2024-0106', 'RECEIVED', CURRENT_DATE - INTERVAL '270 days', CURRENT_DATE - INTERVAL '256 days', '55555555-5555-5555-5555-555555555501', 11000.00, 1650.00, 12650.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '270 days'),
  -- 8 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00007', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999901', 'PO-2024-0107', 'RECEIVED', CURRENT_DATE - INTERVAL '240 days', CURRENT_DATE - INTERVAL '226 days', '55555555-5555-5555-5555-555555555501', 12500.00, 1875.00, 14375.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '240 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00008', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999903', 'PO-2024-0108', 'RECEIVED', CURRENT_DATE - INTERVAL '225 days', CURRENT_DATE - INTERVAL '211 days', '55555555-5555-5555-5555-555555555502', 7800.00, 1170.00, 8970.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '225 days'),
  -- 7 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00009', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999902', 'PO-2024-0109', 'RECEIVED', CURRENT_DATE - INTERVAL '210 days', CURRENT_DATE - INTERVAL '196 days', '55555555-5555-5555-5555-555555555501', 14000.00, 2100.00, 16100.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '210 days'),
  -- 6 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00010', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999901', 'PO-2024-0110', 'RECEIVED', CURRENT_DATE - INTERVAL '180 days', CURRENT_DATE - INTERVAL '166 days', '55555555-5555-5555-5555-555555555501', 15500.00, 2325.00, 17825.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '180 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00011', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999903', 'PO-2024-0111', 'RECEIVED', CURRENT_DATE - INTERVAL '168 days', CURRENT_DATE - INTERVAL '154 days', '55555555-5555-5555-5555-555555555503', 8200.00, 1230.00, 9430.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '168 days'),
  -- 5 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00012', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999902', 'PO-2024-0112', 'RECEIVED', CURRENT_DATE - INTERVAL '150 days', CURRENT_DATE - INTERVAL '136 days', '55555555-5555-5555-5555-555555555501', 18000.00, 2700.00, 20700.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '150 days'),
  -- 4 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00013', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999901', 'PO-2024-0113', 'RECEIVED', CURRENT_DATE - INTERVAL '120 days', CURRENT_DATE - INTERVAL '106 days', '55555555-5555-5555-5555-555555555501', 20000.00, 3000.00, 23000.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '120 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00014', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999903', 'PO-2024-0114', 'RECEIVED', CURRENT_DATE - INTERVAL '108 days', CURRENT_DATE - INTERVAL '94 days', '55555555-5555-5555-5555-555555555502', 9500.00, 1425.00, 10925.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '108 days'),
  -- 3 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00015', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999902', 'PO-2024-0115', 'RECEIVED', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '76 days', '55555555-5555-5555-5555-555555555501', 22000.00, 3300.00, 25300.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '90 days'),
  -- 2 months ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00016', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999901', 'PO-2024-0116', 'CONFIRMED', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '46 days', '55555555-5555-5555-5555-555555555501', 24000.00, 3600.00, 27600.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '60 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00017', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999903', 'PO-2024-0117', 'PARTIAL', CURRENT_DATE - INTERVAL '48 days', CURRENT_DATE - INTERVAL '34 days', '55555555-5555-5555-5555-555555555503', 11000.00, 1650.00, 12650.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '48 days'),
  -- 1 month ago
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00018', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201', '99999999-9999-9999-9999-999999999902', 'PO-2024-0118', 'SENT', CURRENT_DATE - INTERVAL '25 days', CURRENT_DATE - INTERVAL '11 days', '55555555-5555-5555-5555-555555555501', 26000.00, 3900.00, 29900.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '25 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00019', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999901', 'PO-2024-0119', 'CONFIRMED', CURRENT_DATE - INTERVAL '12 days', CURRENT_DATE + INTERVAL '2 days', '55555555-5555-5555-5555-555555555502', 18500.00, 2775.00, 21275.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '12 days')
ON CONFLICT (tenant_id, po_no) DO NOTHING;

-- Historical Purchase Order Lines
INSERT INTO purchase_order_lines (id, tenant_id, purchase_order_id, line_no, item_id, qty_ordered, qty_received, unit_cost) VALUES
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00001', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00001', 1, '77777777-7777-7777-7777-777777777701', 60, 60, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00002', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00001', 2, '77777777-7777-7777-7777-777777777705', 200, 200, 8.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00003', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00002', 1, '77777777-7777-7777-7777-777777777703', 80, 80, 40.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00004', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00002', 2, '77777777-7777-7777-7777-777777777706', 100, 100, 16.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00005', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00003', 1, '77777777-7777-7777-7777-777777777702', 40, 40, 125.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00006', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00003', 2, '77777777-7777-7777-7777-777777777707', 200, 200, 15.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00007', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00004', 1, '77777777-7777-7777-7777-777777777704', 30, 30, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00008', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00004', 2, '77777777-7777-7777-7777-777777777701', 40, 40, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00009', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00005', 1, '77777777-7777-7777-7777-777777777705', 400, 400, 8.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00010', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00005', 2, '77777777-7777-7777-7777-777777777706', 150, 150, 16.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00011', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00006', 1, '77777777-7777-7777-7777-777777777702', 50, 50, 125.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00012', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00006', 2, '77777777-7777-7777-7777-777777777708', 200, 200, 20.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00013', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00007', 1, '77777777-7777-7777-7777-777777777701', 100, 100, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00014', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00007', 2, '77777777-7777-7777-7777-777777777704', 25, 25, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00015', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00008', 1, '77777777-7777-7777-7777-777777777703', 120, 120, 40.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00016', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00008', 2, '77777777-7777-7777-7777-777777777707', 200, 200, 15.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00017', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00009', 1, '77777777-7777-7777-7777-777777777704', 50, 50, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00018', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00009', 2, '77777777-7777-7777-7777-777777777702', 32, 32, 125.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00019', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00010', 1, '77777777-7777-7777-7777-777777777701', 120, 120, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00020', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00010', 2, '77777777-7777-7777-7777-777777777708', 300, 300, 20.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00021', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00011', 1, '77777777-7777-7777-7777-777777777705', 500, 500, 8.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00022', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00011', 2, '77777777-7777-7777-7777-777777777706', 250, 250, 16.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00023', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00012', 1, '77777777-7777-7777-7777-777777777704', 60, 60, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00024', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00012', 2, '77777777-7777-7777-7777-777777777707', 400, 400, 15.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00025', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00013', 1, '77777777-7777-7777-7777-777777777701', 150, 150, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00026', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00013', 2, '77777777-7777-7777-7777-777777777702', 64, 64, 125.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00027', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00014', 1, '77777777-7777-7777-7777-777777777703', 150, 150, 40.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00028', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00014', 2, '77777777-7777-7777-7777-777777777706', 200, 200, 16.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00029', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00015', 1, '77777777-7777-7777-7777-777777777704', 80, 80, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00030', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00015', 2, '77777777-7777-7777-7777-777777777708', 300, 300, 20.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00031', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00016', 1, '77777777-7777-7777-7777-777777777701', 200, 0, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00032', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00016', 2, '77777777-7777-7777-7777-777777777704', 40, 0, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00033', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00017', 1, '77777777-7777-7777-7777-777777777705', 600, 350, 8.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00034', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00017', 2, '77777777-7777-7777-7777-777777777706', 300, 180, 16.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00035', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00018', 1, '77777777-7777-7777-7777-777777777702', 100, 0, 125.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00036', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00018', 2, '77777777-7777-7777-7777-777777777704', 65, 0, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00037', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00019', 1, '77777777-7777-7777-7777-777777777701', 150, 0, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00038', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00019', 2, '77777777-7777-7777-7777-777777777703', 100, 0, 40.00)
ON CONFLICT DO NOTHING;

-- ================
-- Supplier NCRs (decreasing trend = quality improvement)
-- ================
INSERT INTO supplier_ncrs (id, tenant_id, supplier_id, ncr_no, ncr_type, status, description, created_by, created_at) VALUES
  -- 12 months ago (3 NCRs - worst month)
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00001', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999902', 'NCR-2024-0001', 'QUALITY', 'CLOSED', 'Batch of USB cables failed quality inspection - 15% defect rate', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '360 days'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00002', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999901', 'NCR-2024-0002', 'DELIVERY', 'CLOSED', 'Order delivered 10 days late causing production delay', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '355 days'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00003', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999903', 'NCR-2024-0003', 'DOCUMENTATION', 'CLOSED', 'Missing certificates of compliance for replacement parts', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '348 days'),
  -- 11 months ago (2 NCRs)
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00004', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999902', 'NCR-2024-0004', 'QUALITY', 'CLOSED', 'HDMI cables with loose connectors - entire batch rejected', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '325 days'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00005', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999901', 'NCR-2024-0005', 'DELIVERY', 'CLOSED', 'Wrong items shipped - received gadgets instead of widgets', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '310 days'),
  -- 10 months ago (2 NCRs)
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00006', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999903', 'NCR-2024-0006', 'QUALITY', 'CLOSED', 'Replacement Part A dimensions out of spec', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '295 days'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00007', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999902', 'NCR-2024-0007', 'OTHER', 'CLOSED', 'Supplier failed to provide updated MSDS documentation', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '280 days'),
  -- 9 months ago (2 NCRs)
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00008', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999901', 'NCR-2024-0008', 'QUALITY', 'CLOSED', 'Premium widgets with cosmetic damage - scratched surfaces', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '265 days'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00009', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999903', 'NCR-2024-0009', 'DELIVERY', 'CLOSED', 'Partial shipment received without advance notice', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '250 days'),
  -- 7 months ago (1 NCR)
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00010', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999902', 'NCR-2024-0010', 'QUALITY', 'RESOLVED', 'Mini gadgets with faulty power buttons - 8% failure rate', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '200 days'),
  -- 6 months ago (1 NCR)
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00011', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999901', 'NCR-2024-0011', 'DOCUMENTATION', 'RESOLVED', 'Incorrect packing lists on multiple shipments', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '175 days'),
  -- 5 months ago (1 NCR)
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00012', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999903', 'NCR-2024-0012', 'DELIVERY', 'RESOLVED', 'Delivery to wrong warehouse location', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '140 days'),
  -- 3 months ago (1 NCR)
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00013', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999902', 'NCR-2024-0013', 'QUALITY', 'IN_PROGRESS', 'Super gadgets overheating during extended use', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '82 days'),
  -- 1 month ago (1 NCR)
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00014', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999901', 'NCR-2024-0014', 'DELIVERY', 'OPEN', 'Shipment arrived with damaged packaging', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '20 days')
ON CONFLICT (tenant_id, ncr_no) DO NOTHING;

-- ================
-- Additional Historical POs for GWF & PTA sites (richer chart data)
-- ================
INSERT INTO purchase_orders (id, tenant_id, site_id, supplier_id, po_no, status, order_date, expected_date, ship_to_warehouse_id, subtotal, tax_amount, total_amount, created_by, created_at) VALUES
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00020', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999901', 'PO-2024-0120', 'RECEIVED', CURRENT_DATE - INTERVAL '358 days', CURRENT_DATE - INTERVAL '344 days', '55555555-5555-5555-5555-555555555502', 5200.00, 780.00, 5980.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '358 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999903', 'PO-2024-0121', 'RECEIVED', CURRENT_DATE - INTERVAL '322 days', CURRENT_DATE - INTERVAL '308 days', '55555555-5555-5555-5555-555555555503', 6200.00, 930.00, 7130.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '322 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00022', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999902', 'PO-2024-0122', 'RECEIVED', CURRENT_DATE - INTERVAL '295 days', CURRENT_DATE - INTERVAL '281 days', '55555555-5555-5555-5555-555555555502', 7800.00, 1170.00, 8970.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '295 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00023', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999901', 'PO-2024-0123', 'RECEIVED', CURRENT_DATE - INTERVAL '262 days', CURRENT_DATE - INTERVAL '248 days', '55555555-5555-5555-5555-555555555503', 8500.00, 1275.00, 9775.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '262 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00024', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999903', 'PO-2024-0124', 'RECEIVED', CURRENT_DATE - INTERVAL '255 days', CURRENT_DATE - INTERVAL '241 days', '55555555-5555-5555-5555-555555555502', 6000.00, 900.00, 6900.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '255 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00025', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999902', 'PO-2024-0125', 'RECEIVED', CURRENT_DATE - INTERVAL '235 days', CURRENT_DATE - INTERVAL '221 days', '55555555-5555-5555-5555-555555555503', 10200.00, 1530.00, 11730.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '235 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00026', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999901', 'PO-2024-0126', 'RECEIVED', CURRENT_DATE - INTERVAL '205 days', CURRENT_DATE - INTERVAL '191 days', '55555555-5555-5555-5555-555555555502', 11500.00, 1725.00, 13225.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '205 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00027', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999903', 'PO-2024-0127', 'RECEIVED', CURRENT_DATE - INTERVAL '198 days', CURRENT_DATE - INTERVAL '184 days', '55555555-5555-5555-5555-555555555503', 7500.00, 1125.00, 8625.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '198 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00028', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999902', 'PO-2024-0128', 'RECEIVED', CURRENT_DATE - INTERVAL '175 days', CURRENT_DATE - INTERVAL '161 days', '55555555-5555-5555-5555-555555555502', 13000.00, 1950.00, 14950.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '175 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00029', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999901', 'PO-2024-0129', 'RECEIVED', CURRENT_DATE - INTERVAL '145 days', CURRENT_DATE - INTERVAL '131 days', '55555555-5555-5555-5555-555555555503', 14500.00, 2175.00, 16675.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '145 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00030', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999903', 'PO-2024-0130', 'RECEIVED', CURRENT_DATE - INTERVAL '138 days', CURRENT_DATE - INTERVAL '124 days', '55555555-5555-5555-5555-555555555502', 9800.00, 1470.00, 11270.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '138 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00031', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999902', 'PO-2024-0131', 'RECEIVED', CURRENT_DATE - INTERVAL '115 days', CURRENT_DATE - INTERVAL '101 days', '55555555-5555-5555-5555-555555555503', 16000.00, 2400.00, 18400.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '115 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00032', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999901', 'PO-2024-0132', 'RECEIVED', CURRENT_DATE - INTERVAL '85 days', CURRENT_DATE - INTERVAL '71 days', '55555555-5555-5555-5555-555555555502', 17500.00, 2625.00, 20125.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '85 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00033', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999903', 'PO-2024-0133', 'PARTIAL', CURRENT_DATE - INTERVAL '78 days', CURRENT_DATE - INTERVAL '64 days', '55555555-5555-5555-5555-555555555503', 12000.00, 1800.00, 13800.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '78 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00034', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '99999999-9999-9999-9999-999999999902', 'PO-2024-0134', 'CONFIRMED', CURRENT_DATE - INTERVAL '52 days', CURRENT_DATE - INTERVAL '38 days', '55555555-5555-5555-5555-555555555502', 19500.00, 2925.00, 22425.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '52 days'),
  ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00035', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '99999999-9999-9999-9999-999999999901', 'PO-2024-0135', 'SENT', CURRENT_DATE - INTERVAL '18 days', CURRENT_DATE - INTERVAL '4 days', '55555555-5555-5555-5555-555555555503', 21000.00, 3150.00, 24150.00, '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '18 days')
ON CONFLICT (tenant_id, po_no) DO NOTHING;

-- Additional PO Lines for GWF & PTA POs
INSERT INTO purchase_order_lines (id, tenant_id, purchase_order_id, line_no, item_id, qty_ordered, qty_received, unit_cost) VALUES
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00039', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00020', 1, '77777777-7777-7777-7777-777777777703', 80, 80, 40.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00040', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00020', 2, '77777777-7777-7777-7777-777777777706', 100, 100, 16.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00041', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021', 1, '77777777-7777-7777-7777-777777777705', 350, 350, 8.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00042', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00021', 2, '77777777-7777-7777-7777-777777777707', 200, 200, 15.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00043', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00022', 1, '77777777-7777-7777-7777-777777777702', 30, 30, 125.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00044', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00022', 2, '77777777-7777-7777-7777-777777777708', 200, 200, 20.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00045', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00023', 1, '77777777-7777-7777-7777-777777777701', 70, 70, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00046', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00023', 2, '77777777-7777-7777-7777-777777777704', 15, 15, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00047', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00024', 1, '77777777-7777-7777-7777-777777777703', 100, 100, 40.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00048', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00024', 2, '77777777-7777-7777-7777-777777777706', 125, 125, 16.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00049', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00025', 1, '77777777-7777-7777-7777-777777777702', 45, 45, 125.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00050', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00025', 2, '77777777-7777-7777-7777-777777777707', 300, 300, 15.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00051', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00026', 1, '77777777-7777-7777-7777-777777777704', 40, 40, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00052', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00026', 2, '77777777-7777-7777-7777-777777777701', 45, 45, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00053', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00027', 1, '77777777-7777-7777-7777-777777777705', 450, 450, 8.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00054', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00027', 2, '77777777-7777-7777-7777-777777777706', 200, 200, 16.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00055', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00028', 1, '77777777-7777-7777-7777-777777777704', 45, 45, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00056', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00028', 2, '77777777-7777-7777-7777-777777777708', 200, 200, 20.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00057', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00029', 1, '77777777-7777-7777-7777-777777777701', 120, 120, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00058', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00029', 2, '77777777-7777-7777-7777-777777777704', 25, 25, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00059', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00030', 1, '77777777-7777-7777-7777-777777777703', 150, 150, 40.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00060', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00030', 2, '77777777-7777-7777-7777-777777777707', 200, 200, 15.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00061', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00031', 1, '77777777-7777-7777-7777-777777777702', 70, 70, 125.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00062', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00031', 2, '77777777-7777-7777-7777-777777777708', 350, 350, 20.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00063', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00032', 1, '77777777-7777-7777-7777-777777777701', 150, 150, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00064', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00032', 2, '77777777-7777-7777-7777-777777777704', 25, 25, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00065', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00033', 1, '77777777-7777-7777-7777-777777777705', 700, 400, 8.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00066', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00033', 2, '77777777-7777-7777-7777-777777777706', 300, 175, 16.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00067', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00034', 1, '77777777-7777-7777-7777-777777777704', 65, 0, 200.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00068', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00034', 2, '77777777-7777-7777-7777-777777777702', 60, 0, 125.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00069', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00035', 1, '77777777-7777-7777-7777-777777777701', 180, 0, 80.00),
  ('d0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d00070', '11111111-1111-1111-1111-111111111111', 'c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c00035', 2, '77777777-7777-7777-7777-777777777704', 35, 0, 200.00)
ON CONFLICT DO NOTHING;

-- ================
-- Additional Historical Sales Orders for GWF & PTA (richer chart data)
-- ================
INSERT INTO sales_orders (id, tenant_id, site_id, warehouse_id, customer_id, order_no, status, priority, shipping_address_line1, shipping_city, created_by, created_at) VALUES
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00033', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888802', 'SO-2024-0133', 'DELIVERED', 5, '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '362 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00034', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888801', 'SO-2024-0134', 'DELIVERED', 3, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '328 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00035', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888805', 'SO-2024-0135', 'DELIVERED', 5, '555 Eco Park', 'Port Elizabeth', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '318 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00036', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888803', 'SO-2024-0136', 'DELIVERED', 3, '789 Commerce Street', 'Durban', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '298 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00037', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888804', 'SO-2024-0137', 'DELIVERED', 5, '321 Industrial Road', 'Pretoria', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '268 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00038', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888802', 'SO-2024-0138', 'DELIVERED', 3, '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '255 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00039', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888801', 'SO-2024-0139', 'DELIVERED', 5, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '238 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00040', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888805', 'SO-2024-0140', 'DELIVERED', 3, '555 Eco Park', 'Port Elizabeth', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '203 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00041', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888803', 'SO-2024-0141', 'DELIVERED', 5, '789 Commerce Street', 'Durban', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '192 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00042', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888804', 'SO-2024-0142', 'DELIVERED', 3, '321 Industrial Road', 'Pretoria', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '178 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00043', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888801', 'SO-2024-0143', 'SHIPPED', 5, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '148 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00044', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888805', 'SO-2024-0144', 'DELIVERED', 3, '555 Eco Park', 'Port Elizabeth', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '132 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00045', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888802', 'SO-2024-0145', 'SHIPPED', 5, '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '112 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00046', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888801', 'SO-2024-0146', 'SHIPPED', 3, '123 Business Park', 'Johannesburg', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '80 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00047', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888804', 'SO-2024-0147', 'DELIVERED', 5, '321 Industrial Road', 'Pretoria', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '68 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00048', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888803', 'SO-2024-0148', 'SHIPPED', 3, '789 Commerce Street', 'Durban', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '48 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00049', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', '88888888-8888-8888-8888-888888888805', 'SO-2024-0149', 'CONFIRMED', 5, '555 Eco Park', 'Port Elizabeth', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '22 days'),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00050', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203', '55555555-5555-5555-5555-555555555503', '88888888-8888-8888-8888-888888888802', 'SO-2024-0150', 'ALLOCATED', 3, '456 Innovation Hub', 'Cape Town', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '10 days')
ON CONFLICT (tenant_id, order_no) DO NOTHING;

-- Additional Sales Order Lines for GWF & PTA (increasing values over time)
INSERT INTO sales_order_lines (id, tenant_id, sales_order_id, line_no, item_id, qty_ordered, unit_price) VALUES
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00065', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00033', 1, '77777777-7777-7777-7777-777777777701', 20, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00066', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00033', 2, '77777777-7777-7777-7777-777777777703', 50, 49.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00067', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00034', 1, '77777777-7777-7777-7777-777777777702', 25, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00068', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00034', 2, '77777777-7777-7777-7777-777777777708', 90, 29.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00069', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00035', 1, '77777777-7777-7777-7777-777777777704', 15, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00070', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00035', 2, '77777777-7777-7777-7777-777777777707', 70, 19.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00071', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00036', 1, '77777777-7777-7777-7777-777777777701', 40, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00072', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00036', 2, '77777777-7777-7777-7777-777777777704', 15, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00073', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00037', 1, '77777777-7777-7777-7777-777777777702', 35, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00074', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00037', 2, '77777777-7777-7777-7777-777777777705', 200, 9.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00075', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00038', 1, '77777777-7777-7777-7777-777777777704', 22, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00076', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00038', 2, '77777777-7777-7777-7777-777777777706', 250, 14.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00077', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00039', 1, '77777777-7777-7777-7777-777777777704', 28, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00078', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00039', 2, '77777777-7777-7777-7777-777777777707', 130, 19.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00079', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00040', 1, '77777777-7777-7777-7777-777777777702', 45, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00080', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00040', 2, '77777777-7777-7777-7777-777777777701', 50, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00081', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00041', 1, '77777777-7777-7777-7777-777777777704', 32, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00082', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00041', 2, '77777777-7777-7777-7777-777777777708', 100, 29.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00083', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00042', 1, '77777777-7777-7777-7777-777777777701', 65, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00084', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00042', 2, '77777777-7777-7777-7777-777777777703', 95, 49.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00085', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00043', 1, '77777777-7777-7777-7777-777777777702', 55, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00086', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00043', 2, '77777777-7777-7777-7777-777777777704', 20, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00087', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00044', 1, '77777777-7777-7777-7777-777777777701', 75, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00088', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00044', 2, '77777777-7777-7777-7777-777777777706', 280, 14.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00089', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00045', 1, '77777777-7777-7777-7777-777777777704', 42, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00090', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00045', 2, '77777777-7777-7777-7777-777777777707', 220, 19.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00091', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00046', 1, '77777777-7777-7777-7777-777777777702', 70, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00092', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00046', 2, '77777777-7777-7777-7777-777777777708', 180, 29.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00093', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00047', 1, '77777777-7777-7777-7777-777777777704', 50, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00094', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00047', 2, '77777777-7777-7777-7777-777777777703', 100, 49.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00095', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00048', 1, '77777777-7777-7777-7777-777777777704', 55, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00096', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00048', 2, '77777777-7777-7777-7777-777777777701', 60, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00097', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00049', 1, '77777777-7777-7777-7777-777777777702', 80, 149.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00098', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00049', 2, '77777777-7777-7777-7777-777777777704', 45, 299.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00099', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00050', 1, '77777777-7777-7777-7777-777777777701', 120, 99.99),
  ('b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b00100', '11111111-1111-1111-1111-111111111111', 'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a00050', 2, '77777777-7777-7777-7777-777777777708', 250, 29.99)
ON CONFLICT DO NOTHING;

-- Additional Supplier NCRs (fill gaps in months)
INSERT INTO supplier_ncrs (id, tenant_id, supplier_id, ncr_no, ncr_type, status, description, created_by, created_at) VALUES
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00015', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999903', 'NCR-2024-0015', 'QUALITY', 'CLOSED', 'Shipping boxes with incorrect dimensions', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '232 days'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00016', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999902', 'NCR-2024-0016', 'DELIVERY', 'RESOLVED', 'Late delivery of USB-C cables', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '110 days'),
  ('e0e0e0e0-e0e0-e0e0-e0e0-e0e0e0e00017', '11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999901', 'NCR-2024-0017', 'DOCUMENTATION', 'IN_PROGRESS', 'Missing test certificates for Premium Widgets', '44444444-4444-4444-4444-444444444401', CURRENT_TIMESTAMP - INTERVAL '45 days')
ON CONFLICT (tenant_id, ncr_no) DO NOTHING;

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
-- Inventory in stock_snapshot (K58, GWF, PTA warehouses)
-- 55 Sales Orders (5 current + 32 historical K58-heavy + 18 historical GWF/PTA)
-- 40 Purchase Orders (5 current + 19 historical K58-heavy + 16 historical GWF/PTA)
-- 2 Pick Waves with tasks
-- 4 Shipments (various statuses, K58 site)
-- 3 Vehicles (2 K58, 1 PTA)
-- 3 Drivers (2 K58, 1 PTA)
-- 3 Dispatch Trips with stops (K58 site)
-- 2 RMAs (K58 site)
-- 2 GRNs (K58 site)
-- 17 Supplier NCRs (decreasing trend over 12 months)
