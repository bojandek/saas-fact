-- Calendar Block Migration
-- Creates tables for events, availability windows, and blocked slots
-- All tables use RLS with org_id isolation

-- ── Extensions ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Calendar Events ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS calendar_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  start_at      timestamptz NOT NULL,
  end_at        timestamptz NOT NULL,
  all_day       boolean NOT NULL DEFAULT false,
  status        text NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','confirmed','cancelled','completed','no_show')),
  assignee_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  client_id     uuid,  -- References niche-specific client table
  location      text,
  color         text,
  recurrence_id uuid,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_events_org_id      ON calendar_events (org_id);
CREATE INDEX idx_calendar_events_start_at    ON calendar_events (start_at);
CREATE INDEX idx_calendar_events_assignee_id ON calendar_events (assignee_id);
CREATE INDEX idx_calendar_events_status      ON calendar_events (status);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_org_isolation" ON calendar_events
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- ── Availability Windows ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS availability_windows (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week           smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time            time NOT NULL,
  end_time              time NOT NULL,
  slot_duration_minutes integer NOT NULL DEFAULT 30 CHECK (slot_duration_minutes > 0),
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_windows_staff_id ON availability_windows (staff_id);
CREATE INDEX idx_availability_windows_day      ON availability_windows (day_of_week);

ALTER TABLE availability_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "availability_windows_org_isolation" ON availability_windows
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- ── Blocked Slots ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blocked_slots (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  staff_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at   timestamptz NOT NULL,
  end_at     timestamptz NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_blocked_range CHECK (end_at > start_at)
);

CREATE INDEX idx_blocked_slots_staff_id ON blocked_slots (staff_id);
CREATE INDEX idx_blocked_slots_start_at ON blocked_slots (start_at);

ALTER TABLE blocked_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blocked_slots_org_isolation" ON blocked_slots
  USING (org_id = current_setting('app.current_org_id')::uuid);

-- ── Updated At Trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
