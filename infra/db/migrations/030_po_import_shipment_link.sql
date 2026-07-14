-- Link Purchase Orders to auto-created Import Shipments (logistics handoff).
-- purchase_orders.is_import: procurement flags a PO as an international/import order.
-- purchase_orders.linked_import_shipment_id: set once, the first time a flagged PO
--   transitions to CONFIRMED, to the auto-created shipment's id. Doubles as the
--   idempotency guard (skip auto-create if already set).
-- import_shipments.purchase_order_id: reverse pointer so the shipment can be
--   looked up by source PO and the shipment page can link back to it.

BEGIN;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS is_import boolean NOT NULL DEFAULT false;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS linked_import_shipment_id uuid
    REFERENCES import_shipments(id) ON DELETE SET NULL;

ALTER TABLE import_shipments
  ADD COLUMN IF NOT EXISTS purchase_order_id uuid
    REFERENCES purchase_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_import_shipments_purchase_order
  ON import_shipments(purchase_order_id);

COMMIT;
