-- Manufacturing Seed Data for Synercore Holdings
-- Based on stored stock report 2026-02-26
BEGIN;

-- ============================================================
-- 1. ITEMS — Raw Materials, Finished Products, Packaging
-- ============================================================
INSERT INTO items (tenant_id, sku, description, uom, weight_kg, is_active) VALUES
-- Raw materials (from stock report)
('89fb45a9-590a-4668-a58a-3b808e1c326b','EMU-KREM-532','Emulsifier Ekomul KREM 532 XTI','KG',25,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','VIS-FHS1000','Viscotech FHS1000 Stabiliser','KG',25,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','VIS-FHS3000','Viscotech FHS3000 Stabiliser','KG',25,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','FLV-PEACH','Peach Flavouring FA003071','KG',5,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','FLV-ORANGE','Orange Flavouring FA003926','KG',5,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','SEA-SCO','Sour Cream & Onion Seasoning FT006318','KG',10,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','CUL-MW035','Culture Lyofast MW 035 TA 50UC','UC',NULL,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','CUL-Y438A','Culture LYOFAST Y 438 A 50UC','UC',NULL,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','CUL-LRB','Culture Lyofast LRB 1 Dose','DOSE',NULL,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','EMU-MG90','Emulsifier Ekomul MG 90 HP 75 (R3)','KG',25,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','SSL-SL70S','SSL Ekolite SL 70 S Futura (RSPO MB)','KG',25,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','PWD-FAT','Powder Fat (RSPO MB)','KG',25,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','DSP-ANHY','Di-Sodium Phosphate Anhydrous','KG',25,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','SHMP','Sodium Hexametaphosphate','KG',25,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','SWT-STEV','Sweetener Steviol Glycosides SG98RA97','KG',5,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','TART-ACID','Tartaric Acid','KG',25,true),
-- Finished products
('89fb45a9-590a-4668-a58a-3b808e1c326b','FP-PROC-CHD','Processed Cheese Spread 200g','EA',0.2,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','FP-YOGURT-STR','Strawberry Yogurt 500ml','EA',0.5,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','FP-YOGURT-PEA','Peach Yogurt 500ml','EA',0.5,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','FP-CREAM-CHZ','Cream Cheese 250g','EA',0.25,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','FP-SCO-SEAS','Sour Cream & Onion Seasoning Blend 500g','EA',0.5,true),
-- Packaging
('89fb45a9-590a-4668-a58a-3b808e1c326b','PKG-TUB-200','Plastic Tub 200g','EA',0.015,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','PKG-CUP-500','Yogurt Cup 500ml','EA',0.012,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','PKG-LID-FOIL','Foil Seal Lid','EA',0.003,true),
('89fb45a9-590a-4668-a58a-3b808e1c326b','PKG-CBOX-24','Carton Box 24-pack','EA',0.35,true)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. WORKSTATIONS
-- ============================================================
INSERT INTO workstations (tenant_id, site_id, code, name, description, workstation_type, capacity_per_hour, cost_per_hour, status) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','WS-MIX-01','High-Shear Mixer','Industrial high-shear mixer for emulsification','MACHINE',500,150,'ACTIVE'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','WS-MIX-02','Ribbon Blender','Dry powder ribbon blender','MACHINE',300,120,'ACTIVE'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','WS-PAST-01','Pasteuriser Line 1','HTST pasteurisation line','MACHINE',800,200,'ACTIVE'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','WS-FILL-01','Filling Line 1','Cup/tub filling and sealing','ASSEMBLY',1200,180,'ACTIVE'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','WS-FILL-02','Filling Line 2','Secondary filling line','ASSEMBLY',1000,180,'MAINTENANCE'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','WS-PKG-01','Case Packer','Automatic case packing line','PACKAGING',2000,100,'ACTIVE'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','WS-QC-01','QC Lab Station','Quality control testing station','QC',50,80,'ACTIVE')
ON CONFLICT DO NOTHING;

-- Helper function to get item id by sku
CREATE OR REPLACE FUNCTION _item(p_sku text) RETURNS uuid AS $$
  SELECT id FROM items WHERE sku = p_sku AND tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION _ws(p_code text) RETURNS uuid AS $$
  SELECT id FROM workstations WHERE code = p_code AND tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- 3. BOMs
-- ============================================================

-- BOM: Processed Cheese Spread
INSERT INTO bom_headers (tenant_id, item_id, version, revision, status, base_qty, uom, notes, approved_by, approved_at, created_by)
VALUES ('89fb45a9-590a-4668-a58a-3b808e1c326b', _item('FP-PROC-CHD'), 1, 'A', 'APPROVED', 1000, 'EA',
  'Standard processed cheese spread recipe', '912cba62-8970-4d0e-b564-d9f322826b27', now() - interval '30 days', '912cba62-8970-4d0e-b564-d9f322826b27');

INSERT INTO bom_lines (tenant_id, bom_header_id, line_no, item_id, qty_per, uom, scrap_pct, is_critical, category, notes)
SELECT '89fb45a9-590a-4668-a58a-3b808e1c326b', bh.id, v.line_no, _item(v.sku), v.qty_per, v.uom, v.scrap_pct, v.is_critical, v.category::text, v.notes
FROM bom_headers bh,
(VALUES
  (1,'EMU-MG90',50,'KG',2,false,'INGREDIENT','Emulsifier'),
  (2,'DSP-ANHY',15,'KG',1,false,'INGREDIENT','Melting salt'),
  (3,'SHMP',10,'KG',1,false,'INGREDIENT','Melting salt'),
  (4,'PWD-FAT',80,'KG',3,false,'INGREDIENT','Fat source'),
  (5,'PKG-TUB-200',1000,'EA',0,false,'PACKAGING','200g tubs'),
  (6,'PKG-LID-FOIL',1000,'EA',0,false,'PACKAGING','Foil lids'),
  (7,'PKG-CBOX-24',42,'EA',0,false,'PACKAGING','Cartons')
) AS v(line_no, sku, qty_per, uom, scrap_pct, is_critical, category, notes)
WHERE bh.item_id = _item('FP-PROC-CHD') AND bh.tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' AND bh.version = 1 AND bh.revision = 'A';

-- BOM: Peach Yogurt
INSERT INTO bom_headers (tenant_id, item_id, version, revision, status, base_qty, uom, notes, approved_by, approved_at, created_by)
VALUES ('89fb45a9-590a-4668-a58a-3b808e1c326b', _item('FP-YOGURT-PEA'), 1, 'A', 'APPROVED', 1000, 'EA',
  'Peach yogurt standard recipe', '912cba62-8970-4d0e-b564-d9f322826b27', now() - interval '30 days', '912cba62-8970-4d0e-b564-d9f322826b27');

INSERT INTO bom_lines (tenant_id, bom_header_id, line_no, item_id, qty_per, uom, scrap_pct, is_critical, category, notes)
SELECT '89fb45a9-590a-4668-a58a-3b808e1c326b', bh.id, v.line_no, _item(v.sku), v.qty_per, v.uom, v.scrap_pct, v.is_critical, v.category::text, v.notes
FROM bom_headers bh,
(VALUES
  (1,'CUL-MW035',2,'UC',0,true,'INGREDIENT','Starter culture - critical'),
  (2,'FLV-PEACH',8,'KG',2,false,'INGREDIENT','Peach flavour'),
  (3,'SWT-STEV',3,'KG',0,false,'INGREDIENT','Sweetener'),
  (4,'VIS-FHS1000',12,'KG',0,false,'INGREDIENT','Stabiliser'),
  (5,'PKG-CUP-500',1000,'EA',0,false,'PACKAGING','500ml cups'),
  (6,'PKG-LID-FOIL',1000,'EA',0,false,'PACKAGING','Foil lids'),
  (7,'PKG-CBOX-24',42,'EA',0,false,'PACKAGING','Cartons')
) AS v(line_no, sku, qty_per, uom, scrap_pct, is_critical, category, notes)
WHERE bh.item_id = _item('FP-YOGURT-PEA') AND bh.tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' AND bh.version = 1 AND bh.revision = 'A';

-- BOM: Sour Cream & Onion Seasoning
INSERT INTO bom_headers (tenant_id, item_id, version, revision, status, base_qty, uom, notes, approved_by, approved_at, created_by)
VALUES ('89fb45a9-590a-4668-a58a-3b808e1c326b', _item('FP-SCO-SEAS'), 1, 'A', 'APPROVED', 500, 'EA',
  'SC&O seasoning blend recipe', '912cba62-8970-4d0e-b564-d9f322826b27', now() - interval '30 days', '912cba62-8970-4d0e-b564-d9f322826b27');

INSERT INTO bom_lines (tenant_id, bom_header_id, line_no, item_id, qty_per, uom, scrap_pct, is_critical, category, notes)
SELECT '89fb45a9-590a-4668-a58a-3b808e1c326b', bh.id, v.line_no, _item(v.sku), v.qty_per, v.uom, v.scrap_pct, v.is_critical, v.category::text, v.notes
FROM bom_headers bh,
(VALUES
  (1,'SEA-SCO',200,'KG',5,false,'INGREDIENT','Base seasoning'),
  (2,'VIS-FHS3000',15,'KG',0,false,'INGREDIENT','Stabiliser'),
  (3,'TART-ACID',5,'KG',0,false,'INGREDIENT','Acidity regulator'),
  (4,'PKG-TUB-200',500,'EA',0,false,'PACKAGING','200g tubs'),
  (5,'PKG-CBOX-24',21,'EA',0,false,'PACKAGING','Cartons')
) AS v(line_no, sku, qty_per, uom, scrap_pct, is_critical, category, notes)
WHERE bh.item_id = _item('FP-SCO-SEAS') AND bh.tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' AND bh.version = 1 AND bh.revision = 'A';

-- ============================================================
-- 4. ROUTINGS
-- ============================================================

-- Routing: Processed Cheese Spread
INSERT INTO routings (tenant_id, item_id, version, status, notes, approved_by, approved_at, created_by)
VALUES ('89fb45a9-590a-4668-a58a-3b808e1c326b', _item('FP-PROC-CHD'), 1, 'APPROVED',
  'Standard cheese processing route', '912cba62-8970-4d0e-b564-d9f322826b27', now() - interval '30 days', '912cba62-8970-4d0e-b564-d9f322826b27');

INSERT INTO routing_operations (tenant_id, routing_id, operation_no, name, description, workstation_id, setup_time_mins, run_time_mins, queue_time_mins, overlap_pct, is_subcontracted)
SELECT '89fb45a9-590a-4668-a58a-3b808e1c326b', r.id, v.op_no, v.name, v.descr, _ws(v.ws_code), v.setup, v.run, v.queue, 0, false
FROM routings r,
(VALUES
  (10,'Weighing & Batching','Weigh and batch all ingredients','WS-MIX-01',15,30,5),
  (20,'Mixing & Emulsification','High-shear mixing for emulsion','WS-MIX-01',10,45,10),
  (30,'Pasteurisation','HTST pasteurisation at 85°C','WS-PAST-01',20,60,15),
  (40,'Filling & Sealing','Fill tubs and apply foil seal','WS-FILL-01',15,40,5),
  (50,'Case Packing','Pack into cartons of 24','WS-PKG-01',10,20,5),
  (60,'QC Inspection','Final quality check and release','WS-QC-01',5,30,0)
) AS v(op_no, name, descr, ws_code, setup, run, queue)
WHERE r.item_id = _item('FP-PROC-CHD') AND r.tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' AND r.version = 1;

-- Routing: Peach Yogurt
INSERT INTO routings (tenant_id, item_id, version, status, notes, approved_by, approved_at, created_by)
VALUES ('89fb45a9-590a-4668-a58a-3b808e1c326b', _item('FP-YOGURT-PEA'), 1, 'APPROVED',
  'Peach yogurt production route', '912cba62-8970-4d0e-b564-d9f322826b27', now() - interval '30 days', '912cba62-8970-4d0e-b564-d9f322826b27');

INSERT INTO routing_operations (tenant_id, routing_id, operation_no, name, description, workstation_id, setup_time_mins, run_time_mins, queue_time_mins, overlap_pct, is_subcontracted)
SELECT '89fb45a9-590a-4668-a58a-3b808e1c326b', r.id, v.op_no, v.name, v.descr, _ws(v.ws_code), v.setup, v.run, v.queue, 0, false
FROM routings r,
(VALUES
  (10,'Culture Preparation','Prepare starter culture','WS-MIX-02',20,30,10),
  (20,'Blending & Flavouring','Blend base with flavour and sweetener','WS-MIX-01',10,35,5),
  (30,'Pasteurisation','HTST pasteurisation','WS-PAST-01',20,55,15),
  (40,'Filling','Fill cups and seal','WS-FILL-01',15,50,5),
  (50,'Case Packing','Pack into cartons','WS-PKG-01',10,25,5)
) AS v(op_no, name, descr, ws_code, setup, run, queue)
WHERE r.item_id = _item('FP-YOGURT-PEA') AND r.tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' AND r.version = 1;

-- Routing: SC&O Seasoning
INSERT INTO routings (tenant_id, item_id, version, status, notes, approved_by, approved_at, created_by)
VALUES ('89fb45a9-590a-4668-a58a-3b808e1c326b', _item('FP-SCO-SEAS'), 1, 'APPROVED',
  'Seasoning blend production route', '912cba62-8970-4d0e-b564-d9f322826b27', now() - interval '30 days', '912cba62-8970-4d0e-b564-d9f322826b27');

INSERT INTO routing_operations (tenant_id, routing_id, operation_no, name, description, workstation_id, setup_time_mins, run_time_mins, queue_time_mins, overlap_pct, is_subcontracted)
SELECT '89fb45a9-590a-4668-a58a-3b808e1c326b', r.id, v.op_no, v.name, v.descr, _ws(v.ws_code), v.setup, v.run, v.queue, 0, false
FROM routings r,
(VALUES
  (10,'Weighing & Batching','Weigh dry ingredients','WS-MIX-02',10,20,5),
  (20,'Blending','Ribbon blending of seasoning','WS-MIX-01',10,40,10),
  (30,'Filling & Packing','Fill tubs and pack','WS-FILL-01',15,35,5),
  (40,'QC Sampling','Quality check and release','WS-QC-01',5,20,0)
) AS v(op_no, name, descr, ws_code, setup, run, queue)
WHERE r.item_id = _item('FP-SCO-SEAS') AND r.tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' AND r.version = 1;

-- ============================================================
-- 5. WORK ORDERS (12)
-- ============================================================

-- Helper to get BOM header
CREATE OR REPLACE FUNCTION _bom(p_sku text) RETURNS uuid AS $$
  SELECT bh.id FROM bom_headers bh WHERE bh.item_id = _item(p_sku) AND bh.tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' AND bh.status = 'APPROVED' ORDER BY bh.version DESC LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION _routing(p_sku text) RETURNS uuid AS $$
  SELECT r.id FROM routings r WHERE r.item_id = _item(p_sku) AND r.tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' AND r.status = 'APPROVED' ORDER BY r.version DESC LIMIT 1;
$$ LANGUAGE sql STABLE;

INSERT INTO work_orders (tenant_id, site_id, warehouse_id, work_order_no, item_id, bom_header_id, routing_id, status, priority, qty_ordered, qty_completed, qty_scrapped, planned_start, planned_end, actual_start, actual_end, batch_no, notes, created_by) VALUES
-- COMPLETED
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000010',_item('FP-PROC-CHD'),_bom('FP-PROC-CHD'),_routing('FP-PROC-CHD'),'COMPLETED',2,2000,1960,40,'2026-01-28','2026-02-01','2026-01-28','2026-02-01','BATCH-20260128-001','Processed cheese batch Jan','912cba62-8970-4d0e-b564-d9f322826b27'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000011',_item('FP-YOGURT-PEA'),_bom('FP-YOGURT-PEA'),_routing('FP-YOGURT-PEA'),'COMPLETED',2,3000,2940,60,'2026-02-01','2026-02-05','2026-02-01','2026-02-05','BATCH-20260201-001','Peach yogurt batch','912cba62-8970-4d0e-b564-d9f322826b27'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000012',_item('FP-SCO-SEAS'),_bom('FP-SCO-SEAS'),_routing('FP-SCO-SEAS'),'COMPLETED',3,1000,980,20,'2026-02-05','2026-02-08','2026-02-05','2026-02-08','BATCH-20260205-001','Seasoning blend batch','912cba62-8970-4d0e-b564-d9f322826b27'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000013',_item('FP-PROC-CHD'),_bom('FP-PROC-CHD'),_routing('FP-PROC-CHD'),'COMPLETED',2,2500,2450,50,'2026-02-08','2026-02-12','2026-02-08','2026-02-12','BATCH-20260208-001','Cheese batch Feb-2','912cba62-8970-4d0e-b564-d9f322826b27'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000014',_item('FP-YOGURT-PEA'),_bom('FP-YOGURT-PEA'),_routing('FP-YOGURT-PEA'),'COMPLETED',1,4000,3920,80,'2026-02-12','2026-02-16','2026-02-12','2026-02-16','BATCH-20260212-001','Yogurt large batch','912cba62-8970-4d0e-b564-d9f322826b27'),
-- IN_PROGRESS
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000015',_item('FP-PROC-CHD'),_bom('FP-PROC-CHD'),_routing('FP-PROC-CHD'),'IN_PROGRESS',1,3000,1800,30,'2026-02-18','2026-02-22','2026-02-18',NULL,'BATCH-20260218-001','Cheese batch current','912cba62-8970-4d0e-b564-d9f322826b27'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000016',_item('FP-SCO-SEAS'),_bom('FP-SCO-SEAS'),_routing('FP-SCO-SEAS'),'IN_PROGRESS',2,1500,600,15,'2026-02-19','2026-02-24','2026-02-19',NULL,'BATCH-20260219-001','Seasoning current batch','912cba62-8970-4d0e-b564-d9f322826b27'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000017',_item('FP-YOGURT-PEA'),_bom('FP-YOGURT-PEA'),_routing('FP-YOGURT-PEA'),'IN_PROGRESS',1,5000,2500,50,'2026-02-20','2026-02-26','2026-02-20',NULL,'BATCH-20260220-001','Yogurt large batch current','912cba62-8970-4d0e-b564-d9f322826b27'),
-- RELEASED
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000018',_item('FP-PROC-CHD'),_bom('FP-PROC-CHD'),_routing('FP-PROC-CHD'),'RELEASED',2,2000,0,0,'2026-02-25','2026-03-01',NULL,NULL,'BATCH-20260225-001','Next cheese batch','912cba62-8970-4d0e-b564-d9f322826b27'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000019',_item('FP-YOGURT-PEA'),_bom('FP-YOGURT-PEA'),_routing('FP-YOGURT-PEA'),'RELEASED',2,3000,0,0,'2026-02-27','2026-03-03',NULL,NULL,'BATCH-20260227-001','Next yogurt batch','912cba62-8970-4d0e-b564-d9f322826b27'),
-- DRAFT
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000020',_item('FP-SCO-SEAS'),_bom('FP-SCO-SEAS'),_routing('FP-SCO-SEAS'),'DRAFT',3,2000,0,0,'2026-03-02','2026-03-06',NULL,NULL,NULL,'Planning seasoning batch','912cba62-8970-4d0e-b564-d9f322826b27'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','4cfc43b4-ba85-4d1c-b652-83e888b8cab1','69a8665d-70a4-4470-896b-09d9cb06a113','WO-000021',_item('FP-CREAM-CHZ'),NULL,NULL,'DRAFT',3,1000,0,0,'2026-03-05','2026-03-09',NULL,NULL,NULL,'Planning cream cheese batch','912cba62-8970-4d0e-b564-d9f322826b27')
ON CONFLICT DO NOTHING;

