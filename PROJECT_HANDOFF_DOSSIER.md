# PROJECT HANDOFF DOSSIER — Patria (Catholic Household OS)

> **Purpose of this document.** This is a knowledge-transfer dossier written *before* another
> frontier AI agent independently audits the project. It records what was built, why, how it
> works, how it evolved, what is intentional, what is fragile, and what remains unfinished.
>
> **Provenance tags used throughout:**
> - **[VERIFIED]** — confirmed by reading the current code in `/app` (June 2026).
> - **[HISTORICAL]** — reconstructed from `/app/memory/PRD.md` and the fork handoff summary.
> - **[INTERPRETATION]** — my reasoned reading of intent; not a hard fact.
> - **[SUSPECTED]** — a probable issue I did not fully prove.
> - **[UNVERIFIED]** — could not be confirmed with the tools/history available.
>
> **No application code was changed in producing this dossier.** It is documentation only.

---

# 1. EXECUTIVE SUMMARY

**What it is.** Patria is a premium, minimalist, editorial web application that acts as an
*operating system for intentional Catholic family life*. It is not a devotional/prayer app; it
positions itself as the "executive layer" that runs a household — schedule, budget, formation,
recurring rhythms, a weekly family meeting, and (optionally) spiritual practices. [VERIFIED: `pages/Landing.jsx`, `memory/PRD.md`]

**Problem it solves.** Catholic families already have prayer apps, missals, and Bibles. What
they lack is a single, calm place to *run* the home — the rule of the house, the money, the
calendar, the formation of children, and a repeatable weekly rhythm of review. Patria unifies
these. [VERIFIED: Landing copy]

