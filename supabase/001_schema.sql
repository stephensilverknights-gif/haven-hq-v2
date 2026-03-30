-- HavenHQ Schema
-- Run this in Supabase SQL Editor

-- Drop old tables if they exist (from previous version)
DROP TABLE IF EXISTS public.hot_sheet_costs CASCADE;
DROP TABLE IF EXISTS public.hot_sheet_notes CASCADE;
DROP TABLE IF EXISTS public.hot_sheet_items CASCADE;

-- Drop new tables if re-running
DROP TABLE IF EXISTS public.cost_entries CASCADE;
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.issues CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT NOT NULL,
  initials TEXT NOT NULL,
  role TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert profiles"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, initials)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    UPPER(LEFT(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 2))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PROPERTIES
-- ============================================
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  market TEXT NOT NULL,
  address TEXT,
  color_tag TEXT DEFAULT '#5B5BD6',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read properties"
  ON public.properties FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage properties"
  ON public.properties FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ISSUES (core object)
-- ============================================
CREATE TABLE public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES public.properties NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('guest_request', 'maintenance', 'vendor', 'cleaner')),
  priority TEXT NOT NULL CHECK (priority IN ('on_fire', 'urgent', 'watch')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_response', 'vendor_scheduled', 'resolved')),
  slack_note TEXT,
  slack_note_updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.profiles,
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read issues"
  ON public.issues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create issues"
  ON public.issues FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update issues"
  ON public.issues FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- ACTIVITY LOG (immutable append-only)
-- ============================================
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues NOT NULL,
  user_id UUID REFERENCES public.profiles NOT NULL,
  note TEXT NOT NULL,
  status_from TEXT,
  status_to TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read activity log"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert activity log"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- No update or delete policies — append only

-- ============================================
-- COST ENTRIES
-- ============================================
CREATE TABLE public.cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES public.issues NOT NULL,
  logged_by UUID REFERENCES public.profiles NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  vendor_name TEXT,
  description TEXT NOT NULL,
  receipt_url TEXT,
  reimbursable TEXT DEFAULT 'none' CHECK (reimbursable IN ('none', 'guest_owes', 'landlord_owes', 'haven_owes')),
  reimbursable_from TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cost_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cost entries"
  ON public.cost_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create cost entries"
  ON public.cost_entries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update cost entries"
  ON public.cost_entries FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- STORAGE BUCKET for receipts
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Anyone can view receipts"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'receipts');
