# Patria — Catholic Household OS

## Original Problem Statement
A structured operating system for intentional Catholic family life. Repositioned from a prayer/devotional tracker into the executive layer that runs the home. Spiritual disciplines are one component among many.

## Brand
- Name: **Patria**
- Wordmark: `Patria.` (gold liturgical-white period)
- Tagline: *An operating system for the intentional Catholic family.*
- Restraint • Editorial typography • Liturgical accent system • Calm executive feel.

## Architecture
- **Frontend:** React 19, React Router 7, Tailwind, Radix/shadcn, axios. Fraunces serif + Geist sans + JetBrains Mono. Light "bone white" + dark "candlelight". `Crest` SVG monogram + `CrestDivider` + `SacredHeartEngraving` for restrained editorial DNA.
- **Backend:** FastAPI (`/api` prefix), MongoDB (motor), Pydantic v2. Liturgical engine supports Roman + Traditional Roman variants (Septuagesima/Sexagesima/Quinquagesima, "Sundays after Pentecost/Epiphany", proper ferial naming like *"Tuesday — II Week in Ordinary Time"*).
- **Auth:** Emergent-managed Google OAuth (cookie + Bearer fallback).
- **Mongo collections:** users, user_sessions, households, members, rules, rule_checkins, prayer_logs, challenges, challenge_checkins, budget_categories, budget_transactions, savings_goals, events, tasks, family_goals, **meetings, rhythms**.

## Information Architecture (sidebar — 8 items)
01. **Dashboard** — command center · Household Health (diagnostic, not gamified) · Council CTA
02. **Family Council** — weekly meeting workspace · auto-composed agenda · printable summary · finalize creates Tasks
03. **Spiritual Life** — tabs: Liturgical Calendar · Prayer Rhythm · Seasons · **Sacred Heart** (optional anchor)
04. **Household Order** — 7 systems of the family
05. **Budget & Stewardship** — categories, ledger, savings goals, tithe %, stewardship principles
06. **Mission & Goals** — mission statement, values, technology policy, member roles, short/long goals
07. **Schedule** — events + tasks + **Household Rhythms** (daily/weekly/monthly/quarterly/yearly recurring commitments)
08. **Members** — relational center, household health, parents/children, technology policy

## User Personas
- **The Householder Father / Mother** (25–50): runs the family with intentional discipline; wants a calm command center.
- **Both Spouses Aligned:** mission, budget, schedule, formation — one place.
- **The Child:** parent-controlled profile.

## Core Requirements (static)
1. **Dashboard** — single-glance liturgical day, Household Health composite, today's schedule, tasks, budget, prayer streak, goals, date night, mission, council CTA, active season.
2. **Family Council** — weekly executive ritual; agenda from past 7 days; priorities, assignments, notes, decisions; finalize → tasks.
3. **Spiritual Life** — Liturgical Calendar (Roman/Traditional), Prayer Rhythm, Seasons, Sacred Heart.
4. **Sacred Heart** — optional enthronement workflow with Form A (priest-led) and Form B (family), Act of Consecration, yearly renewal.
5. **Household Order** — 7-system rule of life, daily/weekly cadence, per-member assignment.
6. **Budget & Stewardship** — categories, ledger, tithe %, savings goals, principles. Calm, premium.
7. **Mission & Goals** — mission, values, technology policy, roles, short/long goals.
8. **Schedule** — events (date/time/type/members), tasks (assignee/category/due), **rhythms** (cyclical commitments).
9. **Members** — mission preview, health score, parent/child sections, technology policy.

## Implemented
### v0.1 (Jan 2026) — Domus
- Landing, Emergent Google Auth, onboarding
- Today, Calendar, Rule of Life, Prayer, Challenges, Members, Settings
- 34/34 backend + 100% frontend e2e

### v0.2 — Patria restructure
- Rename to Patria
- New IA (7 then 8 items), Dashboard command center
- Budget & Stewardship, Mission & Goals, Schedule, expanded Members
- Liturgical color system as semantic data
- 68/68 backend + 100% frontend e2e

### v0.3 — Refinement (current)
- **Family Council** module: agenda auto-composer, working session, finalize → Tasks (idempotent)
- **Sacred Heart** tab: hero engraving (inline monochrome SVG with restrained oxblood drop), 3-step "How it works", ceremony Form A (priest) + Form B (family), Act of Consecration, optional yearly renewal — entirely optional, never mandatory
- **Liturgical engine v2:** proper ferial naming (no more generic "Feria"); Traditional Roman variant overlay (Septuagesima/Sexagesima/Quinquagesima, "Sundays after Epiphany/Pentecost"); calendar variant fetched from household settings; Dashboard rank chip hidden on ferial days
- **Household Rhythms** (recurring commitments) in Schedule with cadence-aware next-due
- **Crest** monogram and `CrestDivider` introduced as restrained visual DNA across AppShell, Council, Sacred Heart
- **Dashboard refresh:** "Household health" framing (reflective, not a trophy); Council CTA panel
- **Members cleanup:** removed duplicate Roles section (now only on Mission)
- **Landing:** 8-module list
- 93/93 backend + 100% frontend e2e

## Backlog
### P0 (next session)
- Split `server.py` (~1,625 lines) into routers (council, sacred_heart, rhythms, liturgical, budget, schedule, tasks, goals, household)
- Calendar-aware `_next_due` math for rhythms (use `dateutil.relativedelta`)
- Streak sparklines per rule on Household Order

### P1
- AI module (Claude Sonnet 4.5): mission-statement coach, weekly Council agenda enrichment, child-formation prompts, gentle reflection on the past week
- PWA push notifications anchored to Angelus / Compline / Council day
- Recurring events + recurring tasks (chore rota)
- Weighted Household Health (cadence + assignment-aware)
- Saint database with biographical pages and feast-day actions

### P2
- "Liturgical Year Wrap" — printable annual report
- Stripe paid plan
- Native mobile (Capacitor)
- Full Byzantine calendar
- Multi-user shared households (spouse co-edit)

## Test Credentials
See `/app/memory/test_credentials.md`. Demo session: `SESSION_TOKEN=demo_session_patria`, household `hh_demo_patria`.
