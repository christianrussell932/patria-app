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
### v0.16 — Permanent /charter page (Feb 13, 2026)
Small additive feature making the First Household Charter a revisitable artifact instead of a one-shot final-onboarding screen.

- **New shared component** `components/CharterCard.jsx` — extracted verbatim from the v0.15 onboarding step-8 implementation. Exports `CharterCard` (default), `CharterDraft`, `DRIFT_OPTIONS / PEACE_OPTIONS / RULE_OPTIONS`, `buildDraft`, `formatFriendlyDate`, `formatTime`. Print-friendly classes (`print:border-0 print:shadow-none print:p-8`).
- **Onboarding refactored to import the shared component** — no behavior change. Step-6 draft and step-8 card now render via the shared module. Hint dictionaries (`DRIFT_HINTS / PEACE_HINTS / RULE_HINTS`) kept in Onboarding only, since they belong to the examen, not the artifact.
- **New page** `pages/Charter.jsx` at route `/charter` (Protected, requireHousehold). Fetches `/api/household/me`; if `first_charter_completed_at` is set → renders `<CharterCard>` with all stored fields, a "Print →" button, and an "Established …" stamp. Otherwise → calm empty-state: *"Your Household Charter has not been created yet."* with `Begin the charter →` (returns to /onboarding) + `Back to dashboard` (passive).
- **Dashboard entry point** — conditional `[data-testid="dashboard-charter-link"]` "View charter →" link in the page-header rail, rendered ONLY when `household.first_charter_completed_at` exists. Existing households without charter fields see nothing new (no regression).
- **Printable** — AppShell sidebar and mobile topbar both already carried `print:hidden` (verified). The Charter page header collapses with `print:hidden` on its own controls; the card itself uses `print:border-0 print:shadow-none print:p-8` for clean letter-sized output. Native `window.print()`. No PDF library introduced.
- **Mobile responsive** — header collapses `flex-wrap`; card padding shifts `p-6 sm:p-10`; charter rows stack naturally on narrow viewports.
- **No backend changes.** Pure consumer of the v0.15 `/api/household/me` payload, which already returns all 5 charter fields.

### v0.15 — "Build your First Rule of the Home" onboarding (Feb 13, 2026)
The first net-addition after the long subtraction arc (v0.8–v0.14). Onboarding becomes a guided 8-step charter-building experience while preserving every existing v0.13 step and auth/family-creation guarantee.