-- Helper to get WO id
CREATE OR REPLACE FUNCTION _wo(p_no text) RETURNS uuid AS $$
  SELECT id FROM work_orders WHERE work_order_no = p_no AND tenant_id = '89fb45a9-590a-4668-a58a-3b808e1c326b' LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- 6. WORK ORDER MATERIALS (for active WOs: 15-19)
-- ============================================================

-- WO-000015 (Cheese 3000 units, scale = 3x from base 1000): partially issued
INSERT INTO work_order_materials (tenant_id, work_order_id, item_id, qty_required, qty_issued, qty_returned, status) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),_item('EMU-MG90'),150,150,0,'ISSUED'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),_item('DSP-ANHY'),45,45,0,'ISSUED'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),_item('SHMP'),30,20,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),_item('PWD-FAT'),240,240,0,'ISSUED'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),_item('PKG-TUB-200'),3000,1800,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),_item('PKG-LID-FOIL'),3000,1800,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),_item('PKG-CBOX-24'),126,75,0,'PARTIAL');

-- WO-000016 (Seasoning 1500 units, scale=3x from 500)
INSERT INTO work_order_materials (tenant_id, work_order_id, item_id, qty_required, qty_issued, qty_returned, status) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),_item('SEA-SCO'),600,400,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),_item('VIS-FHS3000'),45,30,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),_item('TART-ACID'),15,15,0,'ISSUED'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),_item('PKG-TUB-200'),1500,600,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),_item('PKG-CBOX-24'),63,25,0,'PARTIAL');

