-- HavenHQ Seed Data
-- Run this after 001_schema.sql

-- ============================================
-- PROPERTIES
-- ============================================
INSERT INTO public.properties (name, market, color_tag) VALUES
  ('Lolo Loft 101',   'North Idaho',   '#5B5BD6'),
  ('Bier Haus Loft',  'North Idaho',   '#059669'),
  ('Buttercup',       'North Idaho',   '#D97706'),
  ('Sherman Arms',    'North Idaho',   '#DC2626'),
  ('Bell Cottage',    'Sarasota FL',   '#7C3AED'),
  ('Bickett Hotel',   'Spokane WA',    '#0891B2'),
  ('Boise Locker',    'Boise ID',      '#DB2777');

-- ============================================
-- PROFILES (for existing auth users)
-- Run these UPDATE statements after the team signs up,
-- or manually insert if you know their auth.users UUIDs.
-- ============================================
-- To manually seed profiles for testing, first create
-- the auth users via Supabase dashboard or auth signup,
-- then the handle_new_user trigger will auto-create profiles.
--
-- After signup, update profiles with correct names/initials:
--
-- UPDATE public.profiles SET name = 'Stephen Ward', initials = 'SW' WHERE id = '<stephen-uuid>';
-- UPDATE public.profiles SET name = 'Nicole Ward',  initials = 'NW' WHERE id = '<nicole-uuid>';
-- UPDATE public.profiles SET name = 'Hannah',       initials = 'HN' WHERE id = '<hannah-uuid>';
-- UPDATE public.profiles SET name = 'Grace',        initials = 'GR' WHERE id = '<grace-uuid>';
