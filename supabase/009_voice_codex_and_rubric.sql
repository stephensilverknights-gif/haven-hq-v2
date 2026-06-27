-- ============================================
-- HAVEN TRAINING — Voice Codex + Voice-First Rubric
-- Run this in Supabase SQL Editor
--
-- Adds the Haven Voice Codex (single-row table) and four new score columns
-- on training_sessions for the rebuilt rubric:
--   Warmth & Empathy, Specificity, Ownership Voice, Tone Calibration
-- (Concrete Action reuses the existing score_action column.)
--
-- The legacy score columns (score_empathy, score_tone, score_resolution,
-- score_no_policy) are kept nullable so pre-migration sessions render
-- correctly in the debrief / history views. New sessions will only populate
-- the new columns.
-- ============================================

-- ── Haven Voice Codex ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.haven_voice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  principles JSONB NOT NULL DEFAULT '[]'::jsonb,
  signature_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,
  banned_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,
  exemplars JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  singleton BOOLEAN DEFAULT true UNIQUE
);

ALTER TABLE public.haven_voice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read haven voice"
  ON public.haven_voice FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage haven voice"
  ON public.haven_voice FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed the single row with empty arrays so the editor renders.
INSERT INTO public.haven_voice (principles, signature_phrases, banned_phrases, exemplars)
VALUES ('[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
ON CONFLICT (singleton) DO NOTHING;

-- ── New Rubric Score Columns ────────────────────────────────────────────────

ALTER TABLE public.training_sessions
  ADD COLUMN IF NOT EXISTS score_warmth INT,
  ADD COLUMN IF NOT EXISTS score_specificity INT,
  ADD COLUMN IF NOT EXISTS score_ownership INT,
  ADD COLUMN IF NOT EXISTS score_calibration INT;

-- Note: score_action stays as-is (Concrete Action is the only criterion that
-- survived unchanged). Legacy columns kept nullable for historical sessions.
