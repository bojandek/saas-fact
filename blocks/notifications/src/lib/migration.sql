-- Notifications Block Migration
-- Creates tables for notifications, templates, preferences, and push subscriptions
-- All tables use RLS with org_id isolation

-- ── Notifications ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel     text NOT NULL CHECK (channel IN ('in_app','email','push','sms')),
  priority    text NOT NULL DEFAULT 'normal'
                CHECK (priority IN ('low','normal','high','urgent')),
  status      text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','sent','delivered','failed','read')),
  title       text NOT NULL,
  body        text NOT NULL,
  action_url  text,
  icon        text,
  metadata    jsonb,
  read_at     timestamptz,
  sent_at     timestamptz,
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_id    ON notifications (user_id);
CREATE INDEX idx_notifications_org_id     ON notifications (org_id);
CREATE INDEX idx_notifications_channel    ON notifications (channel);
CREATE INDEX idx_notifications_status     ON notifications (status);
CREATE INDEX idx_notifications_created_at ON notifications (created_at DESC);
-- Partial index for fast unread count queries
CREATE INDEX idx_notifications_unread     ON notifications (user_id, channel)
  WHERE read_at IS NULL AND status != 'failed';

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_user_isolation" ON notifications
  USING (user_id = auth.uid());

-- ── Notification Templates ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug            text NOT NULL,
  name            text NOT NULL,
  channel         text NOT NULL CHECK (channel IN ('in_app','email','push','sms')),
  title_template  text NOT NULL,
  body_template   text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, slug)
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_templates_org_isolation" ON notification_templates
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- ── Notification Preferences ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel           text NOT NULL CHECK (channel IN ('in_app','email','push','sms')),
  enabled           boolean NOT NULL DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end   time,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_preferences_user_isolation" ON notification_preferences
  USING (user_id = auth.uid());

-- ── Push Subscriptions ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,  -- Web Push subscription object
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_subscriptions_user_isolation" ON push_subscriptions
  USING (user_id = auth.uid());

-- ── Seed Default Templates ────────────────────────────────────────────────────
-- These are inserted per-org by the schema provisioner

-- appointment_reminder: "Hi {{name}}, your appointment is tomorrow at {{time}}"
-- payment_received:     "Payment of {{amount}} received. Thank you!"
-- welcome:              "Welcome to {{app_name}}, {{name}}!"
