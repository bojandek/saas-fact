-- Auto-generated schema for teretana-crm
-- Generated: 2026-03-18T13:34:29.413Z

-- Enable pgvector for AI features
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members_org_isolation" ON members
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE TABLE IF NOT EXISTS subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_org_isolation" ON subscriptions
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE TABLE IF NOT EXISTS classes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes_org_isolation" ON classes
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE TABLE IF NOT EXISTS bookings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_org_isolation" ON bookings
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE TABLE IF NOT EXISTS trainers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainers_org_isolation" ON trainers
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE TABLE IF NOT EXISTS attendance (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attendance_org_isolation" ON attendance
  USING (org_id = current_setting('app.current_org_id')::uuid);

CREATE TABLE IF NOT EXISTS measurements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "measurements_org_isolation" ON measurements
  USING (org_id = current_setting('app.current_org_id')::uuid);
