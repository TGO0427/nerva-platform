-- One work order keeps a single batch number for traceability (already
-- assigned at release), but a work order can have output recorded against
-- it multiple times (e.g. separate production runs on different days).
-- run_no distinguishes those runs within the same batch without changing
-- the batch identity that traceByBatch/forwardTrace/backwardTrace key off.

ALTER TABLE production_ledger ADD COLUMN IF NOT EXISTS run_no INTEGER;
