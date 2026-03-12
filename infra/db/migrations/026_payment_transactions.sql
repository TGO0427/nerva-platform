-- Payment transactions for PayStack integration
DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'success', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  paystack_reference VARCHAR(100) UNIQUE NOT NULL,
  paystack_access_code VARCHAR(100),
  amount_zar INT NOT NULL,              -- in cents
  plan tenant_plan NOT NULL,
  billing_cycle billing_cycle NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  paystack_response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_tenant ON payment_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON payment_transactions(paystack_reference);

-- PayStack subscription tracking
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS paystack_customer_code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS paystack_subscription_code VARCHAR(100);