- **Onboarding extended 2 → 8 steps** (`pages/Onboarding.jsx`):
  - **Steps 1–2 preserved verbatim** from v0.13 (household name + calendar; parent + optional members). Household creation still happens at the step-2→3 boundary — same `POST /household` + member loops, same data flow. After creation, advancing further only PATCHes.
  - **Step 3 — "Where is your household drifting?"** — multi-select examen across 7 areas (Schedules, Prayer rhythm, Household responsibilities, Couple alignment, Family priorities, Technology boundaries, Stewardship). Each with a one-line reflective gloss.
  - **Step 4 — "What peace are you trying to protect?"** — single-select across 6 framings (Peaceful evenings, Sunday rest, Family prayer, Less schedule chaos, Clearer responsibilities, Less spouse friction).
  - **Step 5 — "Choose your first household rule"** — single-select across 4 starter rules (weekly Sunday Council · protected dinner night · priorities-before-yes · shared spiritual rhythm).
  - **Step 6 — "Draft your Rule of the Home"** — deterministic template-generated draft prose, no AI. Computed via `buildDraft()` from prior answers.
  - **Step 7 — "Schedule your first Family Council"** — date + time pickers, pre-filled to upcoming Sunday at 7 PM. The activation goal of onboarding.
  - **Step 8 — Charter card** — a calm, editorial visual artifact showing household name, drift areas, peace, first rule, scheduled Council time, and the prose charter draft. *"Enter Patria →"* closes the flow.
  - **Skip semantics:** every charter step (3–7) has a quiet *"Skip · enter Patria"* link. User can drop out at any moment; the household exists from step 2 onward; charter is purely additive.
  - **Back navigation preserves all answers** (state lives in the component; no submission until step 7's "Continue →").
  - Pacing indicator dynamically labels phases: `Setting up the household · 01-02 / 08` → `Build your first Rule of the Home · 03-07 / 08` → `Your First Charter · 08 / 08`.
  - Mobile responsive throughout (`grid-cols-12` collapses to `cols-sm:1` on narrow viewports; charter card uses `p-6 sm:p-10`).
- **Backend additions** (additive, non-breaking):
  - `HouseholdUpdate` Pydantic model extended with 5 Optional fields: `drift_areas`, `peace_to_protect`, `first_household_rule`, `first_council_at`, `first_charter_completed_at`. **No required field changed; no Mongo schema migration.**
  - **New endpoint `POST /api/household/first-charter`** (`FirstCharter` payload model) — persists all 5 charter fields in a single call AND creates a `council`-type schedule event for the chosen datetime so the first Council appears on Dashboard *Today's schedule / Upcoming events*. Returns `{ok, event_id}`. Skips event creation if `first_council_at` is null.
  - **Schedule event-type allowlist** widened to include `"council"` (was `family / liturgical / date_night / school / medical / other`). One word added; all existing event creation paths unaffected.
- **Tests:** 2 new tests in `test_catholic_household_os.py::TestHousehold`:
  - `test_first_charter_endpoint` — full happy path: charter persists, council event created in `db.events`, surfaces via `GET /schedule/events`.
  - `test_first_charter_without_council_datetime` — charter persists without scheduling; no event row created. **170/170 backend tests green.**
- **Auth / dashboard / family creation logic confirmed intact:**
  - `POST /household` body shape unchanged; existing user objects unchanged; redirect logic unchanged (`requireHousehold && !user.current_household_id`).
  - Existing households without charter fields render normally everywhere (every field is Optional; every consumer is defensive).
  - Demo household has no charter fields set; demo Dashboard / Members / Council / Spiritual Life all confirmed unaffected.

### v0.14 — Challenge leaderboard removed + stale prayer fields purged (Feb 13, 2026)
Closes the pre-beta cleanup arc. Two narrow changes; same single principle.

- **Challenges per-member count removed** (`pages/Challenges.jsx`):
  - The per-member side-by-side numeric `{count}` on each check-in button is gone. The row now reads as a communal participation grid: `[avatar] [name] [✓ if joined today]`. The check-in mechanism itself, the household-level *Day X / Y*, and the overall progress bar are all preserved (intrinsic to the devotional arc).
  - A single quiet italic line below the participation row: *"A season walked together. Mark today's participation; the household arc holds the count."*
  - Backend field `member_progress` was left intact (harmless; may be useful later in a much quieter context); it is no longer surfaced anywhere in the UI.
  - Dashboard active-season tile was already household-level only — no changes needed there.
- **Stale prayer API fields purged** (`backend/routers/dashboard.py`):
  - Removed `prayer.streak_days` and `prayer.week_count` from `/api/dashboard`.
  - Removed the entire `streak` walk-backward computation (~15 lines) and the `week_prayer_count` query that existed solely to populate those fields. `distinct_days` → `days_with_prayer_last_7` remains as the single canonical household rhythm signal.
  - Frontend was already migrated to `days_with_prayer_last_7` in v0.12; zero UI changes needed.
- **Tests** (`backend/tests/test_patria_modules.py`):
  - `test_dashboard_shape`: replaced presence assertions for `streak_days` / `week_count` with explicit `not in` absence assertions (same pattern as `weekly_score` and `goals.avg_progress` lockouts), plus a positive assertion on `days_with_prayer_last_7` (int, 0–7).
  - `test_dashboard_demo_has_data`: the `prayer.week_count >= 1` demo assertion was replaced with `days_with_prayer_last_7 >= 1` (equivalent meaning under the new model).
  - **168/168 backend tests still green.**
- **Closing the arc:** with v0.14, Patria has fully removed the score → streak → leaderboard chain. The product now offers calm visibility into shared rhythms without any synthetic KPI, comparative count, or duration-of-chain framing anywhere.

### v0.13 — Onboarding simplified, first-run guidance added (Feb 13, 2026)
Pre-beta polish reducing first-session friction. Patria's onboarding now matches the calm-before-volume voice established in v0.8–v0.12.

- **Onboarding collapsed from 3 screens → 2** (`pages/Onboarding.jsx`):
  - **Screen 1 — Household identity:** household name + liturgical calendar (3 options each with a one-line hint). Patron saint **removed** — deferred to the Members page.
  - **Screen 2 — Who walks with you:** parent display name pre-filled from `useAuth().user?.name`, optional member rows with explicit *"Add members later"* skip path next to *"Establish household →"*, and a single italic line introducing Family Council: *"Patria begins with one weekly habit: a brief Family Council. Once you enter, we'll help you prepare the first one."* Parent tile color picker **removed** — deferred (defaults to violet server-side; user repaints on Members).
  - Pacing indicator: `01 / 02` (was `01 / 03`).
- **Dashboard first-run states** (`pages/Dashboard.jsx`):
  - Mission empty-state: when both `mission_statement` and `values` are absent, a calm single-sentence prompt + link to `/mission` (`dashboard-mission-empty`).
  - Council panel first-run variant: when no meeting has ever been held, panel becomes *"This household has not yet held its first Family Council."* + *"Prepare our first meeting →"* CTA. Reverts to the established *"Twenty quiet minutes…"* copy after the first meeting is created.
- **Council page first-run alignment** (`pages/Council.jsx`): the existing empty-state branches on `meetings.length === 0` and uses the same first-run language for visual coherence Dashboard → Council. After the first meeting, falls back to the canonical *"The agenda for this week is composed."*
- **Members patron-saint affordance** (`pages/Household.jsx`): below the household name, an understated inline editor — if unset, an italic *"+ Name a household patron saint (optional)"* link; if set, the existing *"under the patronage of …"* line gains an *"edit"* control. Uses `PATCH /household` (already in the schema). No new endpoint.
- **Backend (additive, non-breaking)**: `dashboard.council.has_held_first_council` boolean added to `/api/dashboard`. Powered by `db.meetings.count_documents`. No schema migration; no other endpoint touched.
- **Tests:** `test_dashboard_shape` now asserts `"council"` is present and `"has_held_first_council"` is a bool. **No standalone minimal-create test added** — `HouseholdCreate` Pydantic model already enforces `name: str` (required) and all other fields as Optional-with-defaults; the contract is locked at the model layer. Existing test_create_household covers the superset, existing test_patch_household covers later patching of deferred fields.
- **Deferral re-entry map honored**: patron saint → Members; tile color → Members per-row picker; mission/values/tech-policy/roles → MissionGoals (existing); Council day/time → never asked, replaced by Dashboard first-run CTA.

### v0.12 — Removed "prayer streak" framing (Feb 13, 2026)
Final copy-led pass aligning every prayer-related surface with the household-level rhythm model established in v0.11. The word "streak" no longer appears in Patria.

- **Dashboard snapshot tile:** `Prayer streak · 6` → **`Prayer rhythm · 6 / 7`**. Same numeric calmness as the neighbouring `Open tasks` and `Members` tiles; no big "scoreboard" 5xl numeral.
- **Dashboard prayer panel:** the 5xl `{streak_days} day streak` headline + "X prayers logged · last 7 days" line was replaced with a calm two-line reflection:
  > *"Prayer recorded on 6 of the last 7 days."*
  > *A household rhythm taking shape.*
  Zero-state copy: *"The household prayer rhythm is ready to begin again. Open the Prayer Rhythm tab when the family is ready."* — no harsh "0 streak" framing.
- **Family Council weekly review:** `"Prayers logged"` → **`"Household prayer moments"`**. Chose the shorter approved alternative because the preferred phrase *"Times the household prayed together"* (35 char) would wrap to 3 lines inside the uppercase font-mono 3-column ReviewStat strip while the sibling labels stay 1 line. Visual rhythm preserved; meaning aligned with the household model.
- **Backend (additive):** new field `prayer.days_with_prayer_last_7` on `/api/dashboard` — distinct days in the last 7 with at least one prayer log. Computed via `db.prayer_logs.distinct("log_date", ...)`. Existing `streak_days` and `week_count` fields are preserved (unused by the UI but retained to avoid a breaking API change in this copy-led pass).
- **No other surfaces touched.** Spiritual Life Prayer Rhythm tab unchanged, challenges unchanged, goals unchanged, budgets unchanged.
- **Tests:** all 168 backend tests still green. No new test added since the `prayer.streak_days` API contract is unchanged; new field is additive.

### v0.11 — Household-level prayer rhythm (Feb 13, 2026)
Spiritual Life pivoted away from per-member prayer tracking toward household-level prayer rhythm visibility. Patria should not feel like a spiritual-compliance dashboard.

- **Removed (UI):** the member × prayer-type matrix from `pages/PrayerTracker.jsx`. The "+1 per member per prayer" interaction no longer exists. No leaderboard, no per-person counts, no individual member tiles.
- **New UX:** a calm household rhythm list — each of six prayer practices (Morning Offering, Angelus, Family Rosary, Divine Mercy, Examen, Lectio Divina) is one row with a single household-level "lived ✓" toggle. Each rhythm carries a one-line gloss describing the practice. Above the list, a 7-day household aggregate shows how often each rhythm was kept. Below, a quiet italic line: *"A rhythm is not measured by who in the family said which prayer. It is measured by whether, together, the household kept its hour with God."*
- **Backend:** `PrayerLogCreate.member_id` relaxed from required → `Optional[str] = None`. Household-level logs omit `member_id`; legacy per-member logs remain valid and continue to count toward household activity. No schema migration; the field's presence is now informational only.
- **Other surfaces preserved without change:** Dashboard prayer panel, Dashboard snapshot, and Family Council "Last week in review · Prayers logged" all already counted prayer_logs at the household level (no member filter) and continue to work correctly. The Council label *"Prayers logged"* remains factually accurate and is flagged for a future copy refinement → *"Times the household prayed together"*.
- **Demo seed:** 24 legacy demo prayer_logs (each with a `member_id`) remain in place — they're valid records under the new model and continue to populate the 7-day aggregate. No migration needed.
- **Tests:** new `test_log_prayer_household_level_no_member` confirms POSTing without `member_id` succeeds and stores `member_id: null`. The legacy test still passes since Optional ≠ removed. **168/168 backend tests green.**
- **Note for future work:** the prayer "streak" language on the Dashboard remains scheduled for a separate, deliberate copy-led softening pass. This change does not touch it.

### v0.10 — Removed the Family Goals avg-progress aggregate (Feb 13, 2026)
A second pass in the non-scorekeeping direction set by v0.9.

- **Removed:** the `goals.avg_progress` field from `/api/dashboard` and its underlying `round(sum(g.progress)/len(goals))` computation in `routers/dashboard.py`. Same anti-pattern as the Household Health Score: averaging heterogeneous family goods (auto loan payoff, catechism reading, moving house) into one synthetic mean that answered no real decision.
- **Removed (UI):** the `XX% avg progress` 5xl headline block at the top of the Dashboard's Family Goals panel. The individual goals list (each with its own bar) now leads the panel naturally — no replacement number, no replacement card. The panel breathes.
- **Tests:** `test_dashboard_shape` now asserts `"avg_progress" not in d["goals"]`. **167/167 backend tests green.**
- **Philosophy:** numeric displays in Patria are kept where they aid a real family decision (budget allocations, financial goals, tithing, liturgical Day-X-of-Y) and removed where they aggregate disparate goods into a synthetic KPI.

### v0.9 — Removed the Household Health composite score (Feb 13, 2026)
Patria does not grade the family. Weekly reflection belongs to the Family Council.

- **Removed:** the `weekly_score` API key on `/api/dashboard` and its underlying 4-pct computation (rule/prayer/tasks/budget). Nothing was persisted; the calculation was purely derived. No collection or migration touched.
- **Removed (UI):** Dashboard's `Household Health` Panel + `Household health` Snapshot tile + the local `ScoreBar` component. Members page's `Household health` Panel + its local `Row` helper + the parallel `/api/dashboard` fetch that only existed to populate the score.
- **Layout (Option α):** promoted the existing `This week's council` panel up into the freed top-right `lg:col-span-5` slot. Active-season panel returns to full width when present. Members page's mission panel now spans full width.
- **Copy:** Landing's Members description now reads *"household identity"* instead of *"household health"*.
- **Tests:** `test_dashboard_shape` updated — the `weekly_score` presence assertion is replaced by an explicit `assert "weekly_score" not in d` so the removed contract stays removed.

### v0.8 — App-wide frontend resilience (Feb 13, 2026)
A defensive sweep eliminating the recurring "Uncaught Runtime Error" overlay that surfaced whenever a normal axios mutation rejected (404 / 400 / 500 / network drop).

- **Shared formatter:** `frontend/src/lib/errors.js` exposes `explainError(err, fallback)` — pulls Pydantic `detail` strings/validation arrays, maps 401 → "Session expired", 403 → "no access", 404 → "endpoint not available", network → "check connection", everything else falls back to the page's own copy. Used app-wide.
- **Pages hardened in this round (7):** `Council.jsx`, `MissionGoals.jsx`, `Dashboard.jsx`, `Household.jsx` (also dropped legacy `alert()` calls), `SacredHeart.jsx`, `Settings.jsx` (added `saving` disabled state), `Today.jsx`. Combined with the earlier `Schedule.jsx` / `HouseholdOrder.jsx` / `Budget.jsx` hardening, **every reachable axios mutation in the app is now wrapped in `try/catch` with a Sonner `toast.error(explainError(...))`**. Modals stay open on failure; inputs are preserved; submit buttons re-enable.
- **Verification:** `testing_agent_v3_fork` iteration 7 — 100% PASS across 10 forced-error scenarios spanning all 7 pages. 0 webpack/React error overlays, 0 uncaught console rejections, readable toasts every time.
- **Known dead code (flagged):** `pages/Today.jsx` is hardened but unreachable (`/today` redirects to `/dashboard` and the file has no importers). Kept as-is pending a product decision on whether to restore the "Today" route or delete the file.

### v0.1 — Domus (Jan 2026)
- Foundation. 34/34 backend + 100% frontend e2e

### v0.2 — Patria restructure
- New IA, Dashboard, Budget, Mission, Schedule, expanded Members. 68/68 backend + 100% frontend

### v0.3 — Refinement
- Family Council module, Sacred Heart tab (optional), liturgical engine v2 (proper ferial naming, Traditional Roman overlay), Household Rhythms, Crest motif. 93/93 backend + 100% frontend

### v0.7 — Budget & Stewardship, substantially expanded (Feb 12, 2026)
A round focused on making the Budget module *genuinely usable* for monthly household stewardship, while strictly avoiding fintech bloat (no pie charts, no bank sync, no debt-snowball calculators).

**Backend (additive — no breaking changes):**
- Categories: new optional `group` field with 8 stable keys (giving · housing · food · transportation · insurance · debt · savings · other); legacy categories silently default to `other`.
- New endpoint `POST /api/budget/seed-defaults` — seeds 21 starter categories across the 7 stewardship groups. Idempotent.
- New CRUD `/api/budget/income-sources` with `{name, source_type, expected_amount, received_amount, month, year, recurring, notes}`. Listing a month with no sources auto-carries **recurring** sources from the most recent prior month (expected preserved, received reset to 0, marked `carried_from=YYYY-MM`). One-off sources (gift, tax refund, miscellaneous) never carry forward.
- New CRUD `/api/budget/financial-goals` with `{goal_type ∈ savings|debt_payoff|giving|other, target_amount, current_amount, target_date, monthly_contribution}`. Includes legacy `savings_goals` inline with `legacy=true` flag (gradual migration — reads from both, writes to the new collection).
- `/api/budget/summary` now exposes `income_expected`, `income_from_sources`, `income_from_transactions`, and per-category `over_by`.

**Frontend (refactor — `Budget.jsx` split into focused components):**
- New layout: header → 4-stat summary strip → Income panel + Financial Goals panel (side-by-side) → grouped Budget Categories with A-G section headers → Ledger + Stewardship quotes.
- New components: `pages/budget/IncomePanel.jsx`, `pages/budget/FinancialGoalsPanel.jsx`, `pages/budget/CategoryGroupsPanel.jsx`.
- Spending category line clarified: **`Spent $X · Allocated $Y`** with optional **`· Over by $Z`** in liturgical red. $0-allocated categories show a muted *Set allocation* prompt.
- "Start with default categories" CTA appears when categories list is empty.
- Empty-allocation categories rendered muted so the page stays calm even with many starter rows.
- Debt-payoff goals render the spec's exact copy: *"$4,200 remaining of $8,000 original balance · Target: May 2027 · $350/mo"*.

**Tests (167/167 green):**
- 13 new tests in `test_patria_v7_budget.py`: default seed idempotency, group field, income recurring auto-carry (and non-recurring NOT carrying), financial goal CRUD + legacy mapping, `over_by` per category.

### v0.6 — Optional memorials surfaced as secondary identity (Feb 12, 2026)
- **API contract:** every `/api/liturgical/today` and `/api/liturgical/calendar` response now includes `optional_memorials: [{name, color}]`. Multiple saints per day supported (e.g., May 12 → Sts. Nereus & Achilleus + St. Pancras).
- **Display hierarchy:** the ferial / Sunday name stays primary; saints surface in their own dashboard slot ("Also commemorated: …") in their liturgical colour. `season_label` stays pure structural metadata (season + week). Higher-rank celebrations (feast / solemnity / obligatory memorial) suppress optionals so the day's identity stays focused.
- **Content fill:** added ~130 optional memorials from the modern General Roman Calendar across the year (January–December), with special coverage for Easter season since that was the gap the user noticed. Traditional 1962 has its own narrower dict for trad-specific commemorations.
- **Tests:** 150/150 green (7 new in `test_patria_v6_optional_memorials.py` cover May 12 Nereus+Pancras, multi-saint days, suppression by higher rank, field-always-present invariant, and traditional variant).

### v0.5 — Technical correctness & modularization (Feb 12, 2026)
- **Backend refactor:** `server.py` slimmed from ~1,650 LOC to ~60 LOC. All domains extracted into `/app/backend/routers/` (auth, household, liturgical, rules, prayer, challenges, budget, schedule, tasks, goals, dashboard, council, sacred_heart, rhythms) with shared `deps.py` for User/Household models + `get_current_user` / `get_household`.
- **Council `finalize_meeting` is idempotent:** response now `{ok, already, tasks_created, tasks_existing}`. Re-finalize never double-creates tasks. Diffs by `assignment_id` OR title — robust against clients that drop `assignment_id` round-trip. Backfills `assignment_id` + `task_id` onto assignments after finalize so subsequent PATCHes stay coherent.
- **`dateutil.relativedelta` for cadence math:** Rhythm next_due (daily/weekly/monthly/quarterly/yearly with end-of-month + leap-year clamping) and Sacred-Heart `next_renewal` (next anniversary ≥ today, Feb 29 clamps to Feb 28 in non-leap years).
- **Traditional 1962 "Sundays after Epiphany" rubric:** First Sunday after Epiphany = Sunday in Jan 7–13. Displaced Sundays (when Lent starts early) are RESUMED in their original Epiphany numbering after the last regular Sunday after Pentecost, immediately before the Last Sunday. Fixed an upstream bug in `first_sunday_of_advent` that was returning Saturdays.
- **Tests:** 143/143 backend green (119 local pytest + 24 public-URL E2E). New `test_patria_v5_correctness.py` covers all four fixes including Feb 29 anniversary, month-end clamping, the 1962 resumed Epiphany Sundays for 2026, and end-to-end council idempotency.

### v0.4 — Cleanup & Coherence
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
- *(All v0.4 P0 items completed in v0.5.)*

### P1
- "Family Crest" symbolic visual identity layer (deferred per user request in v0.5)
- AI module (Claude Sonnet 4.5): mission-statement coach, Council agenda enrichment, formation prompts
- PWA push notifications for Angelus / Compline / Council day
- Recurring events + chore rota
- Saint database with biographical pages
- 1962 enhancements: Holy Family Sunday (Sunday after Epiphany within Octave); Octave of Epiphany commemorations; privileged-Sunday rubric so Last Sunday after Pentecost isn't displaced by lower-rank fixed feasts

### P2
- "Liturgical Year Wrap" — printable annual report
- Stripe paid plan
- Native mobile (Capacitor)
- Full Byzantine calendar engine
- Multi-user shared households

## Test Credentials
See `/app/memory/test_credentials.md`. Demo session: `SESSION_TOKEN=demo_session_patria`.
