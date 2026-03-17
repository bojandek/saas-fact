-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 005: War Room Realtime Logging
-- ─────────────────────────────────────────────────────────────────────────────
-- Creates the war_room_logs table and enables Supabase Realtime on it.
-- Every INSERT is pushed to subscribed clients in real-time via WebSocket.
--
-- Run this in your Supabase SQL editor or via supabase db push.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── war_room_logs ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.war_room_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid        NOT NULL,  -- References generation_jobs.id
  org_id      uuid        NOT NULL,  -- For RLS isolation
  agent       text        NOT NULL,  -- 'architect', 'assembler', 'qa', etc.
  level       text        NOT NULL CHECK (level IN ('info', 'warn', 'error', 'success', 'debug')),
  message     text        NOT NULL,
  metadata    jsonb       DEFAULT '{}',
  duration_ms integer,               -- How long this step took
  tokens_used integer,               -- Tokens consumed by this agent call
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_war_room_logs_run_id     ON public.war_room_logs (run_id);
CREATE INDEX IF NOT EXISTS idx_war_room_logs_org_id     ON public.war_room_logs (org_id);
CREATE INDEX IF NOT EXISTS idx_war_room_logs_created_at ON public.war_room_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_war_room_logs_agent      ON public.war_room_logs (agent);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE public.war_room_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see logs for their own org
CREATE POLICY "org_members_can_read_logs"
  ON public.war_room_logs
  FOR SELECT
  USING (org_id = auth.org_id());

-- Only the service role (server-side) can insert logs
CREATE POLICY "service_role_can_insert_logs"
  ON public.war_room_logs
  FOR INSERT
  WITH CHECK (true);  -- Enforced at application level; service role bypasses RLS

-- ── Enable Supabase Realtime ──────────────────────────────────────────────────
-- This allows clients to subscribe to INSERT events on this table.

ALTER PUBLICATION supabase_realtime ADD TABLE public.war_room_logs;

-- ── generation_jobs realtime ──────────────────────────────────────────────────
-- Also enable realtime on generation_jobs so clients can track job status.

ALTER PUBLICATION supabase_realtime ADD TABLE public.generation_jobs;

-- ── Helper function: Insert a log entry ──────────────────────────────────────
-- Used by factory-brain agents to log progress.

CREATE OR REPLACE FUNCTION public.log_war_room_event(
  p_run_id      uuid,
  p_org_id      uuid,
  p_agent       text,
  p_level       text,
  p_message     text,
  p_metadata    jsonb    DEFAULT '{}',
  p_duration_ms integer  DEFAULT NULL,
  p_tokens_used integer  DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.war_room_logs (
    run_id, org_id, agent, level, message, metadata, duration_ms, tokens_used
  ) VALUES (
    p_run_id, p_org_id, p_agent, p_level, p_message, p_metadata, p_duration_ms, p_tokens_used
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ── View: recent_war_room_runs ────────────────────────────────────────────────
-- Convenient view for the Fleet Dashboard to show recent activity.

CREATE OR REPLACE VIEW public.recent_war_room_runs AS
SELECT
  run_id,
  org_id,
  MIN(created_at)                                           AS started_at,
  MAX(created_at)                                           AS last_activity,
  COUNT(*)                                                  AS total_events,
  COUNT(*) FILTER (WHERE level = 'error')                   AS error_count,
  COUNT(DISTINCT agent)                                     AS agents_involved,
  BOOL_OR(level = 'error')                                  AS has_errors,
  BOOL_AND(message ILIKE '%completed%' OR level = 'success') AS all_completed
FROM public.war_room_logs
WHERE created_at > now() - INTERVAL '7 days'
GROUP BY run_id, org_id
ORDER BY last_activity DESC;

COMMENT ON TABLE public.war_room_logs IS
  'Real-time log entries from War Room agent pipeline executions. '
  'Supabase Realtime is enabled — clients subscribe to INSERT events '
  'to receive live updates without polling.';
