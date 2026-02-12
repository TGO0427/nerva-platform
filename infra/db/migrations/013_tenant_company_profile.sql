-- Migration 013: Add company profile fields to tenants table
-- These fields are used for professional document PDF generation (company header, bank details, etc.)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line1 text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vat_no text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS registration_no text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_account_no text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_branch_code text;
