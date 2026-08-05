-- Cycle counts never tracked which batch a line referred to, even though
-- stock_snapshot (and getStockInBin/getStockInWarehouse) is already keyed
-- per batch. Two real bugs followed: addCycleCountLine's lookup grabbed
-- whichever batch happened to be first for that item in the bin (silently
-- ignoring any others), and a completed count's variance-to-adjustment
-- flow never passed a batch through, which addAdjustmentLine now rejects
-- outright for any batch-tracked item since every item requires tracking
-- by default (migration 041).

ALTER TABLE cycle_count_lines ADD COLUMN IF NOT EXISTS batch_no TEXT;
