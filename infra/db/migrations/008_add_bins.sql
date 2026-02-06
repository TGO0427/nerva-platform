-- Migration: Add bins for each warehouse
-- Creates standard bin locations for picking

BEGIN;

-- Helper function to get warehouse ID by code
-- Add bins for K58 warehouse
INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'A-01-01', 'PICK', 'A', '01', '01'
FROM warehouses w WHERE w.code = 'WH-K58'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'A-01-01');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'A-01-02', 'PICK', 'A', '01', '02'
FROM warehouses w WHERE w.code = 'WH-K58'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'A-01-02');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'A-02-01', 'PICK', 'A', '02', '01'
FROM warehouses w WHERE w.code = 'WH-K58'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'A-02-01');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'B-01-01', 'BULK', 'B', '01', '01'
FROM warehouses w WHERE w.code = 'WH-K58'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'B-01-01');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'RECV-01', 'RECEIVING', 'R', '01', '01'
FROM warehouses w WHERE w.code = 'WH-K58'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'RECV-01');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'SHIP-01', 'SHIPPING', 'S', '01', '01'
FROM warehouses w WHERE w.code = 'WH-K58'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'SHIP-01');

-- Add bins for GWF warehouse
INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'A-01-01', 'PICK', 'A', '01', '01'
FROM warehouses w WHERE w.code = 'WH-GWF'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'A-01-01');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'A-01-02', 'PICK', 'A', '01', '02'
FROM warehouses w WHERE w.code = 'WH-GWF'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'A-01-02');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'B-01-01', 'BULK', 'B', '01', '01'
FROM warehouses w WHERE w.code = 'WH-GWF'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'B-01-01');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'RECV-01', 'RECEIVING', 'R', '01', '01'
FROM warehouses w WHERE w.code = 'WH-GWF'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'RECV-01');

-- Add bins for PTA warehouse
INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'A-01-01', 'PICK', 'A', '01', '01'
FROM warehouses w WHERE w.code = 'WH-PTA'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'A-01-01');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'A-01-02', 'PICK', 'A', '01', '02'
FROM warehouses w WHERE w.code = 'WH-PTA'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'A-01-02');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'B-01-01', 'BULK', 'B', '01', '01'
FROM warehouses w WHERE w.code = 'WH-PTA'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'B-01-01');

INSERT INTO bins (tenant_id, warehouse_id, code, bin_type, aisle, rack, level)
SELECT w.tenant_id, w.id, 'RECV-01', 'RECEIVING', 'R', '01', '01'
FROM warehouses w WHERE w.code = 'WH-PTA'
AND NOT EXISTS (SELECT 1 FROM bins b WHERE b.warehouse_id = w.id AND b.code = 'RECV-01');

COMMIT;
