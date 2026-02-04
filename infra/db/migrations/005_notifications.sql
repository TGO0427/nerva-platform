-- Migration 005: Notifications System
-- Adds notifications table for user notifications

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'INFO', 'WARNING', 'ERROR', 'SUCCESS'
  category text NOT NULL, -- 'SALES', 'INVENTORY', 'PROCUREMENT', 'SYSTEM'
  title text NOT NULL,
  message text NOT NULL,
  link text, -- Optional link to related resource
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(tenant_id, user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

COMMIT;