**Intended users.** Practising Catholic parents (primarily the household's "operator" parent),
their spouse, and — read-mostly — their children. One Google-authenticated user owns/operates
one household. [VERIFIED: auth + household model]

**Primary value proposition.** Calm, structured, non-gamified household governance. A defining
product rule (see §10) is that **Patria never grades the family** — no scores, streaks,
leaderboards, or synthetic KPIs.

**What it currently does (verified feature set):**
- Emergent-managed Google login (cookie session).
- An 8-step guided onboarding that ends by producing a **First Household Charter** ("Rule of the Home").
- A **Dashboard** command-center aggregating liturgical day, schedule, tasks, budget, prayer rhythm, goals, and council status.
- A **Family Council** module: auto-composed weekly agenda, working session (priorities/assignments/notes/decisions), finalize-to-tasks, printable summary, past-meeting history.
- **Spiritual Life** (tabbed): Liturgical Calendar (Roman + Traditional 1962), household Prayer Rhythm, Seasons (challenges), Sacred Heart enthronement.
- **Household Order**: seven "systems" of the family, each holding standing *practices* (rules).
- **Budget & Stewardship**: grouped categories, ledger, income sources w/ recurring carry-forward, financial + legacy savings goals, tithing.
- **Mission & Goals**: mission statement, values, technology policy, roles, family goals.
- **Schedule**: events, one-off tasks, recurring rhythms.
- **Members**: relational center + patron saint.
- A permanent **/charter** page that re-renders the charter artifact.
- Light ("bone white") / dark ("candlelight") themes.

**Maturity.** Late pre-beta. Backend is modular and heavily tested (8 pytest files, ~152 test
functions [VERIFIED]; PRD claims "170" — see §16 for reconciliation). Frontend is stable with
app-wide axios error hardening. No known blocking bugs. [HISTORICAL: handoff]

**Most important things to understand before touching it (read this first):**
1. **No AI anywhere.** Despite `emergentintegrations` being listed in `requirements.txt`, it is
   **never imported or used**. The "charter draft" is a deterministic string template
   (`buildDraft()`), not an LLM. [VERIFIED]
2. **The anti-gamification philosophy is a hard product constraint**, enforced through many
   deliberate *removals* over v0.9–v0.14. Do not reintroduce scores/streaks. [HISTORICAL + VERIFIED absences]
3. **Data layer does NOT use ObjectId/BaseDocument.** Every document has a UUID string business
   key (e.g. `household_id`, `member_id`), and every query uses `{"_id": 0}` projection to keep
   Mongo's `_id` out of responses. [VERIFIED: all routers]
4. **Auth must not be "fixed" casually.** The OAuth callback has StrictMode/double-mount
   dedupe and race-recovery logic that exists because of a real redirect-loop bug. [VERIFIED: `AuthCallback.jsx`]

---

# 2. PRODUCT PURPOSE AND ORIGINAL VISION

**ORIGINAL INTENT [HISTORICAL].** The project began (v0.1) under the name **"Domus"** as a
foundation, then was restructured (v0.2) into **"Patria"** with a new information architecture.
The early framing leaned more toward devotional/prayer tracking with per-member tracking,
challenges, and composite "health" metrics.

**THE MAJOR SHIFT [HISTORICAL + VERIFIED].** Across v0.8–v0.14 the product underwent a
deliberate "long subtraction arc": a philosophy correction that *removed* gamification and
individual scorekeeping in favor of calm, household-level rhythms:
- v0.9 removed the composite "Household Health Score".
- v0.10 removed Family Goals "avg progress" aggregate.
- v0.11 replaced per-member prayer matrix with a household-level Prayer Rhythm.
- v0.12 removed all "streak" language.
- v0.14 removed the challenge per-member leaderboard count and purged stale prayer streak API fields.

**THE NET ADDITION [HISTORICAL + VERIFIED].** After the subtraction arc, v0.15–v0.17 added the
first *new* feature in the calm voice: the **"Build Your First Rule of the Home"** onboarding
(8 steps) producing a permanent **Charter**, and then knit the Charter and Family Council
together as "two halves of one household ritual."

**CURRENT PRODUCT.** A calm household OS whose emotional center is the **weekly Family Council**
and whose identity artifact is the **First Household Charter**. Spiritual disciplines are one
module among several, and explicitly optional (e.g., Sacred Heart is repeatedly framed as
"entirely optional"). [VERIFIED: Landing, SacredHeart copy]

---

# 3. USER TYPES

The app makes almost no hard distinction between users at the *application* level — "all
Google-authenticated users equal" [VERIFIED: `test_credentials.md`]. Distinctions live at the
*household member* level (`role ∈ {parent, child}`).

### 3.1 The Operator Parent (primary)
- **Who:** The parent who signs in with Google and creates the household. Their `user_id` is
  linked to the primary member via `linked_user_id`. [VERIFIED: `household.py create_household`]
- **Goal:** Run the home — set up the charter, run the weekly Council, manage budget/schedule.
- **Uses:** Everything. Onboarding, Dashboard, Council, Budget, Schedule, Members, Settings.
- **Workflow:** Sign in → onboarding → weekly return to Dashboard → run Council → adjust as needed.
- **Assumptions made about them:** They own exactly one household (`current_household_id`), single-operator. There is no multi-user shared-household support yet (P2 backlog). [VERIFIED: no invite flow exists]

### 3.2 The Spouse / Second Parent
- **Who:** Added as a `member` with role `parent`, but **not** linked to a separate login.
  [VERIFIED: `MemberCreate` has no user linkage; only the creator gets `linked_user_id`]
- **Goal:** Be represented in the household, receive assignments in Council, appear on tiles.
- **Reality:** Currently they are a *data record*, not a separate authenticated user. If they
  signed in with their own Google account they would get their *own* empty household. [SUSPECTED limitation]

### 3.3 Children
- **Who:** `member` records with role `child`. Appear as colored initial tiles; can be assigned
  tasks/assignments in Council. [VERIFIED]
- **Goal:** Be visible in household identity and receive assignments. They do not log in.

### 3.4 Anonymous / Prospect
- **Who:** Visitor on the Landing page. Only action available is "Begin with Google". [VERIFIED: `Landing.jsx`]

### 3.5 Demo user (testing persona)
- **Who:** Seeded session `demo_session_patria` / household `hh_demo_patria` with rich demo data.
  Used by tests and QA. [VERIFIED: `test_credentials.md`, test files]

---

# 4. CURRENT FEATURE INVENTORY

> Routes are React Router paths (`App.js`); APIs are all `/api`-prefixed FastAPI routes.

### Feature: Authentication (Emergent Google OAuth)
- **Purpose:** Identify the user; associate them with a household.
- **User:** All.
- **User flow:** Landing "Begin with Google" → `auth.emergentagent.com` → redirect back with
  `#session_id=...` → `AuthCallback` exchanges it → cookie set → routed to `/onboarding` or `/dashboard`.
- **Implementation:** FE `pages/Landing.jsx`, `pages/AuthCallback.jsx`, `lib/auth.jsx`
  (AuthProvider), `App.js` route guards. BE `routers/auth.py` (`POST /auth/session`,
  `GET /auth/me`, `POST /auth/logout`), `deps.get_current_user`.
- **Dependencies:** Emergent session endpoint `EMERGENT_SESSION_URL` (`deps.py`); Mongo
  `users`, `user_sessions`.
- **Important logic:** Session token stored in `user_sessions` with 7-day expiry; auth accepted
  via **cookie `session_token`** OR **`Authorization: Bearer`** header (tests use Bearer).
  Cookie set `httponly, secure, samesite="none"`. [VERIFIED]
- **Known limitations:** Single household per user; no account deletion; no refresh rotation
  (a new session row is inserted on each login — see §25).
- **Historical context:** A recurring redirect-loop bug (StrictMode double-mount replaying a
  one-time `session_id`) drove the dedupe + `/auth/me` recovery logic in `AuthCallback.jsx`. [VERIFIED comment/code]

### Feature: Onboarding — "Build Your First Rule of the Home" (8 steps)
- **Purpose:** Create the household and produce the first Charter + schedule the first Council.
- **User:** Operator parent, first run.
- **User flow:** (1) Name household + choose calendar → (2) Add self + members → **household is
  created at the 2→3 boundary** → (3) Where is the household drifting? (multi-select) → (4) What
  peace to protect? (single) → (5) Choose first rule (single) → (6) Auto-drafted charter prose →
  (7) Schedule first Council (date/time, prefilled next Sunday 7pm) → (8) Charter card + "Enter Patria".
- **Implementation:** FE `pages/Onboarding.jsx` (571 lines), `components/CharterCard.jsx`
  (options, `buildDraft`, `CharterDraft`). BE `POST /household`, `POST /household/members`
  (per member), `POST /household/first-charter`.
- **Dependencies:** Auth (must be signed in, `requireHousehold={false}` route).
- **Important logic:** Household created once (`householdCreated` flag). Steps 3–7 only PATCH/
  charter-post. Every step 3–7 has a "Skip · enter Patria" escape. `first-charter` also creates
  a `council`-type schedule event so the first Council appears on the Dashboard. [VERIFIED]
- **Known limitations:** No resume-after-refresh (state is in-component only; refreshing mid-flow
  loses charter answers but the household already exists). Patron saint / tile colors deferred to Members.
- **Historical context:** Was 3 screens (v0.1-era), collapsed to 2 (v0.13), then expanded to 8
  (v0.15) as the first calm-voice net addition.

### Feature: Dashboard (command center)
- **Purpose:** One-glance state of the household today.
- **User:** Operator parent (and anyone signed in).
- **User flow:** Land on `/dashboard`; read liturgical header, mission/values, schedule, council
  panel, tasks, budget, prayer rhythm, date night, goals, active season.
- **Implementation:** FE `pages/Dashboard.jsx` (380 lines), `components/Panel.jsx`. BE
  `GET /api/dashboard` (`routers/dashboard.py`) — a single aggregator query.
- **Important logic:** `days_with_prayer_last_7` (distinct prayer days) is the *only* prayer
  signal — no streak. `council.has_held_first_council` toggles a first-run vs steady-state panel.
  Charter entry link only shows if `first_charter_completed_at` set. Budget over-categories,
  overdue/today tasks computed server-side. [VERIFIED]
- **Known limitations:** Everything is one synchronous aggregation; no caching. `active_challenge`
  still computes `completion_pct` (a progress %) which is the one surviving progress bar (kept
  intentionally as intrinsic to a devotional Day-X-of-Y arc).

### Feature: Family Council (weekly meeting)
- **Purpose:** The executive ritual — a 20-minute weekly review that turns decisions into tasks.
- **User:** The whole household, driven by the operator.
- **User flow:** `/council` → agenda is auto-composed → "Begin this week's meeting" creates a
  draft → add priorities/assignments/notes/decisions (autosaved) → "Finalize" turns assignments
  into household tasks → print one-page summary → past meetings listed.
- **Implementation:** FE `pages/Council.jsx` (481 lines). BE `routers/council.py`:
  `GET /council/agenda`, `POST /council/meeting`, `PATCH /council/meeting/{id}`,
  `GET /council/meetings`, `GET /council/meeting/{id}`, `POST /council/meeting/{id}/finalize`,
  `DELETE /council/meeting/{id}`.
- **Dependencies:** prayer_logs, rule_checkins, tasks, budget, family_goals, events, liturgical engine.
- **Important logic:**
  - `_build_agenda()` aggregates last-week prayer count, rule check-ins, completed/overdue tasks,
    budget overages, goals, next-14-day events, and upcoming solemnities/feasts.
  - **Finalize is idempotent** (see §10): re-finalizing diffs against tasks already materialized
    (matched by `source_meeting_id` + `assignment_id` OR title) and only creates new ones.
    It backfills `assignment_id`/`task_id` onto assignments.
  - The Charter reference card renders only when `first_charter_completed_at` is set. Council also
    fetches `/household/me` to label the stored rule/peace using `RULE_OPTIONS`/`PEACE_OPTIONS`
    imported from `CharterCard`. [VERIFIED]
- **Known limitations:** Meeting week is derived from `monday_of_week(today)`; there is no way to
  hold a council for an arbitrary historical week from the UI beyond the current draft logic.

### Feature: Spiritual Life (tabbed container)
- **Purpose:** The interior life of the household; four sub-tools.
- **Implementation:** FE `pages/SpiritualLife.jsx` renders tabs → `Calendar`, `PrayerTracker`,
  `Challenges` (as "Seasons"), `SacredHeart`. Tab state syncs to `?tab=` query param. [VERIFIED]
- **Sub-features:**
  - **Liturgical Calendar** (`pages/Calendar.jsx`, BE `routers/liturgical.py` + `liturgical.py`).
  - **Prayer Rhythm** (`pages/PrayerTracker.jsx`, BE `routers/prayer.py`).
  - **Seasons/Challenges** (`pages/Challenges.jsx`, BE `routers/challenges.py` + `challenges.py`).
  - **Sacred Heart** (`pages/SacredHeart.jsx`, BE `routers/sacred_heart.py`).

### Feature: Liturgical Calendar Engine
- **Purpose:** Compute season/color/feast/fasting for any date, Roman or Traditional 1962.
- **Implementation:** BE `liturgical.py` (pure functions; 733 lines), exposed via
  `GET /api/liturgical/today` and `GET /api/liturgical/calendar?year=&month=&variant=`.
- **Important logic:** Computus (Gauss) for Easter; movable feasts derived from Easter;
  `FIXED_FEASTS` table (modern + traditional names); ~130 `OPTIONAL_MEMORIALS_MODERN` surfaced
  as secondary identity; `season_label` always-on secondary descriptor; Traditional 1962 rubric
  for "Sundays after Epiphany/Pentecost" including *resumed displaced Epiphany Sundays*.
- **Known limitations:** `variant` is coerced to `roman` unless it is exactly `roman` or
  `traditional` — so **"byzantine" silently renders as Roman** (label-only support). [VERIFIED:
  `liturgical_for` line ~578]. It is an "approximation good enough for MVP" (docstring).

### Feature: Prayer Rhythm (household-level)
- **Purpose:** Track whether the *household* kept its prayer practices — not who prayed.
- **Implementation:** FE `pages/PrayerTracker.jsx`; six fixed rhythms (morning offering, angelus,
  rosary, divine mercy, examen, lectio divina). BE `routers/prayer.py`: `POST /prayer/log`
  (member_id optional), `DELETE /prayer/log/{id}`, `GET /prayer/log?log_date=`, `GET /prayer/stats`.
- **Important logic:** A rhythm is "lived" if ≥1 log of that type exists for the date, regardless
  of member. `member_id` is optional (legacy compatibility). [VERIFIED]
- **Historical context:** Was a per-member × per-prayer matrix; refactored to household-level in v0.11.

### Feature: Seasons / Challenges (devotional arcs)
- **Purpose:** Household-level devotional "seasons" (Advent Jesse Tree, Lent 40, Exodus 90,
  Marian Consecration 33, 54-day Rosary Novena).
- **Implementation:** BE `challenges.py` (templates), `routers/challenges.py`:
  `GET /challenges/templates`, `POST /challenges/start`, `GET /challenges/active`,
  `POST /challenges/{id}/checkin`, `POST /challenges/{id}/end`.
- **Important logic:** `current_day`/`completion_pct` computed from `start_date`. Per-member
  `member_progress` is still computed server-side **but no longer shown in the UI** (v0.14). [VERIFIED]

### Feature: Sacred Heart Enthronement (optional)
- **Purpose:** Record a household consecration to the Sacred Heart, hold the date + yearly renewal.
- **Implementation:** FE `pages/SacredHeart.jsx` (ceremony guide, act of consecration, print). BE
  `routers/sacred_heart.py`: `GET /sacred-heart/state`, `POST /sacred-heart/enthrone`,
  `POST /sacred-heart/renew`.
- **Important logic:** `_next_anniversary()` uses `dateutil.relativedelta` (Feb 29 clamps). State
  stored on the `households` doc (`sacred_heart_enthroned_at`, `_renewal_at`, `_notes`). [VERIFIED]
- **Asset:** `/frontend/public/sacred-heart.png` (transparent PNG, replaced placeholder SVG in this arc).

### Feature: Household Order (seven systems / practices)
- **Purpose:** Standing household *practices* organized into 7 "systems" (spiritual, financial,
  order, marriage, children, health, hospitality).
- **Implementation:** FE `pages/HouseholdOrder.jsx`. BE `routers/rules.py`: `GET/POST /rules`,
  `PATCH/DELETE /rules/{id}`, `POST /rules/{id}/checkin`.
- **Important logic:** `PILLARS` allowlist; `CADENCES = daily/weekly/monthly`. Check-ins upsert
  per (rule, member, date); today's check-ins surfaced as `completed_today_member_ids`. [VERIFIED]

### Feature: Budget & Stewardship
- **Purpose:** Monthly household stewardship without fintech bloat.
- **Implementation:** FE `pages/Budget.jsx` + `pages/budget/{IncomePanel,FinancialGoalsPanel,CategoryGroupsPanel}.jsx`.
  BE `routers/budget.py` (541 lines): categories (grouped), transactions, income sources
  (recurring auto-carry-forward), financial goals (+ legacy savings goals read-through),
  `POST /budget/seed-defaults` (21 starter categories, idempotent), `GET /budget/summary`.
- **Important logic:** Recurring income auto-carries from the latest prior month with received
  reset to 0 (`_autocarry_recurring_income`). Summary blends income-source *received* + legacy
  income transactions. Per-category `over_by`. [VERIFIED]

### Feature: Mission & Goals
- **Implementation:** FE `pages/MissionGoals.jsx`. BE: `PATCH /household` (mission_statement,
  values, technology_policy, roles) + `routers/goals.py` (`GET/POST /goals`, `PATCH/DELETE /goals/{id}`).
- **Important logic:** Goals have `progress` 0–100 (clamped) and `scope ∈ {short,long}`. The
  *aggregate* avg-progress was removed (v0.10) but individual per-goal bars remain. [VERIFIED]

### Feature: Schedule (events, tasks, rhythms)
- **Implementation:** FE `pages/Schedule.jsx`. BE `routers/schedule.py` (events),
  `routers/tasks.py` (one-off tasks), `routers/rhythms.py` (recurring commitments w/ `next_due`).
- **Important logic:** Event `type` allowlist includes `council` (added v0.15). Rhythm cadence
  next-due via `relativedelta` (daily→yearly). Tasks set `completed_at` on completion. [VERIFIED]

### Feature: Members
- **Implementation:** FE `pages/Household.jsx` (route `/members`). BE `POST /household/members`,
  `DELETE /household/members/{id}`, patron-saint via `PATCH /household`.
- **Important logic:** Cannot delete the member linked to your own login. Deleting a member pulls
  them from any rule's `assigned_member_ids`. [VERIFIED]

### Feature: Charter page (`/charter`)
- **Purpose:** Permanent, printable re-render of the First Household Charter.
- **Implementation:** FE `pages/Charter.jsx` + shared `CharterCard`. Pure consumer of
  `GET /household/me`. Empty-state routes back to `/onboarding`. [VERIFIED]

### Feature: Settings
- **Implementation:** FE `pages/Settings.jsx`: household name/patron/calendar via `PATCH /household`;
  theme (light/dark) persisted to `localStorage`. [VERIFIED]

---

# 5. COMPLETE USER WORKFLOWS

### Workflow A — First-time sign-in → household → charter
**Plain English:** A new parent signs in with Google, names the household, adds family members,
answers a short reflective examen, picks a first rule, schedules the first Family Council, and
lands in the app with a Charter created.

1. **Entry point:** `/` Landing → "Begin with Google".
2. **User action:** Redirect to `auth.emergentagent.com?redirect=<origin>/auth/callback`.
3. **Frontend:** After Google, browser returns to `/auth/callback#session_id=...`. `App.js`
   detects `session_id` in hash and renders `AuthCallback` regardless of route.
4. **Backend:** `POST /api/auth/session` calls `EMERGENT_SESSION_URL` with `X-Session-ID`;
   creates/updates `users`, inserts `user_sessions`, sets cookie, returns user.
5. **State changes:** `AuthProvider.setUser`; navigate with `state:{user}` to avoid the redirect race.
6. **DB changes:** `users` upsert; `user_sessions` insert.
7. **External calls:** Emergent session-data endpoint.
8. **AI calls:** None.
9. **Validation:** Missing `session_id` → back to `/`. Invalid → 401.
10. **Error handling:** On exchange failure, `AuthCallback` retries via `/auth/me` (recovers the
    StrictMode race); only if that also fails does it toast + bounce to `/`.
11. **Fallback:** Bearer header works if cookie is blocked (tests rely on this).
12. **Completion:** No `current_household_id` → `/onboarding`; else `/dashboard`.
    - Onboarding step 2→3 fires `POST /household` (+ `POST /household/members` per member),
      then `refresh()` updates the user; step 7→8 fires `POST /household/first-charter` (which
      also inserts a `council` event). "Enter Patria" → `/dashboard`.

### Workflow B — Weekly Family Council
**Plain English:** Once a week the family opens Council, reviews the auto-agenda, records
priorities/assignments/decisions, and finalizes so assignments become tasks.

1. **Entry:** `/council`.
2. **User action:** "Begin this week's meeting".
3. **Frontend:** `Council.refresh()` fetches agenda + meetings + household in parallel; opens any
   existing current-week draft.
4. **Backend:** `POST /council/meeting` snapshots `_build_agenda()` into a `draft` meeting.
5. **State:** local editable buffers (priorities/assignments/notes/decisions) autosave via `PATCH`
   on add/remove and `onBlur`.
6. **DB:** `meetings` insert/update; on finalize, `tasks` inserts.
7. **External/AI:** None.
8. **Validation:** Empty priority/assignment titles ignored client-side.
9. **Error handling:** Every mutation wrapped in try/catch → `toast.error(explainError())`.
10. **Fallback:** Finalize is idempotent — re-finalize won't duplicate tasks.
11. **Completion:** Meeting `status → held`, `finalized_at` set, assignments carry `task_id`.
    Printable one-page summary via `window.print()` with print-only CSS.

### Workflow C — Log a prayer rhythm
1. **Entry:** `/spiritual?tab=prayer`.
2. **Action:** Toggle a rhythm row ✓.
3. **Frontend:** `POST /prayer/log {prayer_type, log_date}` (no member_id).
4. **Backend:** inserts `prayer_logs`.
5. **Unmark:** deletes the most recent log of that type for the date.
6. **Completion:** 7-day aggregate (`/prayer/stats`) refreshes; Dashboard `days_with_prayer_last_7` updates next load.

### Workflow D — Budget month setup
1. **Entry:** `/budget`. If no categories → "Start with default categories" → `POST /budget/seed-defaults`.
2. **Income:** `GET /budget/income-sources` auto-carries recurring sources from the prior month.
3. **Ledger:** `POST /budget/transactions` (expense/income/giving).
4. **Summary:** `GET /budget/summary` computes income (sources received + legacy income txns),
   expense, giving, tithe %, per-category `over_by`.

---

# 6. SYSTEM ARCHITECTURE

- **Frontend:** React 19 + React Router 7, built with **CRACO** (not plain CRA), Tailwind CSS,
  Radix UI / shadcn components (`src/components/ui/`), axios, `sonner` toasts, `lucide-react`.
  Fonts: Fraunces (serif), Geist (sans), JetBrains Mono. [VERIFIED: `package.json`, `design_guidelines.json`]
- **Backend:** FastAPI (Python), `APIRouter(prefix="/api")`, 14 domain routers, Pydantic v2,
  `motor` async Mongo driver. [VERIFIED]
- **Database:** MongoDB (single database, name from `DB_NAME`; local dev = `test_database`).
- **Authentication:** Emergent-managed Google OAuth; cookie `session_token` + Bearer fallback; 7-day sessions.
- **Hosting:** Kubernetes container; frontend on :3000, backend on :8001, ingress routes `/api/*`
  to backend. Supervisor-managed processes with hot reload. [VERIFIED: env conventions]
- **Storage:** No object storage / file uploads. Static images live in `frontend/public/`
  (`patria-logo.png`, `sacred-heart.png`). [VERIFIED]
- **Third-party services:** Only Emergent OAuth. No payments, email, SMS, analytics, or LLMs.
- **Background jobs / webhooks / queues / schedulers:** None. [VERIFIED — no cron, no APScheduler]
- **Logging:** Python `logging` at INFO in `server.py`; no structured logging or telemetry.
- **Email/SMS/comms:** None.

```
                         Browser (React 19 SPA, CRACO, Tailwind/Radix)
                                        │  axios (withCredentials)
                                        │  REACT_APP_BACKEND_URL + /api
                                        ▼
                         Kubernetes ingress  ──(/api/*)──► FastAPI :8001
                                        │                      │
                              (non-/api)│                      ├── routers/* (14 domains)
                                        ▼                      ├── deps.get_current_user
                                  React dev :3000              ├── liturgical.py (pure calc)
                                                               └── motor ──► MongoDB (DB_NAME)
                                        ▲
   Google ──► auth.emergentagent.com ──┘ (#session_id) ──► POST /api/auth/session
                                                               └── httpx ──► EMERGENT_SESSION_URL
```

---

# 7. DIRECTORY AND FILE MAP

### Backend (`/app/backend/`)
- `server.py` — **entry point**. Builds FastAPI app, mounts all routers under `/api`, CORS,
  logging, shutdown hook. ~60 lines (slimmed from ~1,650 in v0.5). [VERIFIED]
- `deps.py` — **shared core**: Mongo client/db, `User`/`Member`/`Household` Pydantic models,
  helpers (`now_utc`, `make_id`, `monday_of_week`), `get_current_user`, `require_household`,
  `get_household` dependency. `EMERGENT_SESSION_URL` constant. **Read this second.**
- `liturgical.py` — **liturgical engine** (pure, no DB). Easter computus, seasons, `FIXED_FEASTS`,
  `OPTIONAL_MEMORIALS_MODERN/TRADITIONAL`, naming, `season_label`, `liturgical_for`, `liturgical_month`.
- `challenges.py` — static `CHALLENGE_TEMPLATES` dict + accessors.
- `routers/` — one file per domain: `auth, household, liturgical, rules, prayer, challenges,
  budget, schedule, tasks, goals, dashboard, council, sacred_heart, rhythms`.
- `tests/` — pytest suites (see §16) + `conftest.py` (seeded session fixtures).
- `requirements.txt` — Python deps. **Note:** `emergentintegrations==0.1.0` is present but unused. [VERIFIED]

### Frontend (`/app/frontend/`)
- `src/App.js` — **router + route guards** (`ProtectedRoute`, `PublicOnly`, legacy redirects,
  hash-based AuthCallback interception). Theme init from localStorage.
- `src/index.js`, `src/index.css`, `src/App.css` — bootstrap + global styles (fonts, liturgical CSS vars).
- `src/lib/` — `api.js` (axios instance, `BACKEND_URL`, `API`), `auth.jsx` (AuthProvider/useAuth),
  `errors.js` (`explainError`), `liturgical.js` (FE color/initials helpers), `utils.js` (cn()).
- `src/components/` — `AppShell.jsx` (sidebar/topbar nav, `print:hidden`), `Panel.jsx`,
  `Crest.jsx` (`Crest`, `CrestDivider`, `SacredHeartEngraving` SVGs), `CharterCard.jsx`
  (shared charter artifact + option constants + `buildDraft`), `ui/` (shadcn primitives).
- `src/pages/` — one file per screen (see §4). `budget/` subfolder holds the 3 budget panels.
- `public/` — `index.html` (**still has default title "Emergent | Fullstack App"** — see §23/§29),
  `patria-logo.png`, `sacred-heart.png`.
- `craco.config.js`, `tailwind.config.js`, `postcss.config.js`, `components.json`, `jsconfig.json` — build/config.
- `plugins/health-check/` — Emergent platform health-check plugin. [VERIFIED present]

### Legacy / possibly obsolete (verify before deleting)
- `src/pages/RuleOfLife.jsx` (169 lines) — **not imported anywhere** [VERIFIED grep]. Superseded
  by `HouseholdOrder.jsx`. Route `/rule` redirects to `/order`.
- `src/pages/Calendar.jsx`, `src/pages/Challenges.jsx` — **are** used, embedded inside `SpiritualLife.jsx`.
- `Today.jsx` — **already deleted** (handoff flagged it as dead; no longer present). `/today` redirects to `/dashboard`.
- Root `/app/tests/` (with `__init__.py`) — appears empty of real tests; real tests are in `backend/tests/`.

---

# 8. DATA MODEL

**Technology:** MongoDB, one database. Access via `motor`. **No ODM / no `_id` exposure** — each
collection uses a UUID string business key generated by `make_id(prefix)` (e.g. `hh_...`,
`mem_...`, `mtg_...`), and all reads project `{"_id": 0}`. Datetimes stored as **ISO strings**
(`now_utc().isoformat()`), and dates as `YYYY-MM-DD` strings. [VERIFIED across all routers]

### Collections
- **users** — `user_id, email, name, picture, current_household_id, created_at`. The
  authenticated person. `current_household_id` links to their one household.
- **user_sessions** — `user_id, session_token, expires_at, created_at`. One row per login (see §25).
- **households** — the central document. Fields:
  - Core: `household_id, name, patron_saint, calendar_variant ("roman"|"traditional"|"byzantine"), created_by, created_at`.
  - Mission: `mission_statement, values[], technology_policy, roles{}`.
  - Sacred Heart: `sacred_heart_enthroned_at, sacred_heart_renewal_at, sacred_heart_notes`.
  - **Charter (v0.15):** `drift_areas[], peace_to_protect, first_household_rule, first_council_at (ISO "YYYY-MM-DDTHH:MM"), first_charter_completed_at`.
- **members** — `member_id, household_id, name, role ("parent"|"child"), color, patron_saint, linked_user_id, created_at`. `linked_user_id` set only for the creator's member.
- **rules** — `rule_id, household_id, pillar, title, cadence, assigned_member_ids[], created_at`. (Household "practices".)
- **rule_checkins** — `checkin_id, rule_id, household_id, member_id, checkin_date, created_at`. Upserted per (rule, member, date).
- **prayer_logs** — `log_id, household_id, member_id (nullable), prayer_type, detail, log_date, created_at`. Household-level since v0.11.
- **challenges** — `challenge_id, household_id, template_key, title, days_total, color, start_date, member_ids[], status ("active"|"completed"), created_at`.
- **challenge_checkins** — `checkin_id, challenge_id, household_id, member_id, checkin_date, created_at`.
- **budget_categories** — `category_id, household_id, name, monthly_limit, color, kind ("expense"|"giving"|"savings"), group (8 keys), created_at`.
- **budget_transactions** — `txn_id, household_id, category_id, amount, type ("expense"|"income"|"giving"), note, member_id, txn_date, created_at`.
- **income_sources** — `source_id, household_id, name, source_type, expected_amount, received_amount, month, year, recurring, notes, created_at, carried_from?`.
- **financial_goals** — `goal_id, household_id, name, goal_type ("savings"|"debt_payoff"|"giving"|"other"), target_amount, current_amount, target_date, monthly_contribution, color, notes, created_at`.
- **savings_goals** — **legacy**; `goal_id, household_id, name, target_amount, current_amount, deadline, color, created_at`. Read-through-mapped into financial goals with `legacy=true`.
- **events** — `event_id, household_id, title, event_date, event_time, type ("family"|"liturgical"|"date_night"|"school"|"medical"|"other"|"council"), notes, member_ids[], created_at`.
- **tasks** — `task_id, household_id, title, due_date, assigned_member_id, category, completed, completed_at, created_at`, and for council-sourced tasks: `source_meeting_id, assignment_id`.
- **family_goals** — `goal_id, household_id, title, description, scope ("short"|"long"), progress (0–100), deadline, completed, created_at`.
- **meetings** — `meeting_id, household_id, week_start (Monday), agenda_snapshot{}, notes, decisions, assignments[], priorities[], status ("draft"|"held"), created_at, finalized_at`.
- **rhythms** — `rhythm_id, household_id, name, cadence (daily→yearly), last_observed, member_ids[], notes, created_at`; `next_due` computed on read.

### Relationships / FKs
All child docs carry `household_id`. Members referenced by `member_id` in `assigned_member_ids`,
`assigned_member_id`, `member_ids`, and check-ins. Tasks link back to a meeting via
`source_meeting_id` + `assignment_id`.

### Status fields / state machines
- `meetings.status`: `draft → held` (one-way; finalize sets `held` + `finalized_at`).
- `challenges.status`: `active → completed`.
- `tasks.completed`: bool with `completed_at` timestamp.

### Non-obvious field meanings
- `households.first_council_at` — the *scheduled* first council datetime (drives a `council` event), **not** when a council was held.
- `households.first_charter_completed_at` — set once; gates all Charter UI affordances.
- `income_sources.carried_from` — `"YYYY-MM"` marker showing an auto-carried recurring source.
- `challenges.member_progress` — computed but **not rendered** (v0.14 removal); harmless residue.
- `budget_categories.group` — one of 8 stewardship keys; legacy rows default to `"other"`.

### Indexes
**None are declared in code.** [VERIFIED — no `create_index` anywhere]. All queries rely on
collection scans filtered by `household_id`. Fine at current scale; see §27.

---

# 9. STATE MANAGEMENT

- **Client-side (React):** Local `useState` per page; there is **no Redux/Zustand/global store**
  except `AuthContext` (`lib/auth.jsx`) holding `{user, loading}`. `AppShell` independently
  fetches `/household/me` for the sidebar. Council keeps rich local editable buffers that mirror
  the server meeting doc and autosave on change/blur. [VERIFIED]
- **Auth/session state:** `user` in AuthContext + cookie `session_token`. A subtle nuance: route
  guards also read `location.state.user` passed from `AuthCallback` navigation to bridge the
  window before `setUser` propagates (prevents redirect loop). [VERIFIED: `App.js`]
- **Server-side:** Stateless FastAPI; all state is in Mongo. Sessions validated per request via `user_sessions`.
- **Cached state:** None server-side. Client theme cached in `localStorage`. Tab selection cached in URL query (`?tab=`).
- **AI conversation state:** N/A (no AI).
- **Stale/conflict risks:** (1) `AppShell`'s household copy can lag edits made on Settings/Members
  until reload; (2) Council autosave is fire-and-forget PATCH — a failed save toasts but local
  state stays ahead of server; (3) Dashboard is fetched once on mount, not revalidated.

---

# 10. BUSINESS LOGIC AND IMPORTANT RULES

### Rule: No grading of the family (the core product law)
- **What:** No composite health score, no streaks, no per-member leaderboards, no goal-average KPI.
- **Why:** Explicit product philosophy — Patria should feel calm and communal, not like a compliance dashboard.
- **Where:** Enforced by *absence*. Tests assert removed fields stay removed
  (`weekly_score not in`, `goals.avg_progress not in`, `streak_days/week_count not in`) in
  `tests/test_patria_modules.py::test_dashboard_shape`. [VERIFIED]
- **Origin:** Intentionally designed; the result of the v0.9–v0.14 subtraction arc.
- **Caution:** The single surviving progress bar is `active_challenge.completion_pct` (a devotional
  Day-X-of-Y arc) — intentionally kept. Individual family-goal bars also remain intentionally.

### Rule: Council finalize is idempotent
- **What:** Re-finalizing a meeting never double-creates tasks.
- **Why:** Clients could re-submit; earlier behavior risked duplicate tasks.
- **Where:** `routers/council.py::finalize_meeting` — diffs against tasks with matching
  `source_meeting_id`, dedup by `assignment_id` OR title, backfills `assignment_id`/`task_id`.
- **Origin:** Reliability safeguard designed in v0.5.

### Rule: Household created once, at onboarding step 2→3
- **What:** `POST /household` fires exactly once; further steps only PATCH/charter-post.
- **Where:** `Onboarding.jsx` (`householdCreated` guard) + `createHouseholdAndAdvance`.
- **Why:** So the household exists from step 2 and every later step (incl. "Skip") is safe.

### Rule: Recurring income auto-carry-forward
- **What:** Opening a month with no income sources seeds the latest prior month's *recurring*
  sources (expected preserved, received reset to 0, `carried_from` stamped). One-off types never carry.
- **Where:** `routers/budget.py::_autocarry_recurring_income` (called by list + summary).
- **Why:** Monthly stewardship convenience. **Side effect:** merely *reading* a month can *write*
  new income_source rows (see §20/§25).

### Rule: Default seed is idempotent
- **What:** `POST /budget/seed-defaults` skips categories that already exist by name.
- **Where:** `routers/budget.py::seed_defaults`.

### Rule: Cannot remove your own primary member
- **Where:** `routers/household.py::delete_member` (400 if `linked_user_id == user.user_id`).

### Rule: Liturgical variant coercion
- **What:** Any variant other than `roman`/`traditional` is treated as `roman`.
- **Where:** `liturgical.py::liturgical_for` and `routers/dashboard.py`. Consequence: "byzantine"
  is label-only. **Origin:** intentional MVP scoping, but a likely surprise. [VERIFIED]

### Rule: Optional memorials suppressed by higher rank
- **What:** Optional memorials only surface on `feria`/`sunday` days; feasts/solemnities suppress them.
- **Where:** `liturgical.py::liturgical_for` (`rank in ("feria","sunday")` gate).

### Rule: Validation allowlists
- Event types, category groups, goal types, cadences, income source types, rule pillars — all
  validated against tuples in their routers (HTTP 400 on violation). [VERIFIED]

### Rule: Friday abstinence / solemnity lifting
- **Where:** `liturgical.py` — Fridays flagged abstinence (strict in Lent); a solemnity outside
  Lent lifts Friday penance. [VERIFIED]

---

# 11. AI / MODEL ARCHITECTURE

**There is no AI/LLM in the application.** [VERIFIED]

- `emergentintegrations==0.1.0` is listed in `requirements.txt` but is **never imported** anywhere
  in `/app/backend`. [VERIFIED grep]
- The onboarding "charter draft" that *looks* generated is a **deterministic template**
  (`components/CharterCard.jsx::buildDraft`) concatenating fixed sentences from the user's
  selections. No inference. [VERIFIED]
- Decision types today:
  - **DETERMINISTIC CODE:** liturgical calculations, agenda composition, budget math, charter draft, next-due/anniversary math.
  - **HUMAN INPUT:** everything else (names, selections, notes, decisions).
  - **AI INFERENCE:** none.

**Historical/backlog note [HISTORICAL]:** PRD backlog P1 lists an AI module ("Claude Sonnet 4.5:
mission-statement coach, Council agenda enrichment, formation prompts") — *planned, not built*.

---

# 12. PROMPT INVENTORY

**No prompts exist in the project.** [VERIFIED — no system prompts, no LLM calls, no prompt
strings]. The only "generated-looking" text is the deterministic `buildDraft()` template in
`components/CharterCard.jsx`. If the next agent implements the backlog AI module, this section
should be populated then.

---

# 13. EXTERNAL INTEGRATIONS

### Emergent-managed Google OAuth (the only external integration)
- **Purpose:** User authentication.
- **Where called:**
  - FE redirects to `https://auth.emergentagent.com/?redirect=<origin>/auth/callback` (`Landing.jsx`, hardcoded per Emergent playbook — do not change).
  - BE `routers/auth.py::auth_session` calls `EMERGENT_SESSION_URL`
    (`https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data`, in `deps.py`) with header `X-Session-ID`.
- **Auth method:** One-time `session_id` from the OAuth redirect fragment → exchanged for a
  `session_token` stored in `user_sessions`.
- **Env vars:** None secret required for this flow in code (the Emergent endpoints are constants).
  App relies on `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL` (names only).
- **Data sent:** `X-Session-ID` header. **Data received:** `{email, name, picture, session_token}`.
- **Failure handling:** Non-200 → 401 "Invalid session_id"; FE recovers via `/auth/me` or bounces to Landing.
- **Rate limits / cost:** Unknown/none observed. [UNVERIFIED]

No other external services (no Stripe, email, SMS, analytics, storage, or LLM providers). [VERIFIED]

---

# 14. ENVIRONMENT AND CONFIGURATION

**Never commit secret values. Names only below.**

### Backend `/app/backend/.env` [VERIFIED names]
- `MONGO_URL` — Mongo connection string (local in dev).
- `DB_NAME` — database name (dev = `test_database`). **Do not rename** (protected).
- `CORS_ORIGINS` — comma-separated allowed origins (defaults to `*` in `server.py`).

### Frontend `/app/frontend/.env` [VERIFIED names]
- `REACT_APP_BACKEND_URL` — external backend base URL; FE composes `${...}/api`. **Protected.**
- `WDS_SOCKET_PORT` — CRA/CRACO dev socket port.
- `ENABLE_HEALTH_CHECK` — toggles the health-check plugin.

### Build / runtime
- FE build: CRACO (`craco start|build|test`), Tailwind + PostCSS, path alias `@` → `src`.
- BE runtime: FastAPI via supervisor (uvicorn), port 8001; FE port 3000.
- Ports/URLs/DB all come from env; no hardcoded fallbacks except CORS `*` default.
- **Feature flags:** none in the app (only `ENABLE_HEALTH_CHECK` at platform level).

---

# 15. DEPLOYMENT AND HOSTING

- **Platform:** Emergent (Kubernetes-backed). A deploy was initiated (see the system notification
  accompanying this task). [HISTORICAL]
- **Frontend:** Built by CRACO, served on :3000 (preview) / platform-managed in production.
- **Backend:** FastAPI on :8001, supervisor-managed, `/api/*` routed via ingress.
- **Database:** MongoDB reachable via `MONGO_URL`.
- **Domains/DNS/SSL:** Handled by Emergent platform (cookie is `secure; samesite=none`, implying HTTPS). [INTERPRETATION]
- **Build/deploy commands:** Not run by hand; use the platform's deploy pipeline. GitHub pushes
  are done through Emergent's "Save to GitHub" feature (the user asked to push to
  `github.com/christianrussell932/patria-app.git` — must be done via that UI feature, not git CLI).
- **CI/CD:** Platform auto-commits after each step (see `git log` — "auto-commit for <uuid>").
- **Reproducing locally:** set the four+ env names, run Mongo, `pip install -r requirements.txt`,
  `yarn install` in frontend, start both via supervisor. Seed the demo session directly in Mongo (see §22).
- **Known quirks:** `frontend/public/index.html` still ships the default Emergent `<title>` and
  meta description — a production polish gap. [VERIFIED]

---

# 16. TESTING AND VALIDATION

- **Automated backend tests:** 8 pytest files in `backend/tests/` with **~152 `def test_`
  functions** [VERIFIED grep count]:
  - `test_catholic_household_os.py` (37), `test_patria_modules.py` (34),
    `test_patria_v3_modules.py` (25), `test_patria_v4_season_label.py` (11),
    `test_patria_v5_correctness.py` (15), `test_patria_v5_public_endpoints.py` (6),
    `test_patria_v6_optional_memorials.py` (11), `test_patria_v7_budget.py` (13).
  - **Reconciliation:** PRD/handoff cite "170 passing" [HISTORICAL]. My static count of `def test_`
    is 152; the difference is likely parametrization/class expansion or drift. Run `pytest` to get
    the authoritative number before trusting either.
- **Fixtures/fixtures data:** `conftest.py` seeds an ephemeral user+session in local Mongo and
  yields a Bearer `auth_client`; also an `anon_client`. Many read-assertion tests use the
  persistent **demo** session (`demo_session_patria` / `hh_demo_patria`).
- **Test transport:** Tests hit the live `REACT_APP_BACKEND_URL` (or a default preview URL) over
  HTTP with the Bearer header — i.e., closer to E2E/integration than pure unit tests.
- **Frontend tests:** No JS unit/e2e test files committed. Frontend verified via the platform's
  testing agent + screenshots historically (iteration reports in `/app/test_reports/`).
- **Well tested:** liturgical engine (multiple variant/edge suites), budget, council idempotency,
  dashboard shape/philosophy locks, household/charter endpoints.
- **Weakly tested:** frontend behavior/UI, auth race conditions (logic exists but hard to unit-test),
  income auto-carry side effects over many months.
- **Untested:** the visual/print output, theme switching, offline/network-drop UX (though hardened).
- **Verify first before changes:** Council finalize idempotency; onboarding→charter→council seam;
  dashboard philosophy locks; liturgical variant correctness.
- **Known flaky:** `test_patria_modules.py::test_dashboard_demo_has_data` depends on demo
  prayer_logs being within the last 7 days; it fails when the demo data ages (fix: roll demo logs
  forward — see §22). [HISTORICAL, plausible from code]

---

# 17. MAJOR DEVELOPMENT ITERATIONS

> Source: `/app/memory/PRD.md` [HISTORICAL], corroborated by current code [VERIFIED where noted].
> Dates are as recorded in PRD (Jan–Feb 2026).

## v0.1 — "Domus" (Jan 2026)
Goal: foundation. Result: 34/34 backend + e2e. Later renamed/restructured.

## v0.2 — Patria restructure
Goal: new IA (Dashboard, Budget, Mission, Schedule, expanded Members). Result: 68/68.

## v0.3 — Refinement
Added Family Council, Sacred Heart tab, liturgical engine v2 (ferial naming, Traditional overlay),
household rhythms, Crest motif. 93/93.

## v0.4 — Cleanup & Coherence
Landing de-numbered ("What lives inside"), Traditional 1962 as third calendar option, sticky
sidebar, dashboard feast-first header, mission/values prominence, 7-tile Household Order. 104/104.

## v0.5 — Technical correctness & modularization
`server.py` 1,650→~60 LOC; extracted all routers + `deps.py`; **idempotent finalize**;
`dateutil.relativedelta` cadence math; Traditional 1962 "Sundays after Epiphany" rubric. 143/143.

## v0.6 — Optional memorials
`optional_memorials[]` on liturgical responses; ~130 modern memorials; suppression by rank. 150/150.

## v0.7 — Budget expansion (Feb 12)
Category groups, `seed-defaults`, income sources w/ recurring carry-forward, financial goals
(+legacy read-through), richer summary; `Budget.jsx` split into panels. 167/167.

## v0.8 — App-wide frontend resilience (Feb 13)
`lib/errors.js::explainError`; wrapped every axios mutation in try/catch + `toast.error`.
Eliminated the recurring "Uncaught Runtime Error" overlay. (Flagged `Today.jsx` dead code.)

## v0.9 — Removed Household Health score
Removed `weekly_score` API + UI; promoted Council panel into freed slot.

## v0.10 — Removed Family Goals avg-progress
Removed `goals.avg_progress`. 167/167.

## v0.11 — Household-level prayer rhythm
Replaced per-member prayer matrix with household rhythm list; `member_id` optional. 168/168.

## v0.12 — Removed "streak" framing
Copy pass: "Prayer rhythm · 6/7"; added `days_with_prayer_last_7`.

## v0.13 — Onboarding simplified + first-run guidance
3→2 screens; deferred patron saint/colors; `has_held_first_council` flag; first-run Dashboard/Council states.

## v0.14 — Removed challenge leaderboard + purged stale prayer fields
Removed per-member challenge count; removed `streak_days`/`week_count`. Closed the subtraction arc.

## v0.15 — "Build Your First Rule of the Home" onboarding (Feb 13)
2→8 steps; new charter fields on households; `POST /household/first-charter` (+council event);
event type `council`. 170/170 (per PRD).

## v0.16 — Permanent /charter page (Feb 13)
Extracted `CharterCard.jsx`; new `/charter` route; Dashboard entry link. No backend change.

## v0.17 — Charter ↔ Council ritual seam (Feb 13)
Charter header "Review at Family Council" link + first-council line; Council charter reference
card. Zero new endpoints/schema. **This is the last recorded working item.** [HISTORICAL]

**Lessons (recurring theme):** the project's biggest wins came from *subtraction* and copy
discipline, not new surfaces. Reliability (idempotency, error hardening) was added reactively
after real bugs.

---

# 18. IMPORTANT DECISIONS

### Decision: No AI in MVP
- Context: A calm, deterministic product; AI listed only as future backlog.
- Alternatives: LLM-drafted charters/agendas (planned P1).
- Decision: Deterministic templates and calculations only. Relevance: current. Where: everywhere; `buildDraft()`.

### Decision: UUID string keys + `{"_id": 0}` projection instead of ObjectId/ODM
- Context: Avoid Mongo `ObjectId` JSON-serialization issues cleanly.
- Decision: Every doc gets a prefixed UUID business key; never expose `_id`.
- Relevance: current, pervasive. Where: `deps.make_id` + all routers.
- Note: This *diverges* from the platform's usual `PyObjectId`/`BaseDocument` guidance but is
  internally consistent and works. Don't "modernize" it without a migration plan.

### Decision: Modular routers + slim `server.py`
- Context: v0.1–v0.4 had a ~1,650-line monolith. Decision (v0.5): extract to `routers/` + `deps.py`.
- Relevance: current; makes the codebase easy to navigate.

### Decision: Cookie + Bearer dual auth
- Context: Browser uses cookie; tests need header auth. Decision: accept both in `get_current_user`.

### Decision: Anti-gamification (see §10)
- The single most identity-defining product decision; enforced by removals + test locks.

### Decision: Liturgical engine as pure Python (no external calendar API)
- Context: Full control, offline, no rate limits. Trade-off: it's an "approximation good enough for MVP".

### Decision: Idempotent, additive backend changes
- Charter fields are all Optional; `first-charter` and `seed-defaults` are idempotent-in-spirit;
  new event type merely widened an allowlist — chosen to avoid migrations and regressions.

---

# 19. REJECTED OR ABANDONED APPROACHES

- **Per-member prayer tracking matrix** — Built early, **abandoned in v0.11** for household-level
  rhythm. Remnant: `prayer_logs.member_id` still accepted (now optional/informational). [VERIFIED]
- **Composite "Household Health Score"** — Built, **removed v0.9**. Remnant: none in code; test
  asserts `weekly_score` absent. [VERIFIED]
- **Family Goals average-progress KPI** — Removed v0.10. Remnant: none; test lock present.
- **Challenge per-member leaderboard count** — Removed v0.14. Remnant: `challenges.member_progress`
  still computed server-side but unused by UI. [VERIFIED]
- **Prayer streak / week-count** — Removed v0.12/v0.14. Remnant: none in dashboard payload.
- **"Today" route/page** — `Today.jsx` was hardened then flagged dead; **now deleted**; `/today`
  redirects to `/dashboard`. [VERIFIED absence]
- **`RuleOfLife.jsx`** — superseded by `HouseholdOrder.jsx`; file remains but is **unused**. [VERIFIED]

> Do not rebuild any of the above scorekeeping features — their removal was deliberate product direction.

---

# 20. WORKAROUNDS AND HISTORICAL PATCHES

### AuthCallback StrictMode dedupe + `/auth/me` recovery
- Problem: React 18/19 StrictMode double-mounts; a one-time `session_id` replayed → 401 → redirect loop.
- Workaround: module-level `processedSessionIds` Set + `useRef` guard; on exchange failure, try
  `/auth/me` before bouncing. Location: `pages/AuthCallback.jsx`.
- Still relevant? Yes — StrictMode still active; keep it. [VERIFIED]

### Route guards trust `location.state.user`
- Problem: brief window after login where `setUser` hasn't propagated → guard sees null → bounce.
- Workaround: `ProtectedRoute`/`PublicOnly` accept `location.state.user`. Location: `App.js`.
- Still relevant? Yes. [VERIFIED]

### Council finalize title-based dedup fallback
- Problem: clients sometimes drop `assignment_id` on PATCH round-trip → risk of duplicate tasks.
- Workaround: dedup by title when `assignment_id` missing, then backfill IDs. Location: `finalize_meeting`.
- Still relevant? Yes, defensively. [VERIFIED]

### Income auto-carry on read
- Problem/intent: convenience so a new month prefills recurring income.
- Behavior: a **GET** (`/income-sources`, `/summary`) can **write** rows. Location:
  `_autocarry_recurring_income`. Could be surprising; not a bug per se. [VERIFIED]

### Demo data roll-forward
- Problem: `test_dashboard_demo_has_data` ages out after 7 days.
- Workaround: a bash script rolls demo `prayer_logs` to the current week before running tests. [HISTORICAL]

> Document only — do not remove these without confirming the underlying condition is gone.

---

# 21. RECURRING PROBLEMS DURING DEVELOPMENT

### Uncaught React runtime overlay from unhandled axios rejections
- Dates/iterations: through v0.8; recurrence count 4 (per handoff).
- Attempted: per-page try/catch, shared `explainError`, disabled-while-submitting buttons.
- Current status: **RESOLVED** (v0.8 app-wide hardening; iteration 7 passed). [HISTORICAL + VERIFIED pattern in code]
- Files: `lib/errors.js` + every page's mutation handlers.

### Auth redirect loop
- Iterations: pre-v0.13-ish. Attempted: dedupe + state-passing + `/auth/me` recovery.
- Current status: mitigated; logic present. Files: `AuthCallback.jsx`, `App.js`, `auth.jsx`.

### Product philosophy drift (scores creeping back)
- The user repeatedly corrected toward *less* measurement (v0.9–v0.14).
- Current status: enforced by test locks. Files: `dashboard.py`, `test_patria_modules.py`.

### Demo test data aging
- Recurs whenever tests run > 7 days after seeding. Status: managed via roll-forward script.

---

# 22. MANUAL TASKS AND FRICTION

- **Seeding the demo household.** No seed script exists in the repo [VERIFIED]. The demo
  (`demo_session_patria` / `hh_demo_patria`) must be inserted directly into Mongo; the
  instructions/values live in `/app/memory/test_credentials.md`. This is manual and easy to lose.
- **Rolling demo prayer logs forward** before running the full pytest suite (to keep
  `test_dashboard_demo_has_data` green).
- **Creating fresh test sessions** via Mongo inserts (documented in `test_credentials.md`) rather than through the UI.
- **Running tests against a live URL** (they use `REACT_APP_BACKEND_URL`), so the backend must be up.
- **GitHub push** must go through Emergent's "Save to GitHub" UI feature — not scriptable from here.

---

# 23. KNOWN BUGS

### CURRENT (verified or strongly suspected)
- **B1 [VERIFIED, cosmetic]:** `frontend/public/index.html` still has the default title
  "Emergent | Fullstack App" and description "A product of emergent.sh". Wrong branding/SEO for a production Patria.
- **B2 [SUSPECTED, test flakiness]:** `test_dashboard_demo_has_data` fails once demo prayer_logs age past 7 days.
- **B3 [SUSPECTED, UX]:** `AppShell` caches `/household/me` on mount; editing name/patron/saint in
  Settings or Members won't update the sidebar until a full reload.
- **B4 [SUSPECTED, semantics]:** GET on budget income endpoints can create DB rows (auto-carry);
  a read that mutates may surprise future maintainers or double-count under concurrency.

### HISTORICAL (believed fixed — verify, don't assume)
- Uncaught axios overlay (fixed v0.8). Auth redirect loop (mitigated). Council double-task on
  re-finalize (fixed v0.5 idempotency). Prayer/score-drift (resolved via removals).

No blocking bugs are known. [HISTORICAL: handoff "highly stable"]

---

# 24. KNOWN LIMITATIONS

- **Single user per household**; no invitations / shared multi-user households (P2 backlog).
- **Byzantine calendar is label-only** (renders as Roman). [VERIFIED]
- **Liturgical engine is an MVP approximation** (docstring); some 1962 edge cases acknowledged in backlog.
- **No file uploads / object storage / images beyond static assets.**
- **No notifications** (PWA push is backlog).
- **No payments / paid plans** (Stripe is P2).
- **No offline mode / PWA install.**
- **No indexes** on Mongo (scale ceiling).
- **No account deletion / data export.**

---

# 25. TECHNICAL DEBT

### VERIFIED
- **Session table grows unbounded:** each login inserts a new `user_sessions` row; logout deletes
  one; expired rows are never purged. [VERIFIED: `auth.py`]
- **Unused dependency `emergentintegrations`** in `requirements.txt` (implies AI once planned). [VERIFIED]
- **Dead file `RuleOfLife.jsx`** (unused). [VERIFIED]
- **Default `index.html` metadata** (see B1).
- **No DB indexes.** [VERIFIED]
- **`member_progress` computed but unused** in challenges (dead compute). [VERIFIED]

### POSSIBLE CLEANUP (verify impact first)
- Read-path writes in budget auto-carry (design smell; may be intentional convenience).
- `AppShell` duplicating `/household/me` fetch instead of sharing context.
- Root `/app/tests/` scaffold appears empty vs real `backend/tests/`.
- CORS defaults to `*` when `CORS_ORIGINS` unset (fine in dev; tighten for prod).

*None of these are currently causing user-facing failures.*

---

# 26. SECURITY AND PRIVACY

- **Authentication:** Emergent Google OAuth; server-validated session tokens with 7-day expiry;
  cookie `httponly, secure, samesite=none` + Bearer fallback. [VERIFIED]
- **Authorization:** Every household-scoped query filters by `household_id` derived from the
  authenticated user's `current_household_id` (`get_household`/`require_household`). Cross-household
  access is prevented by these filters, **not** by a separate ACL layer. [VERIFIED]
- **Sensitive data:** Emails, names, pictures (from Google), plus family/financial notes. No
  passwords are stored (OAuth only). No PII beyond the above.
- **Secret management:** All via env (`MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`).
  No secrets in code. Do not add fallbacks that leak or hardcode them.
- **API security:** No rate limiting, no CSRF tokens (mitigated by SameSite=None+cookie+CORS and
  Bearer). CORS defaults `*` if unset. [VERIFIED]
- **Upload security:** N/A (no uploads).
- **Logging concerns:** INFO logging only; no request/PII logging observed. [VERIFIED]
- **Third-party data sharing:** Only the OAuth `session_id`→Emergent exchange. [VERIFIED]
- **Concern to flag (not fix here):** session rows never expire-cleaned; expired tokens are
  rejected at read time but persist in DB.

---

# 27. PERFORMANCE AND RELIABILITY

- **Dashboard/agenda are multi-query aggregations** run per request (10+ Mongo calls each) with no
  caching and no indexes — fine at MVP scale, a future hotspot. [VERIFIED]
- **`to_list()` caps** are generous (e.g., 2000–5000 txns) — memory-bounded but not paginated.
- **Reliability safeguards present:** idempotent finalize; app-wide FE try/catch + toasts;
  disabled-while-submitting buttons; auth race recovery.
- **No retries/timeouts** on the one external call except `httpx.AsyncClient(timeout=10)` in `auth_session`. [VERIFIED]
- **Concurrency:** income auto-carry on read is not transactionally guarded — two concurrent reads
  of a fresh month could double-seed. [SUSPECTED]
- **No AI latency/cost considerations** (no AI).

---

# 28. OBSERVABILITY AND DEBUGGING

- **Logging:** `logging.basicConfig(INFO)` in `server.py`; module logger. No structured logs.
- **Error reporting/telemetry/analytics:** None. [VERIFIED]
- **Frontend errors:** surfaced as Sonner toasts via `explainError`; dev overlay suppressed by hardening.
- **Debugging procedures developed:** check `/var/log/supervisor/backend.*.log` for startup import
  errors; use the demo Bearer token to curl endpoints; run pytest against the live preview URL;
  roll demo data forward when the demo-has-data test fails.
- **Request tracing:** none. **Model-call logging:** N/A.

---

# 29. PARTIALLY IMPLEMENTED / INACCESSIBLE FEATURES

- **`RuleOfLife.jsx`** — fully written, **not routed/imported** (superseded by Household Order). [VERIFIED]
- **`challenges.member_progress`** — computed server-side, never rendered (dormant since v0.14). [VERIFIED]
- **Byzantine calendar** — selectable in Onboarding/Settings, but backend renders it as Roman
  (label-only). Partially implemented by design. [VERIFIED]
- **`prayer_logs.member_id`** — accepted but unused semantically (legacy path). [VERIFIED]
- **`index.html` branding** — placeholder default, unfinished polish. [VERIFIED]
- **Backlog-only (not started in code):** AI module, PWA push, recurring events/chore rota, saint
  biographies, Stripe, native/Capacitor, full Byzantine engine, multi-user households. [HISTORICAL]

---

# 30. DISCUSSED BUT UNIMPLEMENTED IDEAS

From PRD backlog [HISTORICAL] — preserved, not recommended:
- **Family Crest** — symbolic visual identity layer (P1). *Note:* a `components/Crest.jsx` monogram
  exists, but the richer "family crest" concept is unbuilt.
- **AI module (Claude Sonnet 4.5):** mission-statement coach, Council agenda enrichment, formation prompts (P1).
- **PWA push notifications** for Angelus/Compline/Council day (P1).
- **Recurring events + chore rota** (P1).
- **Saint database with biographical pages** (P1).
- **1962 rubric enhancements:** Holy Family Sunday, Octave of Epiphany commemorations, privileged-Sunday rubric (P1).
- **"Liturgical Year Wrap"** printable annual report (P2).
- **Stripe paid plan** (P2). **Native mobile (Capacitor)** (P2). **Full Byzantine engine** (P2).
  **Multi-user shared households** (P2).

The immediate "next" per handoff were: Family Crest concept, deeper Charter↔Council review loop,
then AI/PWA/calendar enhancements.

---

# 31. DEPENDENCIES

### Backend (notable) — `requirements.txt` [VERIFIED]
- `fastapi==0.110.1`, `uvicorn==0.25.0` — web server (used).
- `motor==3.3.1`, `pymongo==4.5.0` — async Mongo (used everywhere).
- `pydantic>=2.6.4` — models/validation (used; v2 API `model_dump`).
- `python-dateutil>=2.9.0` — cadence/anniversary math (used in `rhythms.py`, `sacred_heart.py`).
- `httpx==0.28.1` — OAuth session exchange (used in `auth.py`).
- `python-dotenv` — env loading (used).
- **`emergentintegrations==0.1.0` — UNUSED** (legacy/planned AI).
- Likely-unused-at-runtime tooling/libs present in requirements: `boto3`, `requests-oauthlib`,
  `cryptography`, `pyjwt`, `bcrypt`, `passlib`, `python-jose`, `pandas`, `numpy`, `jq`, `typer`,
  `black/isort/flake8/mypy`. [SUSPECTED unused by app code — grep shows no imports of most]. Keep
  unless a deliberate cleanup with testing is done.

### Frontend (notable) — `package.json` [VERIFIED]
- `react@^19`, `react-dom@^19`, `react-router-dom@^7.5.1` — core.
- `axios@^1.8.4` — API client. `sonner@^2.0.3` — toasts. `lucide-react` — icons.
- Large `@radix-ui/*` set + `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn UI.
- `recharts`, `embla-carousel-react`, `vaul`, `cmdk`, `react-hook-form`, `zod`, `date-fns`,
  `next-themes`, `input-otp`, `react-day-picker` — shadcn ecosystem; **many likely unused by
  current pages** (the app uses hand-rolled inputs more than shadcn form primitives). [SUSPECTED]
- Build: `@craco/craco`, `tailwindcss@^3.4.17`, `@emergentbase/visual-edits` (platform).
- Package manager: **yarn** (pinned). Use `yarn add`, never npm.

---

# 32. WHAT IS FRAGILE

- **Auth flow (`AuthCallback.jsx`, `App.js`, `auth.jsx`):** intentional dedupe/race logic; small
  changes can reintroduce the redirect loop. Comments explicitly warn "DO NOT HARDCODE THE URL...".
- **`liturgical.py`:** dense date math (computus, 1962 resumed-Epiphany rubric, season labels).
  Off-by-one changes ripple across every date. Well-tested — lean on the tests.
- **Council finalize idempotency:** the dedup-by-id-or-title + backfill logic is subtle; regressions
  reappear as duplicate tasks.
- **Dashboard philosophy locks:** removing/renaming fields can break the `test_dashboard_shape`
  "absence" assertions — and, more importantly, violate product intent.
- **Budget auto-carry:** read-path writes; concurrency-unsafe; changing it can double- or lose-carry income.
- **Charter option constants shared across pages** (`CharterCard.jsx`): `Onboarding` and `Council`
  import `RULE_OPTIONS`/`PEACE_OPTIONS` for labeling — renaming a value key silently breaks labels.
- **Stringly-typed dates:** everything is ISO/`YYYY-MM-DD` strings; comparisons rely on lexical
  ordering. Introducing timezones or `datetime` objects here would break comparisons.

---

# 33. WHAT IS WORKING WELL

- **Modular backend + `deps.py`** — clean, navigable, consistent household-scoping. Don't rewrite.
- **Liturgical engine** — comprehensive, well-tested, offline, no external dependency.
- **App-wide error hardening (`explainError`)** — genuinely eliminated the runtime-overlay class of bugs.
- **Idempotent operations** (finalize, seed-defaults) — reliable and re-runnable.
- **Design system discipline** — `design_guidelines.json` + Tailwind CSS vars + Panel/Crest give a
  coherent editorial aesthetic; `data-testid` coverage is thorough and aids testing.
- **Anti-gamification product identity** — clear, differentiated, and consistently enforced.
- **Additive, migration-free schema evolution** — Optional fields + defensive consumers meant new
  features never broke existing households.

---

# 34. SOURCE-OF-TRUTH MAP

| Concern | Source of truth |
|---|---|
| Product philosophy / roadmap / history | `/app/memory/PRD.md` |
| Test credentials / demo session | `/app/memory/test_credentials.md` |
| Business rules (server) | `backend/routers/*.py` (+ `deps.py` for auth/household scoping) |
| Liturgical logic + feast tables | `backend/liturgical.py` |
| Challenge templates | `backend/challenges.py` |
| DB schema (implicit) | field usage in `backend/routers/*.py` + `deps.py` models (no migrations dir) |
| API surface | `backend/server.py` (router mounting) + each router's decorators |
| Frontend routes/guards | `frontend/src/App.js` |
| Auth (client) | `frontend/src/lib/auth.jsx`, `pages/AuthCallback.jsx`, `pages/Landing.jsx` |
| Charter constants + draft template | `frontend/src/components/CharterCard.jsx` |
| Design tokens / aesthetic | `/app/design_guidelines.json` + `tailwind.config.js` + `src/index.css` |
| Error message mapping | `frontend/src/lib/errors.js` |
| Env var names | `backend/.env`, `frontend/.env` (names only) |
| Test behavior/coverage | `backend/tests/*.py`, `backend/tests/conftest.py` |

---

# 35. HISTORICAL CONTEXT VS CURRENT REALITY

| Topic | Historical behavior | Current verified behavior | Relevant files |
|---|---|---|---|
| Prayer tracking | Per-member × per-prayer matrix with counts | Household-level rhythm; `member_id` optional/unused | `pages/PrayerTracker.jsx`, `routers/prayer.py` |
| Household scoring | Composite "Household Health Score" + weekly_score | Removed; test asserts absence | `routers/dashboard.py`, `test_patria_modules.py` |
| Goals | Dashboard showed avg-progress % | Removed; per-goal bars only | `routers/dashboard.py`, `pages/MissionGoals.jsx` |
| Prayer framing | "6 day streak", week_count | "Prayer rhythm · X/7", `days_with_prayer_last_7` | `pages/Dashboard.jsx`, `routers/dashboard.py` |
| Challenges | Per-member leaderboard counts | Communal participation; `member_progress` computed but hidden | `pages/Challenges.jsx`, `routers/challenges.py` |
| Onboarding | 3 screens → later 2 | 8-step charter builder | `pages/Onboarding.jsx` |
| Charter | One-shot final onboarding screen | Permanent `/charter` page + Council seam | `pages/Charter.jsx`, `pages/Council.jsx`, `CharterCard.jsx` |
| "Today" page | Existed (`Today.jsx`) | Deleted; `/today`→`/dashboard` | `App.js` |
| Rule of Life page | Primary rules UI | `HouseholdOrder.jsx`; `RuleOfLife.jsx` unused | `pages/HouseholdOrder.jsx`, `pages/RuleOfLife.jsx` |
| `server.py` | ~1,650-line monolith | ~60 lines; routers extracted | `server.py`, `routers/` |
| AI | Planned (Claude) | None implemented; `emergentintegrations` unused | `requirements.txt` |
| Backend test count | PRD says "170 passing" | ~152 `def test_` counted statically | `backend/tests/` |

---

# 36. OPEN QUESTIONS

1. **Exact passing test count.** Static count = ~152 `def test_`; PRD says 170. *Unclear* whether
   the gap is parametrization or drift. *Verify:* run `pytest -q` in `backend/` against a live backend + demo data.
2. **Are the many heavy Python deps (pandas/numpy/boto3/jose/passlib/bcrypt) actually used?** grep
   shows no app imports. *Verify:* `grep -r` imports; but do not remove without a controlled test pass.
3. **Is the demo household seeded in the *deployed* DB** or only locally? No seed script in repo.
   *Verify:* query production Mongo for `hh_demo_patria` (needs deployer/prod access).
4. **Does the byzantine option cause user confusion in production** (renders as Roman)? Product
   decision needed. *Checked:* `liturgical.py` coercion.
5. **Concurrency safety of income auto-carry** under real multi-tab use. *Verify:* load test the
   `/budget/income-sources` GET on a fresh month.
6. **Intended behavior when a spouse tries to log in** with their own Google account. *Checked:*
   no invite/link flow exists; likely creates a second empty household. Needs product confirmation.

---

# 37. HANDOFF CHECKLIST

**Run the app**
- Ensure Mongo is up and `backend/.env` (`MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`) + `frontend/.env`
  (`REACT_APP_BACKEND_URL`) are set (names only; never hardcode values).
- Backend + frontend are supervisor-managed with hot reload. Restart only after `.env`/dependency
  changes: `sudo supervisorctl restart backend` / `frontend`.

**Build**
- Frontend: `yarn install`, then `yarn build` (CRACO). Backend: `pip install -r requirements.txt`.

**Tests**
- Backend: from `/app/backend`, `pytest -q` (tests hit `REACT_APP_BACKEND_URL`; backend must be
  running and the demo session seeded). Roll demo prayer_logs forward if `test_dashboard_demo_has_data` fails.
- Auth in tests: use Bearer `demo_session_patria` (see `/app/memory/test_credentials.md`).

**Dev mode / login**
- Do **not** manually Google-sign-in for testing. Use the demo session cookie/Bearer.

**Read first (in order)**
1. `/app/memory/PRD.md` (history + philosophy)
2. `backend/deps.py` (auth + household scoping + models)
3. `backend/server.py` (router map)
4. `frontend/src/App.js` (routes/guards) + `frontend/src/lib/auth.jsx` + `pages/AuthCallback.jsx`
5. `backend/routers/council.py` and `backend/routers/dashboard.py` (the two richest domains)
6. `backend/liturgical.py` (only when touching calendar logic)
7. `frontend/src/components/CharterCard.jsx` (shared constants used by 3 pages)

**Understand these decisions first**
- Anti-gamification law (§10). UUID+`{"_id":0}` data pattern (§8/§18). Idempotent finalize (§10).
  Auth race workarounds (§20). Additive/Optional schema evolution (§18).

**Do NOT change before understanding consequences**
- Auth callback/guards; liturgical date math; council finalize dedup; dashboard field shape (tests
  + philosophy); budget auto-carry; `CharterCard` option value keys; `.env` protected keys;
  `Landing.jsx`/`AuthCallback.jsx` hardcoded OAuth URL rules.

---

# Advice to the Next AI Agent

Read `/app/memory/PRD.md` before touching anything — this project's identity was forged through
deliberate *removals*, and its most important rule is invisible in the code: **Patria never grades
the family.** If you see "missing" scores, streaks, averages, or leaderboards, that is not an
oversight to fix — it is the product. Test locks in `test_patria_modules.py` guard this on purpose.

Verify independently: (1) the real `pytest` pass count (static count ≈152 vs PRD's 170), (2)
whether the demo household exists in the deployed DB (no seed script is committed), and (3) whether
the heavy Python dependencies are actually used (they appear not to be). Confirm before acting.

Things that look strange but are intentional: the UUID-string + `{"_id":0}` data convention (no
ODM); the "byzantine" calendar rendering as Roman (label-only MVP scope); `challenges.member_progress`
computed but never shown; `emergentintegrations` present but unused. Don't "modernize" the data
layer or reintroduce AI without an explicit request and a migration/test plan.

Areas that may genuinely deserve reconsideration (but only after the audit): missing Mongo indexes
and unbounded `user_sessions` growth; the read-path-that-writes in budget income auto-carry; the
default `index.html` branding; and the single-user-per-household constraint if multi-user is ever prioritized.

Do not casually refactor: the auth callback race logic, the liturgical engine, council finalize
idempotency, or the shared `CharterCard` option keys. Each is subtle and each caused (or prevents)
a real, previously-reported bug. The tests are your safety net for the backend — run them.

The user cares most about: calm tone and copy, the Family Council as the emotional center, the
Charter as the household's identity artifact, and *never* turning the home into a scoreboard.
Where project history matters most is the v0.9–v0.14 subtraction arc and the v0.15–v0.17 charter
seam — study those before proposing new surfaces.

Do not recommend a redesign yet. Audit first.

---

# Fast Start for a New Agent

**What it is.** Patria — a calm, editorial "operating system for intentional Catholic family life."
React 19 SPA + FastAPI + MongoDB. Emergent Google OAuth. **No AI.** Core law: *never grade the family*.

**Architecture.** Browser → ingress → FastAPI `/api` (14 routers) → MongoDB (UUID string keys,
`{"_id":0}` projections, ISO-string dates). Liturgical logic is pure Python. Auth = cookie
`session_token` + Bearer fallback, 7-day sessions.

**Most important files.**
1. `backend/deps.py` (auth, household scoping, models)
2. `backend/server.py` (router map)
3. `backend/routers/council.py` (idempotent finalize; agenda)
4. `backend/routers/dashboard.py` (aggregator; philosophy locks)
5. `backend/liturgical.py` (calendar engine)
6. `frontend/src/App.js` (routes/guards)
7. `frontend/src/pages/AuthCallback.jsx` + `lib/auth.jsx` (auth race handling)
8. `frontend/src/pages/Onboarding.jsx` + `components/CharterCard.jsx` (charter)
9. `frontend/src/lib/errors.js` (`explainError`)
10. `/app/memory/PRD.md` + `/app/memory/test_credentials.md`

**Most important product/business rules.**
- No scores/streaks/leaderboards/KPIs (test-locked).
- Household created once at onboarding step 2→3; charter is additive/Optional.
- Council finalize is idempotent (dedup by assignment_id or title + backfill).
- Prayer is household-level (`days_with_prayer_last_7`), not per-member.
- Budget recurring income auto-carries forward (and a GET can write rows).
- Liturgical `variant` coerces to Roman unless `roman`/`traditional`.
- Cannot delete your own linked member.

**Most important historical decisions.** Anti-gamification subtraction arc (v0.9–v0.14); charter
+ Council seam (v0.15–v0.17); router modularization (v0.5); UUID/no-ODM data pattern; deterministic
(not AI) charter draft.

**Most fragile areas.** Auth callback/guards; `liturgical.py` date math; council finalize dedup;
dashboard field shape; budget auto-carry; shared `CharterCard` option keys; stringly-typed dates.

**Workflows to verify first.** Login→onboarding→charter→first council event; weekly Council
begin→edit→finalize→tasks (twice, to confirm no duplicates); prayer log/unlog + 7-day aggregate;
budget month setup with recurring carry-forward; liturgical today for Roman vs 1962.

**Biggest unresolved questions.** Real pytest pass count (≈152 vs 170); is the demo seeded in prod
(no seed script committed); are heavy deps actually used; intended spouse-login behavior.
