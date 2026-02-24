BEGIN;

ALTER TABLE bom_lines ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'INGREDIENT';
ALTER TABLE bom_lines ADD CONSTRAINT chk_bom_lines_category CHECK (category IN ('INGREDIENT', 'PACKAGING'));

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS batch_no text;

CREATE INDEX IF NOT EXISTS idx_bom_lines_category ON bom_lines(bom_header_id, category);

COMMIT;
