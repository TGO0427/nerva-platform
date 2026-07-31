-- Migration: Import Shipment Landed Cost Fields
--
-- The Import Schedule pages actually in use (apps/web app/(dashboard)/import-schedule)
-- are backed by this database's import_shipments/import_shipment_lines tables,
-- which today track shipment/customs workflow only -- no cost fields at all.
-- (A separate, independently-deployed "apps/import-schedule" app has its own
-- database with rich landed-cost tracking, but it isn't what these screens
-- use -- out of scope here, confirmed with user.)
--
-- Adds simple, independently-settable cost fields per shipment line rather
-- than an auto-apportioned costing engine -- matches "operational visibility,
-- not a full accounting system." All nullable/additive.

BEGIN;

ALTER TABLE import_shipment_lines ADD COLUMN IF NOT EXISTS unit_cost numeric(18,6);
ALTER TABLE import_shipment_lines ADD COLUMN IF NOT EXISTS freight_cost numeric(18,6);
ALTER TABLE import_shipment_lines ADD COLUMN IF NOT EXISTS duty_cost numeric(18,6);
ALTER TABLE import_shipment_lines ADD COLUMN IF NOT EXISTS clearing_cost numeric(18,6);
ALTER TABLE import_shipment_lines ADD COLUMN IF NOT EXISTS landed_cost numeric(18,6);

COMMIT;
