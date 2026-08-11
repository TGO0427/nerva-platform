-- receiveRmaLine never captured which batch was actually being returned,
-- so the stock movement recording the return never passed a batch_no -
-- for batch-tracked items this silently created a phantom "no batch"
-- stock_snapshot row, disconnected from the item's real batch inventory
-- (the same class of bug already fixed for IBT/Adjustments/Production).

BEGIN;

ALTER TABLE rma_lines ADD COLUMN IF NOT EXISTS batch_no text;

COMMIT;
