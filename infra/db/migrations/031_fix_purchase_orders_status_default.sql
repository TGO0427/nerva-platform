-- purchase_orders.status had drifted to DEFAULT 'OPEN' on at least one live
-- database (likely a manual ALTER outside of migration history), even though
-- schema.sql and migration 004 both specify DEFAULT 'DRAFT'. Since create
-- code never sets status explicitly, every new PO silently landed in an
-- unrecognized 'OPEN' state with no workflow actions available. Reassert the
-- correct default here so any environment with the same drift is corrected.

ALTER TABLE purchase_orders ALTER COLUMN status SET DEFAULT 'DRAFT';
