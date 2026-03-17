-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 006: Multi-Schema Shared Auth
-- ─────────────────────────────────────────────────────────────────────────────
-- Architecture: One Supabase project → many PostgreSQL schemas
--
--   public schema:
--     - auth.users (Supabase managed)
--     - public.organizations
--     - public.org_members
--     - public.saas_schemas (registry of all provisioned schemas)
--
--   {app_name} schema (e.g. "teretana_crm"):
--     - Business tables specific to that SaaS
--     - RLS policies using auth.uid() and org membership
--     - Isolated from all other SaaS apps
--
-- This allows 150+ SaaS apps on a single Supabase project (PostgreSQL cluster).
-- Cost: ~$25/month instead of $25 × 150 = $3,750/month.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ── Shared Auth Tables (public schema) ───────────────────────────────────────

-- Organizations table (shared across all SaaS apps)
CREATE TABLE IF NOT EXISTS public.organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  plan          text NOT NULL DEFAULT 'free',
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Organization members (shared across all SaaS apps)
CREATE TABLE IF NOT EXISTS public.org_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- Schema registry: tracks all provisioned SaaS schemas
CREATE TABLE IF NOT EXISTS public.saas_schemas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_name   text NOT NULL UNIQUE,
  app_name      text NOT NULL,
  niche         text,
  org_id        uuid REFERENCES public.organizations(id),
  blocks        text[] DEFAULT '{}',
  status        text NOT NULL DEFAULT 'provisioning'
                  CHECK (status IN ('provisioning', 'active', 'suspended', 'deleted')),
  metadata      jsonb DEFAULT '{}',
  provisioned_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── RLS on Shared Tables ──────────────────────────────────────────────────────

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_schemas ENABLE ROW LEVEL SECURITY;

-- Organizations: members can see their own orgs
CREATE POLICY "organizations_member_access" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "organizations_owner_insert" ON public.organizations
  FOR INSERT WITH CHECK (true); -- Controlled by service role

CREATE POLICY "organizations_owner_update" ON public.organizations
  FOR UPDATE USING (
    id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Org members: see members of your orgs
CREATE POLICY "org_members_select" ON public.org_members
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

CREATE POLICY "org_members_insert" ON public.org_members
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM public.org_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- SaaS schemas: visible to org members
CREATE POLICY "saas_schemas_select" ON public.saas_schemas
  FOR SELECT USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
    OR org_id IS NULL -- Public schemas (demo apps)
  );

-- ── Schema Provisioning Function ──────────────────────────────────────────────
-- Called by factory-brain AssemblerAgent to create a new schema for each SaaS.
-- Usage: SELECT provision_saas_schema('teretana_crm', 'org-uuid-here');

CREATE OR REPLACE FUNCTION public.provision_saas_schema(
  p_schema_name  text,
  p_org_id       uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schema_exists boolean;
  v_result        jsonb;
BEGIN
  -- Check if schema already exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.schemata
    WHERE schema_name = p_schema_name
  ) INTO v_schema_exists;

  IF v_schema_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Schema %I already exists', p_schema_name),
      'schema_name', p_schema_name
    );
  END IF;

  -- Validate schema name (prevent SQL injection)
  IF p_schema_name !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid schema name. Must match ^[a-z][a-z0-9_]{0,62}$',
      'schema_name', p_schema_name
    );
  END IF;

  -- Create the schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);

  -- Grant permissions
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO authenticated', p_schema_name);
  EXECUTE format('GRANT USAGE ON SCHEMA %I TO service_role', p_schema_name);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO authenticated', p_schema_name);
  EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO authenticated', p_schema_name);

  -- Register in saas_schemas
  INSERT INTO public.saas_schemas (schema_name, app_name, org_id, status, provisioned_at)
  VALUES (p_schema_name, p_schema_name, p_org_id, 'active', now())
  ON CONFLICT (schema_name) DO UPDATE
    SET status = 'active', provisioned_at = now(), updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'schema_name', p_schema_name,
    'provisioned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'schema_name', p_schema_name
  );
END;
$$;

-- ── Schema Teardown Function ──────────────────────────────────────────────────
-- Safely removes a SaaS schema and all its data.
-- Usage: SELECT teardown_saas_schema('teretana_crm');

CREATE OR REPLACE FUNCTION public.teardown_saas_schema(
  p_schema_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate schema name
  IF p_schema_name !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid schema name');
  END IF;

  -- Prevent dropping critical schemas
  IF p_schema_name IN ('public', 'auth', 'storage', 'realtime', 'extensions', 'pg_catalog') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot drop system schema');
  END IF;

  -- Drop the schema and all its objects
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_schema_name);

  -- Update registry
  UPDATE public.saas_schemas
  SET status = 'deleted', updated_at = now()
  WHERE schema_name = p_schema_name;

  RETURN jsonb_build_object('success', true, 'schema_name', p_schema_name);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ── List Schemas Function ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.list_saas_schemas(p_org_id uuid DEFAULT NULL)
RETURNS TABLE(
  schema_name   text,
  app_name      text,
  niche         text,
  status        text,
  blocks        text[],
  provisioned_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    schema_name,
    app_name,
    niche,
    status,
    blocks,
    provisioned_at
  FROM public.saas_schemas
  WHERE
    (p_org_id IS NULL OR org_id = p_org_id)
    AND status != 'deleted'
  ORDER BY provisioned_at DESC;
$$;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_saas_schemas_org_id ON public.saas_schemas(org_id);
CREATE INDEX IF NOT EXISTS idx_saas_schemas_status ON public.saas_schemas(status);

-- ── Updated At Triggers ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER saas_schemas_updated_at
  BEFORE UPDATE ON public.saas_schemas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.organizations IS 'Shared organizations table — used by all SaaS apps';
COMMENT ON TABLE public.org_members IS 'Shared org membership — used by all SaaS apps';
COMMENT ON TABLE public.saas_schemas IS 'Registry of all provisioned PostgreSQL schemas (one per SaaS app)';
COMMENT ON FUNCTION public.provision_saas_schema IS 'Creates a new PostgreSQL schema for a SaaS app with proper permissions and RLS';
COMMENT ON FUNCTION public.teardown_saas_schema IS 'Safely drops a SaaS schema and all its data';
