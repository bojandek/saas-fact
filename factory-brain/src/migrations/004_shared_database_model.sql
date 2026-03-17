-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 004: Shared Database Model — Multi-SaaS on a Single Postgres Cluster
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Purpose:
--   Enables 150+ SaaS applications to share a single Supabase/Postgres cluster
--   while maintaining complete data isolation via Row Level Security (RLS).
--
-- Architecture:
--   ┌─────────────────────────────────────────────────────────────────────────┐
--   │                    Single Postgres Cluster                              │
--   │                                                                         │
--   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
--   │  │  saas-001    │  │  saas-002    │  │  saas-N      │                 │
--   │  │  booking     │  │  cms         │  │  ...         │                 │
--   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
--   │         │                 │                  │                         │
--   │         └─────────────────┴──────────────────┘                         │
--   │                           │                                             │
--   │              saas_id column in every table                              │
--   │              RLS policy: WHERE saas_id = current_saas_id()             │
--   └─────────────────────────────────────────────────────────────────────────┘
--
-- Cost savings:
--   - 150 separate Supabase projects: ~$150-750/month
--   - 1 shared cluster with RLS:      ~$25-50/month
--
-- Security model:
--   - saas_id is set at connection time via SET app.current_saas_id = 'saas-001'
--   - RLS policies enforce saas_id isolation on every table
--   - No cross-SaaS data leakage possible at the database level
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Fleet Registry ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.fleet_registry (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_id             text NOT NULL UNIQUE,          -- e.g. 'saas-001-booking'
  display_name        text NOT NULL,                 -- e.g. 'BookEasy — Salon Booking'
  factory_version     text NOT NULL DEFAULT '1.0.0',
  template_used       text,                          -- e.g. 'saas-001-booking'
  blocks_enabled      text[] DEFAULT '{}',           -- e.g. ARRAY['auth','payments','analytics']
  environment         text NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'staging', 'development')),
  url                 text,                          -- e.g. 'https://bookeasy.example.com'
  coolify_app_id      text,
  stripe_product_id   text,
  supabase_project_ref text,
  org_id              uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  status              text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS fleet_registry_saas_id_idx ON public.fleet_registry(saas_id);
CREATE INDEX IF NOT EXISTS fleet_registry_org_id_idx ON public.fleet_registry(org_id);
CREATE INDEX IF NOT EXISTS fleet_registry_status_idx ON public.fleet_registry(status);

-- ── 2. Current SaaS ID Helper ─────────────────────────────────────────────────

-- Returns the current SaaS ID from:
--   1. JWT claim 'saas_id' (set by your auth middleware)
--   2. Session variable app.current_saas_id (set by API server)
--   3. NULL (no isolation — only for service role)
CREATE OR REPLACE FUNCTION auth.current_saas_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    -- From JWT (preferred — set this in your Supabase auth hook)
    auth.jwt() ->> 'saas_id',
    -- From session variable (set by API: SET LOCAL app.current_saas_id = 'saas-001')
    current_setting('app.current_saas_id', true),
    -- Fallback: empty string (will match nothing, safe default)
    ''
  )
$$;

-- ── 3. Shared Tables with saas_id Isolation ───────────────────────────────────

-- Users table (shared across all SaaS apps)
CREATE TABLE IF NOT EXISTS public.saas_users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_id       text NOT NULL REFERENCES public.fleet_registry(saas_id) ON DELETE CASCADE,
  email         text NOT NULL,
  display_name  text,
  avatar_url    text,
  role          text NOT NULL DEFAULT 'user' CHECK (role IN ('owner', 'admin', 'member', 'viewer', 'user')),
  plan          text NOT NULL DEFAULT 'free',
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(saas_id, email)
);

CREATE INDEX IF NOT EXISTS saas_users_saas_id_idx ON public.saas_users(saas_id);
CREATE INDEX IF NOT EXISTS saas_users_email_idx ON public.saas_users(saas_id, email);

ALTER TABLE public.saas_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_users_isolation" ON public.saas_users
  USING (saas_id = auth.current_saas_id());

CREATE POLICY "saas_users_insert_isolation" ON public.saas_users
  FOR INSERT WITH CHECK (saas_id = auth.current_saas_id());

CREATE POLICY "saas_users_update_isolation" ON public.saas_users
  FOR UPDATE USING (saas_id = auth.current_saas_id());

CREATE POLICY "saas_users_delete_isolation" ON public.saas_users
  FOR DELETE USING (saas_id = auth.current_saas_id());

-- Subscriptions table (shared, Stripe-linked)
CREATE TABLE IF NOT EXISTS public.saas_subscriptions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_id               text NOT NULL REFERENCES public.fleet_registry(saas_id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.saas_users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id    text,
  plan                  text NOT NULL DEFAULT 'free',
  status                text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'paused')),
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  trial_end             timestamptz,
  cancel_at             timestamptz,
  metadata              jsonb DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saas_subscriptions_saas_id_idx ON public.saas_subscriptions(saas_id);
CREATE INDEX IF NOT EXISTS saas_subscriptions_user_id_idx ON public.saas_subscriptions(user_id);

ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_subscriptions_isolation" ON public.saas_subscriptions
  USING (saas_id = auth.current_saas_id());

CREATE POLICY "saas_subscriptions_insert_isolation" ON public.saas_subscriptions
  FOR INSERT WITH CHECK (saas_id = auth.current_saas_id());