-- WO-000017 (Yogurt 5000 units, scale=5x from 1000)
INSERT INTO work_order_materials (tenant_id, work_order_id, item_id, qty_required, qty_issued, qty_returned, status) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),_item('CUL-MW035'),10,10,0,'ISSUED'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),_item('FLV-PEACH'),40,25,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),_item('SWT-STEV'),15,10,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),_item('VIS-FHS1000'),60,35,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),_item('PKG-CUP-500'),5000,2500,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),_item('PKG-LID-FOIL'),5000,2500,0,'PARTIAL'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),_item('PKG-CBOX-24'),210,105,0,'PARTIAL');

-- WO-000018 (Cheese RELEASED, scale=2x) - all pending
INSERT INTO work_order_materials (tenant_id, work_order_id, item_id, qty_required, qty_issued, qty_returned, status) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),_item('EMU-MG90'),100,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),_item('DSP-ANHY'),30,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),_item('SHMP'),20,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),_item('PWD-FAT'),160,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),_item('PKG-TUB-200'),2000,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),_item('PKG-LID-FOIL'),2000,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),_item('PKG-CBOX-24'),84,0,0,'PENDING');

-- WO-000019 (Yogurt RELEASED, scale=3x) - all pending
INSERT INTO work_order_materials (tenant_id, work_order_id, item_id, qty_required, qty_issued, qty_returned, status) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),_item('CUL-MW035'),6,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),_item('FLV-PEACH'),24,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),_item('SWT-STEV'),9,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),_item('VIS-FHS1000'),36,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),_item('PKG-CUP-500'),3000,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),_item('PKG-LID-FOIL'),3000,0,0,'PENDING'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),_item('PKG-CBOX-24'),126,0,0,'PENDING');

