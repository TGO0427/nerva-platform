-- Tenant billing plans
DO $$ BEGIN
  CREATE TYPE tenant_plan AS ENUM ('trial', 'starter', 'growth', 'enterprise');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE billing_cycle AS ENUM ('monthly', 'annual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS plan tenant_plan NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS billing_cycle billing_cycle NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_users INT NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_warehouses INT NOT NULL DEFAULT 1;

-- Set trial expiry to 14 days from now for existing trial tenants
UPDATE tenants
  SET plan_expires_at = NOW() + INTERVAL '14 days'
  WHERE plan = 'trial' AND plan_expires_at IS NULL;
