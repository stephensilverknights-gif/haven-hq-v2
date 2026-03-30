# HavenHQ

Shift-handoff and issue tracking app for Haven by Design Stays.
Production app used daily by a 4-person team across ~22 rental units in 4 markets.

## Full spec
**Read `SPEC.md` before making any changes.** It contains the complete build spec: tech stack, design system (colors, radii, fonts), Supabase schema, animation values, component specs, and mobile behavior rules. Do not deviate from it.

## Build status (updated 2026-03-28)
Steps 1–11 COMPLETE (scaffold, auth, Hot Sheet, IssueCard, NewIssueModal, IssueDetail, ActivityLog, CostEntry, AllIssues, CostsView, TopNav, mobile responsive pass, Vercel deploy config).

**Remaining:**
- 21st Magic MCP polish pass on components

## Key rules
- Use Shadcn/UI for every UI primitive
- Use Framer Motion for every transition (see SPEC.md for exact easing values)
- Use React Query for all data fetching
- Use 21st Magic MCP (`21st_magic_component_builder` or `21st_magic_component_inspiration`) before writing any new component from scratch
- Lucide React for all icons (strokeWidth 1.5, size 18-20)
- Do not invent colors or spacing — everything is in SPEC.md