-- ============================================================
-- 7. WORK ORDER OPERATIONS (for IN_PROGRESS and RELEASED WOs)
-- ============================================================

-- WO-000015 (Cheese IN_PROGRESS): ops 1-3 COMPLETED, op 4 IN_PROGRESS, ops 5-6 PENDING
INSERT INTO work_order_operations (tenant_id, work_order_id, operation_no, name, workstation_id, status, planned_start, planned_end, actual_start, actual_end, qty_completed, qty_scrapped, run_time_actual) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),10,'Weighing & Batching',_ws('WS-MIX-01'),'COMPLETED','2026-02-18','2026-02-18','2026-02-18','2026-02-18',3000,0,35),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),20,'Mixing & Emulsification',_ws('WS-MIX-01'),'COMPLETED','2026-02-18','2026-02-19','2026-02-18','2026-02-19',3000,10,50),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),30,'Pasteurisation',_ws('WS-PAST-01'),'COMPLETED','2026-02-19','2026-02-20','2026-02-19','2026-02-20',2990,20,65),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),40,'Filling & Sealing',_ws('WS-FILL-01'),'IN_PROGRESS','2026-02-20','2026-02-21','2026-02-20',NULL,1800,0,NULL),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),50,'Case Packing',_ws('WS-PKG-01'),'PENDING','2026-02-21','2026-02-22',NULL,NULL,0,0,NULL),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),60,'QC Inspection',_ws('WS-QC-01'),'PENDING','2026-02-22','2026-02-22',NULL,NULL,0,0,NULL);

