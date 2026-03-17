-- ============================================================================
-- Migration 003: Row Level Security (RLS) Multi-Tenancy
-- ============================================================================
-- Implements enterprise-grade multi-tenancy using Supabase RLS.
-- Every table is isolated by org_id — users can only see their own data.
--
-- Architecture:
--   auth.users (Supabase Auth)
--       ↓
--   public.organizations (org_id)
--       ↓
--   public.org_members (user_id → org_id mapping)
--       ↓
--   All other tables (filtered by org_id via RLS policies)
--
-- Usage:
--   1. Run this migration in Supabase SQL editor
--   2. All new tables automatically inherit RLS via the helper function
--   3. Set app.current_org_id in your API: SET app.current_org_id = 'org-uuid'
-- ============================================================================

-- ── Helper: Get current org_id from JWT or session variable ─────────────────

CREATE OR REPLACE FUNCTION auth.org_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    -- From JWT claims (set during token generation)
    (auth.jwt() ->> 'org_id')::uuid,
    -- From session variable (set by API layer)
    current_setting('app.current_org_id', true)::uuid
  )
$$;

-- ── Organizations table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  plan          text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency', 'enterprise')),
  max_projects  integer NOT NULL DEFAULT 3,
  max_members   integer NOT NULL DEFAULT 5,
  settings      jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Org members can read their own org
CREATE POLICY "org_members_can_read_own_org"
  ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Only org owners can update
CREATE POLICY "org_owners_can_update"
  ON public.organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- ── Org Members table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.org_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  invited_by  uuid REFERENCES auth.users(id),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS org_members_user_id_idx ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS org_members_org_id_idx ON public.org_members(org_id);

ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Members can see other members in their org
CREATE POLICY "members_can_see_org_members"
  ON public.org_members
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Only admins/owners can add members
CREATE POLICY "admins_can_insert_members"
  ON public.org_members
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only admins/owners can remove members (not themselves if owner)
CREATE POLICY "admins_can_delete_members"
  ON public.org_members
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ── SaaS Projects table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saas_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  name            text NOT NULL,
  description     text,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'generating', 'generated', 'deployed', 'failed')),
  blueprint       jsonb,
  theme           jsonb,
  blocks_used     text[] DEFAULT '{}',
  deploy_url      text,
  generation_time_ms integer,
  error_message   text,
  metadata        jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saas_projects_org_id_idx ON public.saas_projects(org_id);
CREATE INDEX IF NOT EXISTS saas_projects_status_idx ON public.saas_projects(status);

ALTER TABLE public.saas_projects ENABLE ROW LEVEL SECURITY;

-- Org members can read their org's projects
CREATE POLICY "org_members_can_read_projects"
  ON public.saas_projects
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- Org members can create projects
CREATE POLICY "org_members_can_create_projects"
  ON public.saas_projects
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Project creator and admins can update
CREATE POLICY "creators_and_admins_can_update_projects"
  ON public.saas_projects
  FOR UPDATE
  USING (
    created_by = auth.uid()
    OR org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Only admins/owners can delete projects
CREATE POLICY "admins_can_delete_projects"
  ON public.saas_projects
  FOR DELETE
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ── Generation Jobs table (for Job Queue) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES public.saas_projects(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES auth.users(id),
  status        text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
  priority      integer NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  payload       jsonb NOT NULL DEFAULT '{}',
  result        jsonb,
  error         text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS generation_jobs_org_id_idx ON public.generation_jobs(org_id);
CREATE INDEX IF NOT EXISTS generation_jobs_status_idx ON public.generation_jobs(status);
CREATE INDEX IF NOT EXISTS generation_jobs_queued_idx
  ON public.generation_jobs(priority DESC, created_at ASC)
  WHERE status = 'queued';

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_read_jobs"
  ON public.generation_jobs
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "org_members_can_create_jobs"
  ON public.generation_jobs
  FOR INSERT
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- ── API Usage / Cost Tracking table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.api_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id    uuid REFERENCES public.saas_projects(id) ON DELETE SET NULL,
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  model         text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens  integer NOT NULL DEFAULT 0,
  cost_usd      numeric(10, 6) NOT NULL DEFAULT 0,
  agent_name    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_usage_org_id_idx ON public.api_usage(org_id);
CREATE INDEX IF NOT EXISTS api_usage_created_at_idx ON public.api_usage(created_at);

ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_can_read_usage"
  ON public.api_usage
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid()
    )
  );

-- ── Memory table (for Always-On Memory) ─────────────────────────────────────
-- (Extends migration 002 with org_id isolation)

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'memories') THEN
    -- Add org_id if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'memories' AND column_name = 'org_id'
    ) THEN
      ALTER TABLE public.memories ADD COLUMN org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
      CREATE INDEX IF NOT EXISTS memories_org_id_idx ON public.memories(org_id);
    END IF;
  END IF;
END $$;

-- ── Helper functions ─────────────────────────────────────────────────────────

-- Get user's organizations
CREATE OR REPLACE FUNCTION public.get_user_orgs(p_user_id uuid DEFAULT auth.uid())
RETURNS TABLE(org_id uuid, org_name text, role text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT o.id, o.name, m.role
  FROM public.organizations o
  JOIN public.org_members m ON m.org_id = o.id
  WHERE m.user_id = p_user_id
  ORDER BY o.created_at;
$$;

-- Create organization and add creator as owner
CREATE OR REPLACE FUNCTION public.create_organization(
  p_name text,
  p_slug text,
  p_plan text DEFAULT 'free'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  INSERT INTO public.organizations(name, slug, plan)
  VALUES (p_name, p_slug, p_plan)
  RETURNING id INTO v_org_id;

  INSERT INTO public.org_members(org_id, user_id, role)
  VALUES (v_org_id, auth.uid(), 'owner');

  RETURN v_org_id;
END;
$$;

-- Check if user has required role in org
CREATE OR REPLACE FUNCTION public.user_has_role(
  p_org_id uuid,
  p_required_roles text[]
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role = ANY(p_required_roles)
  );
$$;

-- ── Triggers: auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER saas_projects_updated_at
  BEFORE UPDATE ON public.saas_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER generation_jobs_updated_at
  BEFORE UPDATE ON public.generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seed: Default plans configuration ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.plans (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  max_projects  integer NOT NULL,
  max_members   integer NOT NULL,
  max_ai_calls_per_month integer NOT NULL,
  price_usd     numeric(8, 2) NOT NULL DEFAULT 0,
  features      text[] DEFAULT '{}'
);

INSERT INTO public.plans (id, name, max_projects, max_members, max_ai_calls_per_month, price_usd, features)
VALUES
  ('free',       'Free',       3,   1,   50,   0,     ARRAY['3 projects', '1 member', '50 AI calls/month']),
  ('pro',        'Pro',        20,  5,   500,  29,    ARRAY['20 projects', '5 members', '500 AI calls/month', 'Priority support']),
  ('agency',     'Agency',     100, 20,  2000, 99,    ARRAY['100 projects', '20 members', '2000 AI calls/month', 'White label', 'API access']),
  ('enterprise', 'Enterprise', -1,  -1,  -1,   499,   ARRAY['Unlimited projects', 'Unlimited members', 'Unlimited AI calls', 'SLA', 'Custom integrations'])
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  max_projects = EXCLUDED.max_projects,
  max_members = EXCLUDED.max_members,
  max_ai_calls_per_month = EXCLUDED.max_ai_calls_per_month,
  price_usd = EXCLUDED.price_usd,
  features = EXCLUDED.features;
