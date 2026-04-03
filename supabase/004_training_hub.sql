-- ============================================
-- HAVEN TRAINING HUB — Schema + Seed Data
-- Run this in Supabase SQL Editor
-- ============================================

-- ── Extend profiles with training fields ────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_rep_target INT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS is_training_admin BOOLEAN DEFAULT false;

-- ── Haven Standards (playbook backbone — drives scoring) ────────────────────

CREATE TABLE public.haven_standards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_type TEXT UNIQUE NOT NULL,
  standard_text TEXT NOT NULL,
  examples TEXT,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.haven_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read haven standards"
  ON public.haven_standards FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage haven standards"
  ON public.haven_standards FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Scenario Library ────────────────────────────────────────────────────────

CREATE TABLE public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  property TEXT,
  issue_type TEXT CHECK (issue_type IN (
    'maintenance', 'cleanliness', 'early_checkin', 'late_checkout',
    'noise', 'amenity_failure', 'lockout', 'refund_demand',
    'neighbor_complaint', 'booking_error', 'other'
  )),
  brief TEXT NOT NULL,
  guest_persona TEXT NOT NULL,
  haven_standard TEXT NOT NULL,
  source TEXT CHECK (source IN ('handcrafted', 'hostaway', 'field')) DEFAULT 'handcrafted',
  hostaway_conversation_id TEXT,
  approved BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  times_used INT DEFAULT 0,
  avg_score_when_used NUMERIC(5,2),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scenarios"
  ON public.scenarios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage scenarios"
  ON public.scenarios FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Training Sessions (one per rep) ─────────────────────────────────────────

CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES public.profiles(id) NOT NULL,
  scenario_id UUID REFERENCES public.scenarios(id) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  exchange_count INT DEFAULT 0,
  transcript JSONB DEFAULT '[]'::jsonb,
  score_overall INT,
  score_empathy INT,
  score_action INT,
  score_tone INT,
  score_resolution INT,
  score_no_policy INT,
  grade TEXT CHECK (grade IN ('Excellent', 'Good', 'Needs Work', 'Failing')),
  feedback TEXT,
  coaching TEXT,
  flagged_for_review BOOLEAN DEFAULT false,
  flag_reason TEXT
);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read training sessions"
  ON public.training_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create training sessions"
  ON public.training_sessions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update training sessions"
  ON public.training_sessions FOR UPDATE
  TO authenticated
  USING (true);

CREATE INDEX idx_training_sessions_trainee_date
  ON public.training_sessions (trainee_id, started_at);

-- ── Daily Summaries (pre-aggregated per user) ───────────────────────────────

CREATE TABLE public.daily_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES public.profiles(id) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  reps_completed INT DEFAULT 0,
  reps_required INT DEFAULT 10,
  avg_score NUMERIC(5,2),
  highest_score INT,
  lowest_score INT,
  lowest_criteria TEXT,
  easy_count INT DEFAULT 0,
  medium_count INT DEFAULT 0,
  hard_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(trainee_id, date)
);

ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily summaries"
  ON public.daily_summaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage daily summaries"
  ON public.daily_summaries FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Trainee Scenario History (for smart rotation) ───────────────────────────

CREATE TABLE public.trainee_scenario_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainee_id UUID REFERENCES public.profiles(id) NOT NULL,
  scenario_id UUID REFERENCES public.scenarios(id) NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  times_used INT DEFAULT 1,
  best_score INT,
  latest_score INT,
  UNIQUE(trainee_id, scenario_id)
);

ALTER TABLE public.trainee_scenario_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scenario history"
  ON public.trainee_scenario_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage scenario history"
  ON public.trainee_scenario_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ── Hostaway Import Log ─────────────────────────────────────────────────────

