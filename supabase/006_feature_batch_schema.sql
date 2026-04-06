-- ============================================================================
-- 006: Feature batch schema — issue types, reservations, due dates, cost direction
-- ============================================================================
-- Run in the Supabase SQL editor (Dashboard → SQL Editor).
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT).
-- ============================================================================

-- ── Issue Types (replaces CHECK constraint) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.issue_types (
  id TEXT PRIMARY KEY,              -- slug e.g. 'guest_request'
  label TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Circle', -- Lucide icon name
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.issue_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read issue types"
  ON public.issue_types FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage issue types"
  ON public.issue_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed existing + new types
INSERT INTO public.issue_types (id, label, icon, sort_order) VALUES
  ('guest_request', 'Guest Request',  'MessageSquare', 0),
  ('maintenance',   'Maintenance',    'Wrench',        1),
  ('cleaner',       'Cleaner',        'Sparkles',      2),
  ('vendor',        'Vendor',         'Truck',         3),
  ('reservation',   'Reservation',    'CalendarCheck',  4),
  ('parking',       'Parking',        'ParkingCircle', 5)
ON CONFLICT (id) DO NOTHING;

-- Drop old CHECK and add FK
ALTER TABLE public.issues DROP CONSTRAINT IF EXISTS issues_type_check;
-- (FK is idempotent via IF NOT EXISTS on the constraint name)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'issues_type_fkey'
  ) THEN
    ALTER TABLE public.issues
      ADD CONSTRAINT issues_type_fkey FOREIGN KEY (type) REFERENCES public.issue_types(id);
  END IF;
END $$;


-- ── Reservations (Hostaway cache) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.reservations (
  id TEXT PRIMARY KEY,                              -- Hostaway reservation ID
  property_id UUID REFERENCES public.properties,
  hostaway_listing_id TEXT,
  guest_name TEXT,
  guest_email TEXT,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT,
  raw_data JSONB,
  synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_property ON public.reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations(check_in, check_out);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read reservations"
  ON public.reservations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage reservations"
  ON public.reservations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Also allow authenticated to insert/update (edge function uses user token)
CREATE POLICY "Authenticated users can manage reservations"
  ON public.reservations FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ── Properties: Hostaway listing ID ────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'hostaway_listing_id'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN hostaway_listing_id TEXT;
  END IF;
END $$;


-- ── Issues: reservation link + due date ────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issues' AND column_name = 'reservation_id'
  ) THEN
    ALTER TABLE public.issues ADD COLUMN reservation_id TEXT REFERENCES public.reservations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issues' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE public.issues ADD COLUMN due_date TIMESTAMPTZ;
  END IF;
END $$;


-- ── Cost entries: direction + paid ─────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cost_entries' AND column_name = 'direction'
  ) THEN
    ALTER TABLE public.cost_entries
      ADD COLUMN direction TEXT NOT NULL DEFAULT 'expense'
      CHECK (direction IN ('expense', 'income'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cost_entries' AND column_name = 'paid'
  ) THEN
    ALTER TABLE public.cost_entries ADD COLUMN paid BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;
