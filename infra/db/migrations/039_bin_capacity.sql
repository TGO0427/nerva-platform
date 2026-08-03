-- Migration: Bin Capacity (pallet positions)
--
-- Nerva tracks stock quantity per bin (stock_snapshot) but has no concept
-- of physical space -- nothing says whether a warehouse or zone is filling
-- up. This adds a per-bin pallet-position capacity so warehouse
-- utilization can be computed (capacity = SUM(capacity_pallets),
-- occupied = capacity of bins currently holding any stock).
--
-- Defaults to 1 so existing bins get a meaningful capacity immediately
-- (day-one utilization = active bin count vs. bins with stock); users can
-- adjust individual bins afterward to reflect real pallet capacity.

BEGIN;

ALTER TABLE bins ADD COLUMN IF NOT EXISTS capacity_pallets integer NOT NULL DEFAULT 1;

COMMIT;
