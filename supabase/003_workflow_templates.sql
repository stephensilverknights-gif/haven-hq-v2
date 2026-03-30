-- ============================================================
-- Migration 003: Workflow Templates + Issue Checklist Items
-- Run this in Supabase SQL Editor
-- ============================================================

-- Workflow templates (reusable step sequences)
create table public.workflow_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  steps       jsonb not null default '[]',
  -- steps format: [{"id": "uuid", "label": "Step text", "order": 0}, ...]
  created_by  uuid references public.profiles(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.workflow_templates enable row level security;

create policy "Authenticated users can read workflow templates"
  on public.workflow_templates for select to authenticated using (true);
create policy "Authenticated users can insert workflow templates"
  on public.workflow_templates for insert to authenticated with check (true);
create policy "Authenticated users can update workflow templates"
  on public.workflow_templates for update to authenticated using (true);
create policy "Authenticated users can delete workflow templates"
  on public.workflow_templates for delete to authenticated using (true);


-- Issue checklist items (per-issue instances of template steps)
create table public.issue_checklist_items (
  id           uuid primary key default gen_random_uuid(),
  issue_id     uuid references public.issues(id) on delete cascade not null,
  label        text not null,
  order_index  int not null default 0,
  completed    boolean default false,
  completed_by uuid references public.profiles(id),
  completed_at timestamptz,
  created_at   timestamptz default now()
);

alter table public.issue_checklist_items enable row level security;

create policy "Authenticated users can read checklist items"
  on public.issue_checklist_items for select to authenticated using (true);
create policy "Authenticated users can insert checklist items"
  on public.issue_checklist_items for insert to authenticated with check (true);
create policy "Authenticated users can update checklist items"
  on public.issue_checklist_items for update to authenticated using (true);
create policy "Authenticated users can delete checklist items"
  on public.issue_checklist_items for delete to authenticated using (true);


-- ============================================================
-- Seed: ECI / LCO workflow template
-- ============================================================
insert into public.workflow_templates (name, description, steps) values (
  'ECI / LCO Request',
  'Early Check-In or Late Check-Out request — runs the same every time.',
  '[
    {"id": "s1", "label": "Ask guest for desired time (if not already provided)", "order": 0},
    {"id": "s2", "label": "Confirm fee awareness with guest", "order": 1},
    {"id": "s3", "label": "Check availability with cleaner team", "order": 2},
    {"id": "s4", "label": "Confirm to guest it''s doable + send payment request (Airbnb or card charge)", "order": 3},
    {"id": "s5", "label": "Adjust reservation time in Hostaway + make a note", "order": 4},
    {"id": "s6", "label": "Update ECI/LCO tracker", "order": 5},
    {"id": "s7", "label": "Confirm final timing with cleaner", "order": 6}
  ]'::jsonb
);