CREATE TABLE public.hostaway_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hostaway_conversation_id TEXT UNIQUE NOT NULL,
  hostaway_property_id TEXT,
  property_name TEXT,
  raw_transcript JSONB,
  message_count INT,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  classified_issue_type TEXT,
  sentiment_score NUMERIC(3,2),
  escalation_detected BOOLEAN DEFAULT false,
  refund_requested BOOLEAN DEFAULT false,
  review_threatened BOOLEAN DEFAULT false,
  worth_converting BOOLEAN,
  converted_to_scenario BOOLEAN DEFAULT false,
  scenario_id UUID REFERENCES public.scenarios(id),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hostaway_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read hostaway imports"
  ON public.hostaway_imports FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage hostaway imports"
  ON public.hostaway_imports FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- SEED DATA
-- ============================================

-- ── Haven Standards (10 issue types) ────────────────────────────────────────

INSERT INTO public.haven_standards (issue_type, standard_text) VALUES
('maintenance',
 'Acknowledge the discomfort personally and immediately. Offer a concrete next step with a timeframe under 1 hour. Do not promise a refund upfront — offer only if the fix cannot happen. Validate the guest before problem-solving.'),
('cleanliness',
 'Own it without explanation or excuse. Apologize genuinely. Offer a re-clean within 2 hours or replacement same day. Partial refund 10-20% is appropriate for verified issues — do not lead with it but do not withhold it. Never argue about standards.'),
('amenity_failure',
 'A failed booked amenity is a legitimate grievance. Dispatch a fix attempt immediately. If unresolvable, proactively offer partial refund without the guest having to ask. Acknowledge the emotional impact, not just the functional one.'),
('lockout',
 'First response must contain a real action — not we are looking into it. Backup code or live phone support within minutes. Hotel night offered if unresolved past 15 minutes. Every second matters.'),
('noise',
 'Do not take sides. Acknowledge frustration first. Frame the check-in as standard process, not accusation. Set clear quiet hours. Keep it warm. Preserve the relationship for remaining nights.'),
('early_checkin',
 'Empathize with travel fatigue before logistics. Check actual cleaner status before defaulting to no. If turnover is not active, early entry may be possible. If not, offer specific nearby options with a firm confirmed ETA.'),
('late_checkout',
 'Empathize with the request. Check next booking gap before refusing. If possible, accommodate with a small fee or as a goodwill gesture. If not, give a firm time with a warm explanation.'),
('refund_demand',
 'Never lead with a refund. Lead with understanding and resolution. Offer a fix first. Partial refund appropriate when fix is impossible or inadequate — calibrate to severity. Full refunds require documented cause.'),
('neighbor_complaint',
 'De-escalate on both sides. With the guest: do not accuse, set expectations, preserve warmth. Document internally. Follow up after quiet hours to confirm resolution.'),
('booking_error',
 'Own the error immediately regardless of cause. Offer a concrete fix within the hour. If the guest is inconvenienced, a goodwill gesture is appropriate. Never make the guest feel like the error is their problem to solve.');

-- ── Starter Scenarios ───────────────────────────────────────────────────────

INSERT INTO public.scenarios (title, difficulty, property, issue_type, brief, guest_persona, haven_standard, source, approved, active) VALUES

-- EASY
('Wi-Fi Not Connecting',
 'easy', 'Sunset Loft', 'amenity_failure',
 'A guest has just checked in and cannot connect to the Wi-Fi. They are polite but need help quickly as they have a work call in 30 minutes.',
 'Friendly professional traveler. Patient but time-pressured. Will appreciate quick, clear instructions. Gets mildly frustrated if given vague or overly technical answers.',
 'A failed booked amenity is a legitimate grievance. Dispatch a fix attempt immediately. If unresolvable, proactively offer partial refund without the guest having to ask. Acknowledge the emotional impact, not just the functional one.',
 'handcrafted', true, true),

('Parking Confusion',
 'easy', 'Harbor View', 'booking_error',
 'A guest cannot find the designated parking spot mentioned in their booking confirmation. They are circling the block with luggage in the car.',
 'Slightly flustered first-time guest. Friendly tone but clearly stressed from driving around. Will calm down quickly once given clear directions.',
 'Own the error immediately regardless of cause. Offer a concrete fix within the hour. If the guest is inconvenienced, a goodwill gesture is appropriate. Never make the guest feel like the error is their problem to solve.',
 'handcrafted', true, true),