-- WO-000016 (Seasoning IN_PROGRESS): ops 1-2 COMPLETED, op 3 IN_PROGRESS, op 4 PENDING
INSERT INTO work_order_operations (tenant_id, work_order_id, operation_no, name, workstation_id, status, planned_start, planned_end, actual_start, actual_end, qty_completed, qty_scrapped, run_time_actual) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),10,'Weighing & Batching',_ws('WS-MIX-02'),'COMPLETED','2026-02-19','2026-02-19','2026-02-19','2026-02-19',1500,0,25),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),20,'Blending',_ws('WS-MIX-01'),'COMPLETED','2026-02-19','2026-02-20','2026-02-19','2026-02-20',1500,15,45),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),30,'Filling & Packing',_ws('WS-FILL-01'),'IN_PROGRESS','2026-02-20','2026-02-23','2026-02-20',NULL,600,0,NULL),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),40,'QC Sampling',_ws('WS-QC-01'),'PENDING','2026-02-23','2026-02-24',NULL,NULL,0,0,NULL);

-- WO-000017 (Yogurt IN_PROGRESS): ops 1-2 COMPLETED, op 3 IN_PROGRESS, ops 4-5 PENDING
INSERT INTO work_order_operations (tenant_id, work_order_id, operation_no, name, workstation_id, status, planned_start, planned_end, actual_start, actual_end, qty_completed, qty_scrapped, run_time_actual) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),10,'Culture Preparation',_ws('WS-MIX-02'),'COMPLETED','2026-02-20','2026-02-20','2026-02-20','2026-02-20',5000,0,35),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),20,'Blending & Flavouring',_ws('WS-MIX-01'),'COMPLETED','2026-02-20','2026-02-21','2026-02-20','2026-02-21',5000,50,40),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),30,'Pasteurisation',_ws('WS-PAST-01'),'IN_PROGRESS','2026-02-21','2026-02-23','2026-02-21',NULL,2500,0,NULL),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),40,'Filling',_ws('WS-FILL-01'),'PENDING','2026-02-23','2026-02-25',NULL,NULL,0,0,NULL),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),50,'Case Packing',_ws('WS-PKG-01'),'PENDING','2026-02-25','2026-02-26',NULL,NULL,0,0,NULL);

