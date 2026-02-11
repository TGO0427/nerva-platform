-- Add columns for stop action tracking
ALTER TABLE dispatch_stops ADD COLUMN IF NOT EXISTS failure_reason text;
ALTER TABLE dispatch_trips ADD COLUMN IF NOT EXISTS completed_stops integer DEFAULT 0;
