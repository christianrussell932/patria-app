# Patria — Catholic Household OS

## Original Problem Statement
Build a structured operating system for intentional Catholic family life. **Strategic shift (Jan 2026):** the product is repositioned from "Catholic prayer/devotional tracker" to **"a full operating system for intentional Catholic family life."** Spiritual disciplines remain important, but become **one component** of a larger executive layer that runs the home.

## Brand
- Name: **Patria** (renamed from Domus on Jan 2026)
- Wordmark: `Patria.` with gold liturgical-white period
- Tagline: *An operating system for the intentional Catholic family.*

## Architecture
- **Frontend:** React 19, React Router 7, Tailwind, Radix/shadcn primitives, axios. Editorial typography (Fraunces serif + Geist sans + JetBrains Mono). Light "bone white" + dark "candlelight" themes. Liturgical color system as semantic data accents.
- **Backend:** FastAPI (`/api` prefix), MongoDB (motor), Pydantic v2. Liturgical engine (Easter via Meeus algorithm; seasons, fixed feasts, fasting/abstinence rules).
- **Auth:** Emergent-managed Google OAuth (cookie + Bearer fallback).
- **Mongo collections:** users, user_sessions, households, members, rules, rule_checkins, prayer_logs, challenges, challenge_checkins, **budget_categories, budget_transactions, savings_goals, events, tasks, family_goals**.

## Information Architecture (sidebar)
1. **Dashboard** — command center
2. **Spiritual Life** — Liturgical Calendar · Prayer · Seasons (tabs)
3. **Household Order** — 7 systems (Spiritual, Financial, Order, Marriage, Children, Health, Hospitality)
4. **Budget & Stewardship** — categories, transactions, tithe %, savings goals
5. **Mission & Goals** — mission statement, values, technology policy, roles, short/long goals
6. **Schedule** — events + tasks for the next 30 days
7. **Members** — relational center: mission preview, household health score, parents/children, roles, technology policy

## User Personas
- **The Householder Father / Mother** (25–50): runs the family with intentional discipline; needs an executive command center, not another prayer app.
- **Both Spouses Aligned:** mission, budget, schedule, formation — all in one place.
- **The Child:** parent-controlled profile; appears in roles, rules, prayer matrix, challenges.

## Core Requirements (static)
1. **Dashboard / Command Center** — single-glance liturgical day, weekly composite score (rule + prayer + tasks + budget), today's schedule, tasks due, budget snapshot with over-budget alerts, prayer streak, goals progress, date night, mission preview, active season.
2. **Spiritual Life** — Liturgical Calendar (full Roman year), Prayer Tracker (member×prayer matrix + 7-day household stats), Seasons (5 templates: Advent Jesse Tree, Lent 40, Exodus 90, Marian 33, Rosary 54).
3. **Household Order** — 7-system rule of life, daily/weekly cadence, per-member assignment.
4. **Budget & Stewardship** — monthly categories with limits + progress bars, ledger, tithe %, savings goals, stewardship principles. Calm, premium — not Mint or YNAB.
5. **Mission & Goals** — family mission statement, values list (chips), technology policy, per-member roles, short/long goals with progress sliders.
6. **Schedule** — events (date/time/type/members), tasks (assignee/category/due/completed); 30-day timeline.
7. **Members** — mission preview, household health score (4 sub-bars), parent/child sections, roles, technology policy.

## Implemented (Jan 2026)
### MVP v0.1 — Domus
- Marketing landing, Emergent Google Auth (synchronous hash detection, useRef-guarded callback), 3-step onboarding
- Today (breviary), Liturgical Calendar, Rule of Life (7 monastic pillars), Prayer Tracker, Challenges, Members, Settings
- Backend 100% (34/34), Frontend 100% e2e

### v0.2 — Patria restructure (current)
- Brand rename Domus → Patria everywhere
- New IA: Dashboard / Spiritual Life / Household Order / Budget & Stewardship / Mission & Goals / Schedule / Members
- New Dashboard with composite weekly score, all panels per spec
- Spiritual Life consolidates Calendar + Prayer + Challenges into tabs
- Household Order replaces monastic pillars with 7 actionable systems (Spiritual, Financial, Order, Marriage, Children, Health, Hospitality) — legacy rules continue to render under mapped categories
- Budget & Stewardship: full category/transaction CRUD, monthly summary, savings goals with inline progress, stewardship principles sidebar
- Mission & Goals: mission statement, values, technology policy, member roles, short/long goal management with progress sliders
- Schedule: events grouped by date, tasks with assignment + categories, 30-day window
- Members: relational center with mission preview, household health score, roles list, technology policy
- Legacy URL redirects (/today, /calendar, /rule, /prayer, /challenges, /household)
- Backend 100% (68/68 — 34 new + 34 regression), Frontend 100% e2e

## Backlog
### P0 (next session)
- Streak/sparklines on Order page (rule completion last 30 days per rule)
- Empty-state CTAs on Dashboard linking to next-best action

### P1
- AI module (Claude Sonnet 4.5): mission-statement copilot, weekly family-meeting agenda generator, child-formation prompts
- PWA push notifications anchored to Angelus / Compline
- Recurring events + recurring tasks (chore rota)
- Weighted weekly score (cadence + assignment-aware)
- Splitting server.py into routers (auth/household/budget/schedule/etc.)

### P2
- "Liturgical Year Wrap" — printable annual report
- Stripe paid plan (post founding-household beta)
- Native mobile (Capacitor)
- Byzantine calendar variant (full)
- Saint database with biographical pages
- Shared edit access to households (multi-user)

## Test Credentials
See `/app/memory/test_credentials.md`. Demo session: `SESSION_TOKEN=demo_session_patria`, household `hh_demo_patria` (Aquinas Household, 3 members, rich seed data).
