-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create helper function to get current tenant_id from JWT
CREATE OR REPLACE FUNCTION public.get_current_tenant_id() RETURNS UUID AS $$
  SELECT (auth.jwt() ->> 'tenant_id')::uuid;
$$ LANGUAGE SQL STABLE;

-- Create helper function to get current user_id from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id() RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE SQL STABLE;

-- ============================================
-- USERS TABLE RLS POLICIES
-- ============================================

-- Policy: Users can view their own record
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  USING (
    id = get_current_user_id()
  );

-- Policy: Admins can view all users in their tenant
CREATE POLICY "users_select_tenant_admin" ON public.users
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = get_current_user_id()
      AND u.tenant_id = get_current_tenant_id()
      AND u.role IN ('admin', 'owner')
    )
  );

-- Policy: Users can update their own record
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (
    id = get_current_user_id()
  )
  WITH CHECK (
    id = get_current_user_id()
  );

-- Policy: Admins can update users in their tenant
CREATE POLICY "users_update_tenant_admin" ON public.users
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = get_current_user_id()
      AND u.tenant_id = get_current_tenant_id()
      AND u.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Policy: Only owners can insert users
CREATE POLICY "users_insert_owner" ON public.users
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = get_current_user_id()
      AND u.tenant_id = get_current_tenant_id()
      AND u.role = 'owner'
    )
  );

-- ============================================
-- TENANTS TABLE RLS POLICIES
-- ============================================

-- Policy: Users can view their own tenant
CREATE POLICY "tenants_select_own" ON public.tenants
  FOR SELECT
  USING (
    id = get_current_tenant_id()
  );

-- Policy: Only owners can update tenant
CREATE POLICY "tenants_update_owner" ON public.tenants
  FOR UPDATE
  USING (
    id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = get_current_user_id()
      AND u.tenant_id = id
      AND u.role = 'owner'
    )
  )
  WITH CHECK (
    id = get_current_tenant_id()
  );

-- ============================================
-- SUBSCRIPTIONS TABLE RLS POLICIES
-- ============================================

-- Policy: Users can view subscriptions for their tenant
CREATE POLICY "subscriptions_select_tenant" ON public.subscriptions
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
  );

-- Policy: Only admins can update subscriptions
CREATE POLICY "subscriptions_update_admin" ON public.subscriptions
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = get_current_user_id()
      AND u.tenant_id = get_current_tenant_id()
      AND u.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Policy: Only admins can insert subscriptions
CREATE POLICY "subscriptions_insert_admin" ON public.subscriptions
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = get_current_user_id()
      AND u.tenant_id = get_current_tenant_id()
      AND u.role IN ('admin', 'owner')
    )
  );
