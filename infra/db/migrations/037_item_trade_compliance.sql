-- Migration: Item Trade Compliance Fields
--
-- Nerva's Trade Compliance / Document Centre tracks compliance documents
-- (COA, SADC, SGS, etc. -- see documents.document_type) but items themselves
-- carry no HS code or country of origin, so there's nothing to tie customs
-- classification back to the product master. Both fields are nullable and
-- purely additive -- existing items/rows are unaffected.

BEGIN;

ALTER TABLE items ADD COLUMN IF NOT EXISTS hs_code text;
ALTER TABLE items ADD COLUMN IF NOT EXISTS country_of_origin text;

CREATE INDEX IF NOT EXISTS idx_items_hs_code ON items(tenant_id, hs_code) WHERE hs_code IS NOT NULL;

COMMIT;