('Check-in Time Question',
 'easy', 'Mountain Retreat', 'early_checkin',
 'A guest is arriving 2 hours early and politely asks if they can check in ahead of schedule. The property is currently being cleaned.',
 'Easygoing couple on vacation. Understanding of policies but hopeful for early access. Will accept alternatives gracefully if presented warmly.',
 'Empathize with travel fatigue before logistics. Check actual cleaner status before defaulting to no. If turnover is not active, early entry may be possible. If not, offer specific nearby options with a firm confirmed ETA.',
 'handcrafted', true, true),

-- MEDIUM
('Hair in the Bathroom',
 'medium', 'Downtown Suite', 'cleanliness',
 'A guest found hair in the bathroom and on the bed linens. They are upset and questioning the cleanliness of the entire unit. They want to know what you are going to do about it.',
 'Disappointed business traveler who pays premium prices and expects premium standards. Not yelling, but clearly unimpressed. Will push back on generic apologies. Wants to see concrete action and acknowledgment that this is not acceptable.',
 'Own it without explanation or excuse. Apologize genuinely. Offer a re-clean within 2 hours or replacement same day. Partial refund 10-20% is appropriate for verified issues — do not lead with it but do not withhold it. Never argue about standards.',
 'handcrafted', true, true),

('Broken AC in Summer',
 'medium', 'Sunset Loft', 'maintenance',
 'The air conditioning stopped working on a 95°F day. The guest has a toddler and is worried about the heat. They messaged an hour ago with no response.',
 'Worried parent, increasingly frustrated by the lack of response. Started calm but the delayed reply has eroded trust. Needs to see urgency and a real plan — not platitudes. Will escalate to a review threat if they feel dismissed.',
 'Acknowledge the discomfort personally and immediately. Offer a concrete next step with a timeframe under 1 hour. Do not promise a refund upfront — offer only if the fix cannot happen. Validate the guest before problem-solving.',
 'handcrafted', true, true),

('Late Checkout Request',
 'medium', 'Harbor View', 'late_checkout',
 'A guest requests a 3pm checkout instead of the standard 11am. There is another booking arriving at 4pm. The guest says they are feeling unwell and need extra rest.',
 'Genuinely unwell guest who is not exaggerating. Reasonable in tone but firm about needing the extra time. Will feel dismissed if given a flat no. Responds well to creative compromises.',
 'Empathize with the request. Check next booking gap before refusing. If possible, accommodate with a small fee or as a goodwill gesture. If not, give a firm time with a warm explanation.',
 'handcrafted', true, true),

-- HARD
('Noise Complaint at 11 PM',
 'hard', 'Downtown Suite', 'noise',
 'A guest is calling about loud music from the unit next door at 11 PM. They have an early flight and have already knocked on the neighbor''s door with no result. They are furious.',
 'Exhausted and angry guest. Has already tried to solve it themselves and failed. Zero patience for scripted responses. Will threaten a negative review and demand immediate action. Only softens when they see real steps being taken with a specific timeline. Will escalate if you side with the other party or sound noncommittal.',
 'Do not take sides. Acknowledge frustration first. Frame the check-in as standard process, not accusation. Set clear quiet hours. Keep it warm. Preserve the relationship for remaining nights.',
 'handcrafted', true, true),

('Lockout at 2 AM',
 'hard', 'Mountain Retreat', 'lockout',
 'A guest is locked out of the property at 2 AM. The smart lock code is not working and they are standing outside in the cold with their luggage. They have been trying for 20 minutes.',
 'Frustrated, tired, and borderline hostile. Has been standing in the cold for 20 minutes already. Every second of delay makes it worse. Will not accept "we will look into it" — needs an immediate action. Threatens to book a hotel and demand full reimbursement. Only calms down when given a real solution with a specific timeframe in minutes, not hours.',
 'First response must contain a real action — not we are looking into it. Backup code or live phone support within minutes. Hotel night offered if unresolved past 15 minutes. Every second matters.',
 'handcrafted', true, true);
