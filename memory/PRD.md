# Patria — Catholic Household OS

## Original Problem Statement
A structured operating system for intentional Catholic family life. Repositioned from a prayer/devotional tracker into the executive layer that runs the home. Spiritual disciplines are one component among many.

## Brand
- Name: **Patria**
- Wordmark: `Patria.` (gold liturgical-white period) — used inside the app
- Ornate mother-mark (Sacred Heart engraving) — used **ceremonially** on public surfaces only (Landing hero, Onboarding) so the symbol retains weight
- Tagline: *An operating system for intentional Catholic family life.*

## Architecture
- **Frontend:** React 19, React Router 7, Tailwind, Radix/shadcn, axios. Fraunces serif + Geist sans + JetBrains Mono. Light "bone white" + dark "candlelight". `Crest` SVG monogram + `CrestDivider` + `SacredHeartEngraving` for restrained editorial DNA. Sidebar is sticky on desktop (`md:sticky md:top-0 md:h-screen`).
- **Backend:** FastAPI (`/api` prefix), MongoDB (motor), Pydantic v2. Liturgical engine supports Roman, **Traditional Roman 1962**, and Byzantine (label-only) variants. Every day exposes a `season_label` secondary descriptor (e.g. *"Easter Season · VI Week of Easter"*) alongside the primary feast/ferial `name`.
- **Auth:** Emergent-managed Google OAuth (cookie + Bearer fallback).
- **Mongo collections:** users, user_sessions, households, members, rules, rule_checkins, prayer_logs, challenges, challenge_checkins, budget_categories, budget_transactions, savings_goals, events, tasks, family_goals, meetings, rhythms.

## Information Architecture (sidebar — 8 modules, never called "systems")
01. **Dashboard** — command center · feast-day-first liturgical header · Family Mission + Values prominent
02. **Family Council** — weekly meeting, auto-composed agenda, printable summary
03. **Spiritual Life** — Liturgical Calendar · Prayer Rhythm · Seasons · Sacred Heart (optional)
04. **Household Order** — seven systems of the family (Spiritual, Financial, Order, Marriage, Children, Health, Hospitality) — standing **practices**, not "rules"
05. **Budget & Stewardship** — categories, ledger, savings, tithing
06. **Mission & Goals** — mission statement, values, technology policy, roles, short/long goals
07. **Schedule** — events (time-bound), tasks (one-offs), rhythms (recurring commitments)
08. **Members** — relational center

## Conceptual Layers (clarified in copy throughout)
- **Household Order** → *What does our family commit to?* (standing practices)
- **Schedule** → *When does it happen?* (events, tasks, rhythms)
- **Tasks** → *What needs to be done?* (one-offs)
- **Family Council** → *How are we doing?* (weekly review)

## Implemented
### v0.1 — Domus (Jan 2026)
- Foundation. 34/34 backend + 100% frontend e2e

### v0.2 — Patria restructure
- New IA, Dashboard, Budget, Mission, Schedule, expanded Members. 68/68 backend + 100% frontend

### v0.3 — Refinement
- Family Council module, Sacred Heart tab (optional), liturgical engine v2 (proper ferial naming, Traditional Roman overlay), Household Rhythms, Crest motif. 93/93 backend + 100% frontend

### v0.4 — Cleanup & Coherence (current)
- **Landing:** removed "Eight Systems" numbering — replaced with *"An operating system for intentional Catholic family life."* and *"What lives inside"*. Ornate Patria mark now sits ceremonially in the hero.
- **Onboarding & Settings:** added **Traditional Roman Calendar — 1962** as third option (Roman / Traditional / Byzantine). Ornate logo placed at top of onboarding wizard.
- **Sidebar:** sticky on desktop. Text wordmark only inside the app — no repeated ornate logo embedding.
- **Dashboard liturgical header:** feast/saint name is now primary; secondary line uses always-on `season_label` (e.g. *"Easter Season · VI Week of Easter"*); ferial rank chip hidden.
- **Dashboard Mission/Values:** Family Mission + Family Values shown prominently below the date row; **duplicate Mission card removed** from below.
- **Household Order:** 7-tile grid resolves cleanly (7th spans full width with proper inner two-column layout). Heading kept as *"Seven systems of the family."* (the framework). Every "+ Add rule" became **"+ Add practice"** with category-specific placeholder examples in the modal. Marriage hint changed from *"intimacy"* → *"unity"*.
- **Schedule:** hint copy added to make the Events / Tasks / Rhythms distinction immediately clear.
- 104/104 backend + 100% frontend e2e

## Backlog
### P0 (next session)
- Split `server.py` (~1,650 lines) into per-domain routers (council, sacred_heart, rhythms, liturgical, budget, schedule, tasks, goals, dashboard, household)
- Use `dateutil.relativedelta` for cadence-aware rhythm next-due and Sacred-Heart anniversary (handle Feb 29 fallback to Feb 28)
- True "Sundays after Epiphany" counting in Traditional variant `_season_label`
- Idempotent `finalize_meeting` (re-finalize should not double-create tasks)

### P1
- AI module (Claude Sonnet 4.5): mission-statement coach, Council agenda enrichment, formation prompts
- PWA push notifications for Angelus / Compline / Council day
- Recurring events + chore rota
- Weighted Household Health (cadence + assignment-aware)
- Saint database with biographical pages

### P2
- "Liturgical Year Wrap" — printable annual report
- Stripe paid plan
- Native mobile (Capacitor)
- Full Byzantine calendar engine
- Multi-user shared households

## Test Credentials
See `/app/memory/test_credentials.md`. Demo session: `SESSION_TOKEN=demo_session_patria`.
