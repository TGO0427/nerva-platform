-- The system is now batch-driven by default: every existing item is
-- flipped to requires_batch_tracking, and new items default to it too.
-- Pre-existing blank-batch stock is relabeled to a visible 'LEGACY' batch
-- (merging into any pre-existing LEGACY row) so it doesn't get stuck,
-- mirroring relabelUntrackedStockAsLegacy's per-item logic but applied
-- system-wide since every item is flipped at once here.

BEGIN;

UPDATE items SET requires_batch_tracking = true WHERE requires_batch_tracking = false;

ALTER TABLE items ALTER COLUMN requires_batch_tracking SET DEFAULT true;

INSERT INTO stock_snapshot (tenant_id, bin_id, item_id, batch_no, qty_on_hand, qty_reserved)
SELECT tenant_id, bin_id, item_id, 'LEGACY', qty_on_hand, qty_reserved
FROM stock_snapshot WHERE batch_no = ''
ON CONFLICT (tenant_id, bin_id, item_id, batch_no) DO UPDATE SET
  qty_on_hand = stock_snapshot.qty_on_hand + EXCLUDED.qty_on_hand,
  qty_reserved = stock_snapshot.qty_reserved + EXCLUDED.qty_reserved,
  updated_at = now();

DELETE FROM stock_snapshot WHERE batch_no = '';

COMMIT;