-- WO-000018 (Cheese RELEASED): all READY
INSERT INTO work_order_operations (tenant_id, work_order_id, operation_no, name, workstation_id, status, planned_start, planned_end) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),10,'Weighing & Batching',_ws('WS-MIX-01'),'READY','2026-02-25','2026-02-25'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),20,'Mixing & Emulsification',_ws('WS-MIX-01'),'PENDING','2026-02-25','2026-02-26'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),30,'Pasteurisation',_ws('WS-PAST-01'),'PENDING','2026-02-26','2026-02-27'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),40,'Filling & Sealing',_ws('WS-FILL-01'),'PENDING','2026-02-27','2026-02-28'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),50,'Case Packing',_ws('WS-PKG-01'),'PENDING','2026-02-28','2026-03-01'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000018'),60,'QC Inspection',_ws('WS-QC-01'),'PENDING','2026-03-01','2026-03-01');

-- WO-000019 (Yogurt RELEASED): first op READY, rest PENDING
INSERT INTO work_order_operations (tenant_id, work_order_id, operation_no, name, workstation_id, status, planned_start, planned_end) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),10,'Culture Preparation',_ws('WS-MIX-02'),'READY','2026-02-27','2026-02-27'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),20,'Blending & Flavouring',_ws('WS-MIX-01'),'PENDING','2026-02-27','2026-02-28'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),30,'Pasteurisation',_ws('WS-PAST-01'),'PENDING','2026-02-28','2026-03-01'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),40,'Filling',_ws('WS-FILL-01'),'PENDING','2026-03-01','2026-03-02'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000019'),50,'Case Packing',_ws('WS-PKG-01'),'PENDING','2026-03-02','2026-03-03');

-- ============================================================
-- 8. PRODUCTION LEDGER — spread over 30 days
-- ============================================================

-- WO-000010 (Cheese COMPLETED Jan 28 - Feb 01)
INSERT INTO production_ledger (tenant_id, work_order_id, entry_type, item_id, warehouse_id, bin_id, batch_no, qty, uom, created_by, created_at) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000010'),'MATERIAL_ISSUE',_item('EMU-MG90'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260128-001',100,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-01-28 08:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000010'),'MATERIAL_ISSUE',_item('PWD-FAT'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260128-002',160,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-01-28 08:30:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000010'),'MATERIAL_ISSUE',_item('DSP-ANHY'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260128-003',30,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-01-28 09:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000010'),'PRODUCTION_OUTPUT',_item('FP-PROC-CHD'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260128-001',980,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-01-30 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000010'),'PRODUCTION_OUTPUT',_item('FP-PROC-CHD'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260128-001',980,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-01-31 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000010'),'SCRAP',_item('FP-PROC-CHD'),'69a8665d-70a4-4470-896b-09d9cb06a113',NULL,NULL,40,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-01 10:00:00'),

-- WO-000011 (Yogurt COMPLETED Feb 01 - Feb 05)
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000011'),'MATERIAL_ISSUE',_item('CUL-MW035'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260201-001',6,'UC','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-01 07:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000011'),'MATERIAL_ISSUE',_item('FLV-PEACH'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260201-002',24,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-01 07:30:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000011'),'MATERIAL_ISSUE',_item('VIS-FHS1000'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260201-003',36,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-01 08:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000011'),'PRODUCTION_OUTPUT',_item('FP-YOGURT-PEA'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260201-001',1470,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-03 15:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000011'),'PRODUCTION_OUTPUT',_item('FP-YOGURT-PEA'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260201-001',1470,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-04 15:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000011'),'SCRAP',_item('FP-YOGURT-PEA'),'69a8665d-70a4-4470-896b-09d9cb06a113',NULL,NULL,60,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-05 10:00:00'),