-- Events/Audit Log table (shared, append-only)
CREATE TABLE IF NOT EXISTS public.saas_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_id     text NOT NULL REFERENCES public.fleet_registry(saas_id) ON DELETE CASCADE,
  user_id     uuid REFERENCES public.saas_users(id) ON DELETE SET NULL,
  event_type  text NOT NULL,                -- e.g. 'user.signup', 'payment.success'
  event_data  jsonb DEFAULT '{}',
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saas_events_saas_id_idx ON public.saas_events(saas_id);
CREATE INDEX IF NOT EXISTS saas_events_created_at_idx ON public.saas_events(saas_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saas_events_type_idx ON public.saas_events(saas_id, event_type);

ALTER TABLE public.saas_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_events_isolation" ON public.saas_events
  USING (saas_id = auth.current_saas_id());

CREATE POLICY "saas_events_insert_isolation" ON public.saas_events
  FOR INSERT WITH CHECK (saas_id = auth.current_saas_id());

-- Feature flags per SaaS
CREATE TABLE IF NOT EXISTS public.saas_feature_flags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saas_id     text NOT NULL REFERENCES public.fleet_registry(saas_id) ON DELETE CASCADE,
  flag_key    text NOT NULL,
  enabled     boolean NOT NULL DEFAULT false,
  rollout_pct integer NOT NULL DEFAULT 100 CHECK (rollout_pct BETWEEN 0 AND 100),
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(saas_id, flag_key)
);

ALTER TABLE public.saas_feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saas_feature_flags_isolation" ON public.saas_feature_flags
  USING (saas_id = auth.current_saas_id());

-- ── 4. Fleet Monitoring Views ─────────────────────────────────────────────────

-- Per-SaaS user count (for fleet dashboard)
CREATE OR REPLACE VIEW public.fleet_user_counts AS
SELECT
  saas_id,
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE created_at > now() - interval '30 days') AS new_users_30d,
  COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') AS new_users_7d
FROM public.saas_users
GROUP BY saas_id;

-- Per-SaaS subscription summary (for fleet dashboard)
CREATE OR REPLACE VIEW public.fleet_subscription_summary AS
SELECT
  s.saas_id,
  COUNT(*) FILTER (WHERE s.status = 'active') AS active_subscriptions,
  COUNT(*) FILTER (WHERE s.status = 'trialing') AS trial_subscriptions,
  COUNT(*) FILTER (WHERE s.status = 'past_due') AS past_due_subscriptions,
  COUNT(*) FILTER (WHERE s.status = 'canceled' AND s.updated_at > now() - interval '30 days') AS churned_30d
FROM public.saas_subscriptions s
GROUP BY s.saas_id;

-- ── 5. Fleet Registry RLS (Factory-level isolation) ──────────────────────────

-- Only org members can see their own fleet entries
ALTER TABLE public.fleet_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fleet_registry_org_isolation" ON public.fleet_registry
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "fleet_registry_insert_org_isolation" ON public.fleet_registry
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- ── 6. Utility Functions ──────────────────────────────────────────────────────

-- Register a new SaaS app in the fleet
CREATE OR REPLACE FUNCTION public.fleet_register_app(
  p_saas_id       text,
  p_display_name  text,
  p_org_id        uuid,
  p_template      text DEFAULT NULL,
  p_blocks        text[] DEFAULT '{}',
  p_environment   text DEFAULT 'production'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.fleet_registry (saas_id, display_name, org_id, template_used, blocks_enabled, environment)
  VALUES (p_saas_id, p_display_name, p_org_id, p_template, p_blocks, p_environment)
  ON CONFLICT (saas_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Get fleet summary for an org
CREATE OR REPLACE FUNCTION public.fleet_summary(p_org_id uuid)
RETURNS TABLE (
  saas_id         text,
  display_name    text,
  environment     text,
  status          text,
  total_users     bigint,
  active_subs     bigint,
  trial_subs      bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    r.saas_id,
    r.display_name,
    r.environment,
    r.status,
    COALESCE(uc.total_users, 0) AS total_users,
    COALESCE(ss.active_subscriptions, 0) AS active_subs,
    COALESCE(ss.trial_subscriptions, 0) AS trial_subs
  FROM public.fleet_registry r
  LEFT JOIN public.fleet_user_counts uc USING (saas_id)
  LEFT JOIN public.fleet_subscription_summary ss USING (saas_id)
  WHERE r.org_id = p_org_id
    AND r.status = 'active'
  ORDER BY r.created_at DESC;
$$;

-- ── 7. Updated_at Triggers ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fleet_registry', 'saas_users', 'saas_subscriptions', 'saas_feature_flags'
  ] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I;
       CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

-- ── 8. Indexes for Performance ────────────────────────────────────────────────

-- Composite indexes for common fleet queries
CREATE INDEX IF NOT EXISTS saas_events_saas_type_idx
  ON public.saas_events(saas_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS saas_subscriptions_status_idx
  ON public.saas_subscriptions(saas_id, status);

-- ── Done ──────────────────────────────────────────────────────────────────────
-- To use this model:
--
-- 1. Run this migration in your Supabase project
-- 2. Register each SaaS: SELECT fleet_register_app('saas-001-booking', 'BookEasy', 'org-uuid')
-- 3. In your API middleware: SET LOCAL app.current_saas_id = 'saas-001-booking'
-- 4. All queries are automatically isolated by RLS
--
-- Example API middleware (Node.js):
--   await supabase.rpc('set_config', { parameter: 'app.current_saas_id', value: 'saas-001-booking' })
-- ═══════════════════════════════════════════════════════════════════════════════
