-- ============================================================================
-- 007: Auto-escalation — promote overdue issues to on_fire
-- ============================================================================
-- Uses pg_cron to run every 15 minutes. Issues with a due_date in the past
-- that are not yet resolved and not already on_fire get auto-escalated.
--
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- Requires pg_cron extension (enabled by default on Supabase Pro+).
-- ============================================================================

-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- The escalation function
CREATE OR REPLACE FUNCTION public.escalate_overdue_issues()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.issues
  SET priority = 'on_fire',
      updated_at = now()
  WHERE due_date IS NOT NULL
    AND due_date < now()
    AND status != 'resolved'
    AND priority != 'on_fire';
$$;

-- Schedule: every 15 minutes
-- (Supabase pg_cron runs in UTC; the function itself is timezone-agnostic)
SELECT cron.schedule(
  'escalate-overdue-issues',
  '*/15 * * * *',
  $$SELECT public.escalate_overdue_issues()$$
);