-- WO-000012 (Seasoning COMPLETED Feb 05 - Feb 08)
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000012'),'MATERIAL_ISSUE',_item('SEA-SCO'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260205-001',400,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-05 08:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000012'),'MATERIAL_ISSUE',_item('VIS-FHS3000'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260205-002',30,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-05 08:30:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000012'),'PRODUCTION_OUTPUT',_item('FP-SCO-SEAS'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260205-001',980,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-07 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000012'),'SCRAP',_item('FP-SCO-SEAS'),'69a8665d-70a4-4470-896b-09d9cb06a113',NULL,NULL,20,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-08 09:00:00'),

-- WO-000013 (Cheese COMPLETED Feb 08 - Feb 12)
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000013'),'MATERIAL_ISSUE',_item('EMU-MG90'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260208-001',125,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-08 08:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000013'),'MATERIAL_ISSUE',_item('PWD-FAT'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260208-002',200,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-08 09:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000013'),'PRODUCTION_OUTPUT',_item('FP-PROC-CHD'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260208-001',1200,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-10 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000013'),'PRODUCTION_OUTPUT',_item('FP-PROC-CHD'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260208-001',1250,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-11 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000013'),'SCRAP',_item('FP-PROC-CHD'),'69a8665d-70a4-4470-896b-09d9cb06a113',NULL,NULL,50,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-12 10:00:00'),

-- WO-000014 (Yogurt COMPLETED Feb 12 - Feb 16)
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000014'),'MATERIAL_ISSUE',_item('CUL-MW035'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260212-001',8,'UC','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-12 07:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000014'),'MATERIAL_ISSUE',_item('FLV-PEACH'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260212-002',32,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-12 08:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000014'),'PRODUCTION_OUTPUT',_item('FP-YOGURT-PEA'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260212-001',1950,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-14 15:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000014'),'PRODUCTION_OUTPUT',_item('FP-YOGURT-PEA'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260212-001',1970,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-15 15:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000014'),'SCRAP',_item('FP-YOGURT-PEA'),'69a8665d-70a4-4470-896b-09d9cb06a113',NULL,NULL,80,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-16 10:00:00'),

-- WO-000015 (Cheese IN_PROGRESS Feb 18+)
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),'MATERIAL_ISSUE',_item('EMU-MG90'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260218-001',150,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-18 08:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),'MATERIAL_ISSUE',_item('PWD-FAT'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260218-002',240,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-18 09:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),'PRODUCTION_OUTPUT',_item('FP-PROC-CHD'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260218-001',900,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-20 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),'PRODUCTION_OUTPUT',_item('FP-PROC-CHD'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260218-001',900,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-21 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),'SCRAP',_item('FP-PROC-CHD'),'69a8665d-70a4-4470-896b-09d9cb06a113',NULL,NULL,30,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-21 16:00:00'),

-- WO-000016 (Seasoning IN_PROGRESS Feb 19+)
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),'MATERIAL_ISSUE',_item('SEA-SCO'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260219-001',400,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-19 08:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),'PRODUCTION_OUTPUT',_item('FP-SCO-SEAS'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260219-001',600,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-22 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000016'),'SCRAP',_item('FP-SCO-SEAS'),'69a8665d-70a4-4470-896b-09d9cb06a113',NULL,NULL,15,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-22 16:00:00'),

-- WO-000017 (Yogurt IN_PROGRESS Feb 20+)
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),'MATERIAL_ISSUE',_item('CUL-MW035'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260220-001',10,'UC','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-20 07:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),'MATERIAL_ISSUE',_item('FLV-PEACH'),'69a8665d-70a4-4470-896b-09d9cb06a113','f3177457-9e9b-43e1-935b-80ccd69901c2','RM-20260220-002',25,'KG','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-20 08:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),'PRODUCTION_OUTPUT',_item('FP-YOGURT-PEA'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260220-001',1200,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-23 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),'PRODUCTION_OUTPUT',_item('FP-YOGURT-PEA'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260220-001',1300,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-25 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),'SCRAP',_item('FP-YOGURT-PEA'),'69a8665d-70a4-4470-896b-09d9cb06a113',NULL,NULL,50,'EA','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-25 16:00:00'),
-- Today's production (uses CURRENT_DATE so dashboard todayOutput always has data)
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),'PRODUCTION_OUTPUT',_item('FP-CHEESE-PROC'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260218-001',450,'EA','912cba62-8970-4d0e-b564-d9f322826b27',CURRENT_DATE + interval '8 hours'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000017'),'PRODUCTION_OUTPUT',_item('FP-YOGURT-PEA'),'69a8665d-70a4-4470-896b-09d9cb06a113','51ad73c7-3885-4b7a-b86a-1183462eee6e','BATCH-20260220-001',350,'EA','912cba62-8970-4d0e-b564-d9f322826b27',CURRENT_DATE + interval '10 hours'),
('89fb45a9-590a-4668-a58a-3b808e1c326b',_wo('WO-000015'),'SCRAP',_item('FP-CHEESE-PROC'),'69a8665d-70a4-4470-896b-09d9cb06a113',NULL,NULL,15,'EA','912cba62-8970-4d0e-b564-d9f322826b27',CURRENT_DATE + interval '11 hours');

