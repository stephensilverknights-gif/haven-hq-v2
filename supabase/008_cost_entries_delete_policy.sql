-- 008_cost_entries_delete_policy.sql
-- Fix: cost entry deletion silently failed because cost_entries had no DELETE
-- RLS policy. Add one matching the other cost_entries policies.

CREATE POLICY "Authenticated users can delete cost entries"
  ON public.cost_entries FOR DELETE
  TO authenticated
  USING (true);
