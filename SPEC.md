# HavenHQ — Build Spec

## What this is
HavenHQ is a shift-handoff and active issue tracking app for Haven by Design Stays, a short-term and mid-term rental operation running ~22 units across 4 markets. The team (Stephen, Nicole, Hannah, Grace) hands off guest coordination, cleaner coordination, and vendor issues across shifts. This app is the single source of truth for what's happening right now and what needs to happen next.

This is a production app that will be used daily by a real team. Design quality is non-negotiable. It must feel premium, smooth, and satisfying to use — think high-end SaaS, not a starter template.

## Tech stack — do not deviate
- React + TypeScript
- Vite (not Next.js)
- Tailwind CSS
- Shadcn/UI — install and use for every UI primitive
- Lucide React — all icons, stroke weight 1.5, size 18–20px
- Framer Motion — all card transitions, status changes, modal opens
- Supabase — auth + database + storage (receipt photo uploads)
- React Router v6 — client-side routing
- React Query (TanStack) — all data fetching and cache management
- Vercel — deployment target

## Design system — locked values
```
Primary color:     #5B5BD6  (Haven indigo)
Primary hover:     #4A4AC4
Page background:   #F4F4F8  (cool off-white)
Card background:   #FFFFFF
Border color:      #E4E4E7  (zinc-200)
Text primary:      #09090B  (zinc-950)
Text secondary:    #71717A  (zinc-500)
Text muted:        #A1A1AA  (zinc-400)

Priority — On Fire:   background #FEF2F2  text #991B1B  border #FCA5A5  left-border #DC2626
Priority — Urgent:    background #FFFBEB  text #92400E  border #FCD34D  left-border #D97706
Priority — Watch:     background #F0FDF4  text #065F46  border #6EE7B7  left-border #059669

Border radius:  cards 12px, buttons 8px, badges 20px, inputs 8px
Font:           Inter (import from Google Fonts)
Spacing unit:   4px base (use Tailwind spacing scale)
```

## Supabase schema
```sql
-- profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users primary key,
  name text not null,
  initials text not null,
  role text,
  created_at timestamptz default now()
);

-- properties
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  market text not null,
  address text,
  color_tag text default '#5B5BD6',
  active boolean default true,
  created_at timestamptz default now()
);

-- issues (core object)
create table public.issues (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties not null,
  title text not null,
  description text,
  type text not null check (type in ('guest_request','maintenance','vendor','cleaner')),
  priority text not null check (priority in ('on_fire','urgent','watch')),
  status text not null default 'open' check (status in ('open','in_progress','pending_response','vendor_scheduled','resolved')),
  slack_note text,
  slack_note_updated_at timestamptz,
  created_by uuid references public.profiles not null,
  created_at timestamptz default now(),
  updated_by uuid references public.profiles,
  updated_at timestamptz default now(),
  resolved_at timestamptz
);

-- activity_log (immutable append-only)
create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.issues not null,
  user_id uuid references public.profiles not null,
  note text not null,
  status_from text,
  status_to text,
  created_at timestamptz default now()
);

-- cost_entries
create table public.cost_entries (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.issues not null,
  logged_by uuid references public.profiles not null,
  amount numeric(10,2) not null,
  vendor_name text,
  description text not null,
  receipt_url text,
  reimbursable text default 'none' check (reimbursable in ('none','guest_owes','landlord_owes','haven_owes')),
  reimbursable_from text,
  date date default current_date,
  created_at timestamptz default now()
);
```

RLS enabled on all tables. All authenticated users can read and write all records.

## Seed data
Properties: Lolo Loft 101 (N. Idaho, #5B5BD6), Bier Haus Loft (N. Idaho, #059669), Buttercup (N. Idaho, #D97706), Sherman Arms (N. Idaho, #DC2626), Bell Cottage (Sarasota FL, #7C3AED), Bickett Hotel (Spokane WA, #0891B2), Boise Locker (Boise ID, #DB2777)

Users: Stephen Ward (SW), Nicole Ward (NW), Hannah (HN), Grace (GR)

## Routes
- `/` — Hot Sheet (default view)
- `/issues` — All Issues (with filters)
- `/costs` — Costs View
- `/login` — Auth

## Animation rules — Framer Motion
```js
// Card entrance (stagger children on hot sheet load)
initial: { opacity: 0, y: 8 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] }

// Slide-in panel (issue detail)
initial: { x: '100%', opacity: 0 }
animate: { x: 0, opacity: 1 }
transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] }

// Modal (new issue)
initial: { opacity: 0, scale: 0.97, y: 8 }
animate: { opacity: 1, scale: 1, y: 0 }
transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] }

// Status badge change
layoutId on status indicator
transition: { type: 'spring', stiffness: 400, damping: 30 }

// Stagger card list: staggerChildren: 0.04
```

## Mobile behavior
- Hot sheet cards: full width, same left border treatment, larger touch targets (min 48px height)
- New Issue: bottom sheet (slides up from bottom edge)
- Issue Detail: full screen overlay with back button top-left
- Top nav: collapses to just the logo + avatar + hamburger
- All tap targets minimum 44x44px

## Component specs

### IssueCard
- White card, 12px radius, 1px zinc-200 border
- Left border 4px solid — color by priority (red/amber/teal)
- On hover: subtle scale(1.005) + border-color darkens — Framer Motion whileHover
- Layout: property badge top-left, priority badge top-right, title bold 15px, last note 13px muted truncated, footer row with avatar + name left, elapsed time right
- On Fire cards only: pulsing red dot (CSS animation) next to elapsed timer when > 2hrs

### NewIssueModal
- Framer Motion slide-up from bottom on mobile, center modal on desktop
- Fields: Property (select), Issue Type (select), Priority (select — colored preview), Title (input), Description (textarea), Initial note (textarea, required)
- On submit: creates issue + first activity_log entry in a single transaction
- Validation inline, no page refresh

### IssueDetail (slide-in panel)
- Header: property badge, priority badge, status stepper
- Status stepper: horizontal row of steps (Open → In Progress → Pending Response → Vendor Scheduled → Resolved). Current step highlighted in Haven indigo. Clicking a step opens inline textarea for required note, saves status change + log entry together.
- Slack Note section: text field + timestamp. "Update" button saves and logs.
- Activity Log: reverse-chronological. Each entry: user avatar + name, timestamp (relative), note, status change indicator. Append-only.
- Cost Entries: list + "Add Cost" button with inline form (amount, vendor, description, reimbursable toggle, receipt upload).
- Resolve button at bottom.

### ElapsedTimer
- Live updating, takes startTime ISO string, displays HH:MM, updates every minute
- Color: red if On Fire, amber if Urgent
- Pulsing red dot when On Fire > 2 hours

### PriorityBadge
- On Fire: bg-red-50 text-red-800 border-red-200, Flame icon
- Urgent: bg-amber-50 text-amber-800 border-amber-200, Clock icon
- Watch: bg-green-50 text-green-800 border-green-200, Eye icon

## Build status
Steps 1-11 COMPLETE. Remaining:
- 21st Magic MCP polish pass on components

## Use 21st Magic MCP
For every component, use @21st-dev/magic MCP tool first. Call 21st_magic_component_builder or 21st_magic_component_inspiration before writing any component from scratch.