-- ============================================================
-- 9. STOCK SNAPSHOT for MRP (raw materials availability)
-- ============================================================
INSERT INTO stock_snapshot (tenant_id, bin_id, item_id, batch_no, qty_on_hand, qty_reserved) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('EMU-MG90'),'ECOLEX-2026-0115',5000,500),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('DSP-ANHY'),'DSP-2026-0201',8000,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('SHMP'),'SHMP-2026-0118',3000,2500),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('PWD-FAT'),'PF-2026-0205',20000,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('VIS-FHS1000'),'VT-FHS1-2026-0210',10000,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('VIS-FHS3000'),'VT-FHS3-2026-0128',1200,1000),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('FLV-PEACH'),'FP-2026-0215',200,50),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('SWT-STEV'),'SG98-2026-0120',150,100),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('CUL-MW035'),'MW035-2026-0218',20,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('SEA-SCO'),'SCO-2026-0201',500,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('TART-ACID'),'TA-2026-0210',2000,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('EMU-KREM-532'),'EK532-2026-0205',12500,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','f3177457-9e9b-43e1-935b-80ccd69901c2',_item('SSL-SL70S'),'SL70-2026-0208',22000,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','51ad73c7-3885-4b7a-b86a-1183462eee6e',_item('PKG-TUB-200'),'TUB200-2026-0215',50000,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','51ad73c7-3885-4b7a-b86a-1183462eee6e',_item('PKG-CUP-500'),'CUP500-2026-0215',40000,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','51ad73c7-3885-4b7a-b86a-1183462eee6e',_item('PKG-LID-FOIL'),'FOIL-2026-0215',80000,0),
('89fb45a9-590a-4668-a58a-3b808e1c326b','51ad73c7-3885-4b7a-b86a-1183462eee6e',_item('PKG-CBOX-24'),'CBOX24-2026-0215',5000,0);

-- ============================================================
-- 10. NON-CONFORMANCES
-- ============================================================
INSERT INTO non_conformances (tenant_id, nc_no, work_order_id, item_id, reported_by, defect_type, severity, description, qty_affected, disposition, corrective_action, status, resolved_by, resolved_at, created_at) VALUES
('89fb45a9-590a-4668-a58a-3b808e1c326b','NC-000001',_wo('WO-000015'),_item('FP-PROC-CHD'),'181a0b7f-fa27-49af-8afd-43c82ff6e0b9','CONTAMINATION','MAJOR','Foreign particles detected in batch during QC inspection. Metal detector triggered on filling line. Production halted for investigation.',50,NULL,NULL,'OPEN',NULL,NULL,'2026-02-21 11:30:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','NC-000002',_wo('WO-000011'),_item('FP-YOGURT-PEA'),'912cba62-8970-4d0e-b564-d9f322826b27','VISUAL','MINOR','Label misalignment on approximately 120 cups in completed batch. Labels shifted 3mm to the left. Product still within spec but cosmetically imperfect.',120,NULL,NULL,'UNDER_REVIEW',NULL,NULL,'2026-02-06 09:15:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','NC-000003',_wo('WO-000013'),_item('FP-PROC-CHD'),'181a0b7f-fa27-49af-8afd-43c82ff6e0b9','FUNCTIONAL','CRITICAL','pH reading out of specification (6.2 vs target 5.6-5.8) on 200 tubs. Emulsification incomplete due to temperature deviation during processing.',200,'REWORK','Product reworked through pasteuriser at higher temperature. Root cause identified as thermocouple calibration drift on pasteuriser line. Thermocouple replaced and calibration schedule updated from quarterly to monthly.','RESOLVED','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-14 16:00:00','2026-02-12 14:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','NC-000004',_wo('WO-000012'),_item('FP-SCO-SEAS'),'912cba62-8970-4d0e-b564-d9f322826b27','PACKAGING','MINOR','Minor cosmetic defect on 30 carton boxes - printing smudged on batch code area. Product quality unaffected. Cartons still legible.',30,'USE_AS_IS','Packaging supplier (Mpact) notified of print quality issue. Replacement cartons ordered for next batch. Issue isolated to single print run.','CLOSED','912cba62-8970-4d0e-b564-d9f322826b27','2026-02-10 10:00:00','2026-02-09 08:00:00'),
('89fb45a9-590a-4668-a58a-3b808e1c326b','NC-000005',NULL,_item('EMU-MG90'),'181a0b7f-fa27-49af-8afd-43c82ff6e0b9','MATERIAL','MAJOR','Incoming raw material sample failed viscosity test. Supplier batch ECOLEX-2026-0218. Expected viscosity 450-550 cP, measured 680 cP. Material quarantined in QC-01 pending further testing and supplier response.',500,NULL,NULL,'OPEN',NULL,NULL,'2026-02-24 10:45:00');

-- ============================================================
-- Cleanup helper functions
-- ============================================================
DROP FUNCTION IF EXISTS _item(text);
DROP FUNCTION IF EXISTS _ws(text);
DROP FUNCTION IF EXISTS _bom(text);
DROP FUNCTION IF EXISTS _routing(text);
DROP FUNCTION IF EXISTS _wo(text);

COMMIT;
