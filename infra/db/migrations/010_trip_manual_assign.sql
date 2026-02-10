-- Add columns for manual driver/vehicle assignment (without requiring driver/vehicle records)
ALTER TABLE dispatch_trips ADD COLUMN IF NOT EXISTS driver_name text;
ALTER TABLE dispatch_trips ADD COLUMN IF NOT EXISTS vehicle_plate text;
