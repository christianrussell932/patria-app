# DEVELOPMENT HISTORY — Patria (Catholic Household OS)

> **Read-only historical reconstruction.** No application code was modified. Built from the sources
> catalogued in `HISTORY_SOURCE_INVENTORY.md`, in the priority order requested: git diffs →
> historical PRD.md → historical source files → JUnit XML → iteration_*.json → auth_testing.md →
> current code → fork summary (only where noted).
>
> **Git commit order is authoritative for relative chronology.** See §11 for the date-system warning.
>
> **Evidence labels (used consistently):**
> `[VERIFIED-GIT]` diff/commit · `[VERIFIED-CODE]` current source · `[VERIFIED-TEST]` stored JUnit
> XML · `[VERIFIED-QA]` iteration_*.json · `[PRD-CLAIM]` PRD prose only · `[HISTORICAL-SUMMARY]`
> fork handoff · `[INFERRED]` reasoned, not proven · `[UNKNOWN]` unrecoverable.
> `[INFERRED]` and `[PRD-CLAIM]` are **not** presented as verified fact.

### Canonical commit map (git-authoritative ordering)
| Commit | Git date/time (UTC) | Landmark | PRD ver added |
|--------|--------------------|----------|---------------|
| `26896ea` | 2026-04-30 09:45 | Initial (pre-code) | — |
| `6140210` | 2026-05-06 18:52 | Scaffold: base image + shadcn UI (75 files) | — |
| `b3ba2bf` | 2026-05-06 19:04 | First real app: `server.py` 680L, `Today.jsx`, `RuleOfLife.jsx`, per-member `PrayerTracker`, `Onboarding` 238L | — |
| `6012893` | 2026-05-06 19:11 | `iteration_2.json` | — |
| `ae7c6f3` | 2026-05-06 19:13 | `PRD.md` created (59L) | (problem stmt) |
| `e22e344` | 2026-05-06 21:01 | `server.py` +576L; **`weekly_score`, `avg_progress`, `streak_days` BORN** | — |
| `d5770f4` | 2026-05-06 21:03 | PRD | v0.2 |
| `2bd14a3` | 2026-05-11 19:40 | v0.3 work | — |
| `d74a4ad` | 2026-05-11 19:42 | PRD (retro-writes v0.1–v0.3) | v0.1,0.2,0.3 |
| `2113f78` | 2026-05-12 16:33 | `server.py` **peak 1630L (monolith)** | — |
| `d03585c` | 2026-05-12 16:35 | PRD | v0.4 |
| `2873d4f` | 2026-05-12 16:45 | — | — |
| `ec70ed2` | 2026-05-12 17:07 | **`backend/routers/` first appears** (modularization begins) | — |
| `719e317` | 2026-05-12 17:09 | PRD | v0.5 |
| `9c4cb11` | 2026-05-12 17:52 | **`server.py` → 60L (split complete)** | v0.6 |
| `5a40a8a` | 2026-05-12 18:09 | — | — |
| `998c2e4` | 2026-05-12 18:25 | PRD | v0.7 |
| `feaa520`,`177b675` | 2026-05-12 18:36–18:42 | budget work | — |
| `71d3e54` | 2026-05-12 18:52 | `Onboarding` 248L | — |
| `4e6d0be`,`715236f` | 2026-05-12 18:59–19:50 | — | — |
| `43c4fb0`…`f7b50fa` | 2026-05-13 12:46–15:56 | v0.8 hardening arc | — |
| `860bb19` | 2026-05-13 15:58 | PRD | v0.8 |
| `8c8cf22` | 2026-05-13 19:05 | **`Today.jsx` DELETED** | — |
| `e9f7cba` | 2026-05-14 15:43 | **`weekly_score` REMOVED** | v0.9 |
| `0aacc42` | 2026-05-14 16:05 | **`avg_progress` REMOVED** | v0.10 |
| `539ddc7` | 2026-05-14 16:20 | **PrayerTracker matrix → household** | v0.11 |
| `e49f471` | 2026-05-14 16:28 | **`days_with_prayer_last_7` BORN** | v0.12 |
| `7975250` | 2026-05-14 21:53 | **`has_held_first_council` BORN** | v0.13 |
| `1a16967` | 2026-05-14 22:24 | **`streak_days` REMOVED (final)** | v0.14 |
| `0409806` | 2026-05-22 23:48 | **`/household/first-charter` BORN; `Onboarding` → 664L (8-step)** | v0.15 |
| `3614950` | 2026-05-22 23:48 | **DANGLING — identical tree to `0409806`** (see §8) | (v0.15) |
| `4406ba3` | 2026-05-23 19:56 | `/charter` page; `CharterCard` extracted | v0.16 |
| `b05181f` | 2026-05-23 22:38 | Charter↔Council seam; `Onboarding` refined → 571L | v0.17 |
| `a914685` | 2026-09-28 17:38 | Handoff dossier (my prior turn) | — |

---

## 1. EXECUTIVE TIMELINE

### Phase 0 — Scaffold (`26896ea`→`6140210`, 30 Apr–06 May) `[VERIFIED-GIT]`
- Empty initial commit, then the standard Emergent base-image scaffold: FastAPI + React + Mongo +
  shadcn UI (75 files, ~4,640 insertions), plus `design_guidelines.json` and `auth_testing.md`.
- No product yet. **Still present today:** the shadcn `components/ui/*` and config all remain.

### Phase 1 — "Domus" foundation → Patria restructure (`b3ba2bf`→`e22e344`, 06 May) `[VERIFIED-GIT]` `[VERIFIED-QA]`
- First real backend (`server.py` 680L) + pages: `Landing`, `Onboarding` (238L), `Calendar`,
  `PrayerTracker` (per-member matrix), `Household`, `RuleOfLife`, `Settings`, **`Today.jsx`**,
  `AuthCallback`, `Challenges`. Liturgical engine + challenge templates introduced.
- `e22e344` expanded `server.py` (+576L) and **introduced the composite metrics** `weekly_score`,
  `avg_progress`, `streak_days` in the dashboard.
- QA: `iteration_1.json` (34 backend tests) + `iteration_2.json` (Playwright e2e of a 3-step
  onboarding, per-member prayer matrix, 7-pillar Rule of Life). `[VERIFIED-QA]`
- Tests: `pytest_results.xml` 34 tests, 0 fail, 2026-05-06 19:03. `[VERIFIED-TEST]`
- **Still present today?** Partially. Backend endpoints largely persisted; `Today.jsx`,
  `RuleOfLife.jsx` (as active), the per-member matrix, and the composite metrics were **all later
  removed/superseded** (see §5).

### Phase 2 — Patria IA + Budget/Schedule/Mission (`2bd14a3`→`2113f78`, 11–12 May) `[VERIFIED-GIT]` `[PRD-CLAIM v0.2/0.3/0.4]`
- New information architecture, Dashboard, Budget, Mission, Schedule, expanded Members; Family
  Council, Sacred Heart, Rhythms, liturgical engine v2, Crest motif (PRD v0.2–v0.4).
- Architecture: `server.py` grew to its **1630L monolith peak** at `2113f78`.
- QA: `iteration_3.json` (68/68), `iteration_4.json` (93/93). `[VERIFIED-QA]`
- Tests: `full_results.xml` 93 (05-11 19:38); `v3_results.xml` 25; `v4_full_results.xml` 104 (05-12 16:29). `[VERIFIED-TEST]`
- **Still present today?** Yes — these modules are the current product's backbone.

### Phase 3 — Modularization + correctness (`ec70ed2`→`9c4cb11`, 12 May) `[VERIFIED-GIT]` `[VERIFIED-TEST]`
- **`server.py` 1630L → 60L**; all domains extracted into `backend/routers/` + shared `deps.py`.
  Idempotent council finalize; `dateutil.relativedelta` cadence math; 1962 Epiphany rubric (PRD v0.5).
- Tests: `v5_results.xml` 119 (05-12 17:05) + `v5_public_results.xml` 24 (05-12 17:07). `[VERIFIED-TEST]`
- QA: `iteration_6.json` (119 local + 24 public). `[VERIFIED-QA]`
- **Still present today?** Yes — the current backend structure is exactly this.
- **⚠ This is the LAST phase with stored JUnit evidence.** Everything after is `[PRD-CLAIM]`/`[VERIFIED-QA]`-only for counts.

### Phase 4 — Optional memorials + Budget expansion (`5a40a8a`→`71d3e54`, 12 May) `[VERIFIED-GIT]` `[PRD-CLAIM v0.6/0.7]`
- `optional_memorials[]` on liturgical responses (~130 modern saints); budget groups,
  `seed-defaults`, income sources w/ recurring carry-forward, financial goals, `Budget.jsx` split into panels.
- Tests: **no JUnit XML** for these. PRD claims 150/150 (v0.6) and 167/167 (v0.7). `[PRD-CLAIM]`
- **Still present today?** Yes `[VERIFIED-CODE]` (`liturgical.py`, `routers/budget.py`, `pages/budget/*`).

### Phase 5 — Frontend resilience (`43c4fb0`→`8c8cf22`, 13 May) `[VERIFIED-GIT]` `[VERIFIED-QA]`
- `lib/errors.js::explainError`; app-wide axios try/catch + Sonner toasts (PRD v0.8).
- QA: `iteration_7.json` — forced-error matrix across 7 pages incl. `Today.jsx`. `[VERIFIED-QA]`
- **`Today.jsx` DELETED at `8c8cf22` (05-13 19:05)** `[VERIFIED-GIT]` — ~3h *after* PRD v0.8
  (written `860bb19`, 15:58) stated it was "kept as-is pending a product decision." (Discrepancy noted §5/§10.)
- **Still present today?** The error hardening: yes `[VERIFIED-CODE]`. `Today.jsx`: gone.

### Phase 6 — The "subtraction arc" (`e9f7cba`→`1a16967`, 14 May) `[VERIFIED-GIT]`
- The product's defining removals, one per step:
  - `e9f7cba` **`weekly_score` removed** (v0.9).
  - `0aacc42` **`avg_progress` removed** (v0.10).
  - `539ddc7` **per-member prayer matrix → household rhythm** (v0.11).
  - `e49f471` **`days_with_prayer_last_7` added** (v0.12).
  - `7975250` **`has_held_first_council` added** (v0.13, first-run states).
  - `1a16967` **`streak_days` removed (final)** (v0.14).
- Tests: no JUnit XML; PRD claims 167→168 across these. `[PRD-CLAIM]`
- **Still present today?** Yes — removals confirmed stuck: current `dashboard.py` has **0**
  occurrences of `weekly_score`/`avg_progress`/`streak_days`/`week_count`. `[VERIFIED-CODE]`

### Phase 7 — Charter net-addition (`0409806`→`b05181f`, 22–23 May) `[VERIFIED-GIT]` `[PRD-CLAIM v0.15–0.17]`
- `0409806` **`POST /household/first-charter`** + `Onboarding` expanded to **664L (8-step charter)** (v0.15).
- `4406ba3` `/charter` page; `CharterCard.jsx` extracted; `Onboarding` refactored to import it (v0.16).
- `b05181f` Charter↔Council reference seam; `Onboarding` settles at **571L** (v0.17). **Last dev commit.**
- Tests: no JUnit XML; PRD claims 170/170 (v0.15). `[PRD-CLAIM]`
- **Still present today?** Yes `[VERIFIED-CODE]` (`Onboarding.jsx`, `Charter.jsx`, `CharterCard.jsx`, `routers/household.py`).

---

## 2. FEATURE EVOLUTION

### Authentication (Emergent Google OAuth)
- First appeared `b3ba2bf` (06 May). StrictMode dedupe + `/auth/me` recovery present in current
  `AuthCallback.jsx`. `auth_testing.md` (06 May) documents the intended pattern (cookie-first,
  `{"_id":0}`, `useRef` dedupe). `[VERIFIED-GIT]` `[VERIFIED-CODE]`
- Current status: **present, unchanged in shape.** Rationale for the race-recovery code is
  documented in code comments (a real redirect loop). `[VERIFIED-CODE]`

### Onboarding (major shape changes)
- `b3ba2bf`: 238L. `71d3e54`: 248L (PRD says collapsed 3→2 screens in v0.13). `0409806`: **664L,
  8-step charter builder** (v0.15). `b05181f`: 571L after extracting `CharterCard` (v0.16/17).
  `[VERIFIED-GIT]`
- Renamed/merged: patron-saint & tile-color steps **removed** and deferred to Members (PRD v0.13). `[PRD-CLAIM]`
- Current status: **8-step charter flow.** `[VERIFIED-CODE]`

### Prayer tracking (matrix → household)
- `b3ba2bf`: per-member × per-prayer matrix; `log(member_id, prayer_type)`. `[VERIFIED-GIT]`
- `539ddc7` (v0.11): rewritten to household-level `PRAYER_RHYTHMS` + `markPrayed(prayer_type)`
  (no member_id); diff shows removal of `members` state and `api.get("/household/me")`. `[VERIFIED-GIT]`
- Backend: `PrayerLogCreate.member_id` relaxed to Optional (kept for legacy). `[VERIFIED-CODE]`
- Current status: **household-level rhythm.** `member_id` accepted but unused. `[VERIFIED-CODE]`

### Dashboard metrics (composite → calm)
- `e22e344`: `weekly_score` + `avg_progress` + `streak_days` all present. `[VERIFIED-GIT]`
- Removed across `e9f7cba`/`0aacc42`/`e49f471`/`1a16967`; replaced by single
  `days_with_prayer_last_7` + `council.has_held_first_council`. `[VERIFIED-GIT]`
- Current status: **no composite metrics** (0 in current `dashboard.py`). `[VERIFIED-CODE]`

### Family Council
- Introduced PRD v0.3 (Phase 2). Idempotent finalize added in v0.5 (`9c4cb11`). Charter reference
  card added v0.17 (`b05181f`). `[VERIFIED-GIT]` `[VERIFIED-CODE]`
- Current status: present with idempotent finalize + charter seam. `[VERIFIED-CODE]`

### Charter (First Rule of the Home)
- Born v0.15 (`0409806`) as onboarding step 8 + `first-charter` endpoint. Extracted to reusable
  `CharterCard.jsx` and a permanent `/charter` route in v0.16 (`4406ba3`). `[VERIFIED-GIT]`
- Current status: present, permanent + printable. `[VERIFIED-CODE]`

### Budget & Stewardship
- Basic categories/transactions/savings early (Phase 2). Expanded v0.7 (`998c2e4`): groups,
  `seed-defaults`, income sources w/ recurring carry-forward, financial goals (legacy savings
  read-through), `Budget.jsx` split into `budget/*` panels. `[VERIFIED-GIT]` `[VERIFIED-CODE]`

### Challenges / Seasons
- Introduced `b3ba2bf` (templates in `challenges.py`). v0.14 removed the per-member leaderboard
  count from the UI; backend `member_progress` still computed. `[VERIFIED-GIT]` `[PRD-CLAIM]` `[VERIFIED-CODE]`

### Rule of Life → Household Order
- `RuleOfLife.jsx` created `b3ba2bf`; superseded by `HouseholdOrder.jsx`. `RuleOfLife.jsx` **still
  exists on disk but is not imported**; route `/rule` redirects to `/order`. `[VERIFIED-CODE]`

### Removed/superseded features → see §5.

---

## 3. ARCHITECTURE EVOLUTION

- **Backend structure:** `server.py` 680L (`b3ba2bf`) → **1630L monolith** (`2113f78`) →
  **60L + `routers/` + `deps.py`** (`ec70ed2`→`9c4cb11`, v0.5). Current: 14 routers mounted under
  `/api`. `[VERIFIED-GIT]` `[VERIFIED-CODE]`
- **Frontend structure:** pages added incrementally from `b3ba2bf`; `budget/` sub-panels in v0.7;
  shared `CharterCard.jsx` in v0.16. `AppShell` sidebar present since Phase 1. `[VERIFIED-GIT]`
- **Routers:** first appeared `ec70ed2` (05-12 17:07). `[VERIFIED-GIT]`
- **Data model:** UUID string keys + `{"_id":0}` projection convention present from `b3ba2bf` and
  documented in `auth_testing.md` checklist. Charter fields added to `households` in v0.15 (all
  Optional, no migration). `[VERIFIED-GIT]` `[VERIFIED-CODE]`
- **Authentication:** cookie + Bearer dual auth from the start; unchanged in shape. `[VERIFIED-CODE]`
- **State handling (FE):** local `useState` + `AuthContext`; no global store — unchanged across
  history. `[VERIFIED-CODE]`
- **APIs:** grew additively; the `council` event type was appended to the schedule allowlist in
  v0.15 to support the first-council event. `[VERIFIED-CODE]`
- **External integrations:** only Emergent OAuth throughout. `emergentintegrations` has been in
  `requirements.txt` since `b3ba2bf` but is **never imported** — i.e. AI was scaffolded-for but
  never wired, across the entire history. `[VERIFIED-GIT]` `[VERIFIED-CODE]`
- **Testing architecture:** pytest suites hitting the live URL via Bearer; `conftest.py` seeded
  session from `b3ba2bf`. Suites grew per phase (`test_patria_v3..v7`). `[VERIFIED-GIT]`
- **Deployment/config:** base image `...release-04052026-2` (`.emergent/emergent.yml`); env-driven
  (`MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`). Webhook-cron infra present but
  no app crons configured. `[VERIFIED-CODE]`

---

## 4. BUSINESS LOGIC EVOLUTION

| Rule | Previous behavior | New behavior | Evidence | Current uses later behavior? |
|------|-------------------|--------------|----------|------------------------------|
| Household scoring | `weekly_score` = mean of rule/prayer/task/budget % | Removed entirely | `e22e344` add → `e9f7cba` remove `[VERIFIED-GIT]` | **Yes** — 0 in code `[VERIFIED-CODE]` |
| Goal aggregate | `goals.avg_progress` mean | Removed; per-goal bars only | `e22e344` → `0aacc42` `[VERIFIED-GIT]` | **Yes** `[VERIFIED-CODE]` |
| Prayer signal | per-member counts + `streak_days`/`week_count` | household `days_with_prayer_last_7` | `539ddc7`,`e49f471`,`1a16967` `[VERIFIED-GIT]` | **Yes** `[VERIFIED-CODE]` |
| Prayer logging | required `member_id` | `member_id` Optional (household act) | `539ddc7` `[VERIFIED-GIT]` | **Yes** `[VERIFIED-CODE]` |
| Onboarding | 3→2 screens; asked patron/colors | 8-step charter; patron/colors deferred | `71d3e54`→`0409806` `[VERIFIED-GIT]`/`[PRD-CLAIM]` | **Yes** `[VERIFIED-CODE]` |
| Council first-run | steady-state copy only | `has_held_first_council` toggles first-run panel | `7975250` `[VERIFIED-GIT]` | **Yes** `[VERIFIED-CODE]` |
| Charter | none | `first-charter` persists + creates `council` event | `0409806` `[VERIFIED-GIT]` | **Yes** `[VERIFIED-CODE]` |
| Council finalize | (early) risk of duplicate tasks | idempotent diff by assignment_id/title | v0.5 `9c4cb11` `[VERIFIED-GIT]` | **Yes** `[VERIFIED-CODE]` |
| Income carry | none | recurring auto-carry-forward on read | v0.7 `998c2e4` `[VERIFIED-GIT]` | **Yes** `[VERIFIED-CODE]` |
| Member permission | — | cannot delete own linked member | present current | `[VERIFIED-CODE]` |
| Spouse/member | member record only (no separate login) | unchanged | — | `[VERIFIED-CODE]` (no invite flow ever added) |
| Liturgical variant | roman/traditional; byzantine label-only | unchanged | — | `[VERIFIED-CODE]` |

Rationale for *why* each was removed is recorded in PRD prose (anti-gamification) `[PRD-CLAIM]`;
git proves *what/when* `[VERIFIED-GIT]`. See §10 for gaps.

---

## 5. REMOVED AND ABANDONED IMPLEMENTATIONS

### `Today.jsx`
- **Existed:** `b3ba2bf` (06 May) → deleted `8c8cf22` (13 May 19:05). `[VERIFIED-GIT]`
- **Evidence:** recoverable via `git show b3ba2bf:frontend/src/pages/Today.jsx`.
- **Replaced by:** `/today` route redirects to `/dashboard` (current `App.js`). `[VERIFIED-CODE]`
- **Remnants:** none in working tree; only the redirect. Note: `iteration_7.json` still lists it
  (hardened in v0.8), and PRD v0.8 said it was "kept as-is" — both **predate** the actual deletion
  by hours. `[VERIFIED-QA]`/`[PRD-CLAIM]` vs `[VERIFIED-GIT]`.

### `weekly_score` (Household Health composite)
- **Existed:** `e22e344` (06 May) → removed `e9f7cba` (14 May). `[VERIFIED-GIT]`
- **Replaced by:** nothing (deliberate). Current `dashboard.py`: 0 occurrences. `[VERIFIED-CODE]`
- **Remnants:** none.

### `goals.avg_progress`
- **Existed:** `e22e344` → removed `0aacc42` (14 May). Replaced by per-goal bars only. Remnants: none. `[VERIFIED-GIT]` `[VERIFIED-CODE]`

### Per-member prayer matrix
- **Existed:** `b3ba2bf` → rewritten `539ddc7` (14 May). Replaced by household `PRAYER_RHYTHMS`.
  **Remnant:** `prayer_logs.member_id` still accepted (Optional). `[VERIFIED-GIT]` `[VERIFIED-CODE]`

### `streak_days` / `week_count`
- **Existed:** `e22e344` → removed by `1a16967` (14 May, v0.14). Replaced by `days_with_prayer_last_7`.
  Remnants: none in `dashboard.py`. `[VERIFIED-GIT]` `[VERIFIED-CODE]`

### Challenge per-member leaderboard count
- **Existed:** since `b3ba2bf` UI → removed from UI v0.14. **Remnant:** backend still computes
  `member_progress` (unused). `[PRD-CLAIM]`/`[VERIFIED-CODE]`

### `RuleOfLife.jsx` (as an active page)
- **Existed:** `b3ba2bf`; superseded by `HouseholdOrder.jsx`. **Remnant:** file still on disk,
  **not imported**; `/rule` → `/order`. `[VERIFIED-CODE]`

### Multi-step onboarding variants
- 3-step → 2-step (v0.13) → 8-step (v0.15). Earlier variants recoverable via `git show`. Current: 8-step. `[VERIFIED-GIT]`

---

## 6. PRD EVOLUTION (17 revisions, 59→246 lines)

> Version headers were introduced at the commits below `[VERIFIED-GIT]`. Note: **v0.1–v0.3 blocks
> were written retrospectively** at `d74a4ad` (11 May), so early-version detail is `[PRD-CLAIM]`.

- **`ae7c6f3` (59L):** initial PRD — problem statement/brand/IA only, no version blocks.
- **`d5770f4`:** adds **v0.2** (Patria restructure narrative).
- **`d74a4ad`:** adds **v0.1 + v0.3** (retro-writes foundation & refinement). `[PRD-CLAIM]` for v0.1.
- **`d03585c`:** **v0.4** (cleanup/coherence, 1962 calendar option).
- **`719e317`:** **v0.5** (modularization + correctness; claims 143/143). `[PRD-CLAIM]`
- **`9c4cb11`:** **v0.6** (optional memorials; claims 150/150). `[PRD-CLAIM]`
- **`998c2e4`:** **v0.7** (budget expansion; claims 167/167). `[PRD-CLAIM]`
- **`860bb19`:** **v0.8** (axios hardening; flags `Today.jsx` as dead-but-kept — later contradicted by deletion). `[PRD-CLAIM]`
- **`e9f7cba`:** **v0.9** (removed `weekly_score`).
- **`0aacc42`:** **v0.10** (removed `avg_progress`; claims 167/167). `[PRD-CLAIM]`
- **`539ddc7`:** **v0.11** (household prayer; claims 168/168). `[PRD-CLAIM]`
- **`e49f471`:** **v0.12** (removed streak framing; adds `days_with_prayer_last_7`).
- **`7975250`:** **v0.13** (onboarding 3→2, first-run states; `has_held_first_council`).
- **`1a16967`:** **v0.14** (removed challenge count + `streak_days`; claims 168/168). `[PRD-CLAIM]`
- **`0409806`:** **v0.15** (First Rule of the Home 8-step; `first-charter`; claims 170/170). `[PRD-CLAIM]`
- **`4406ba3`:** **v0.16** (permanent `/charter`; `CharterCard` extracted).
- **`b05181f`:** **v0.17** (Charter↔Council seam).

**Claims not independently verified by code or tests:** every test count from v0.6 onward
(150/167/168/170) — no JUnit XML exists past v0.5 (§7). Dates inside PRD ("Jan–Feb 2026") conflict
with git (May 2026) — §11. Otherwise PRD narrative aligns with git diffs where checked.

---

## 7. TESTING AND QA EVIDENCE TIMELINE

### Machine-verified (stored JUnit XML) `[VERIFIED-TEST]`
| File | Tests | Date/time (from `timestamp=`) |
|------|-------|-------------------------------|
| `pytest_results.xml` | 34 | 2026-05-06 19:03 |
| `patria_modules_results.xml` | 34 | 2026-05-06 20:57 |
| `regression_results.xml` | 34 | 2026-05-06 20:58 |
| `v3_results.xml` | 25 | 2026-05-11 19:38 |
| `full_results.xml` | 93 | 2026-05-11 19:38 |
| `v4_full_results.xml` | 104 | 2026-05-12 16:29 |
| `v5_results.xml` | 119 | 2026-05-12 17:05 |
| `v5_public_results.xml` | 24 | 2026-05-12 17:07 |

All show **0 failures / 0 errors**. **Highest machine-verified local count = 119 (v0.5, 12 May).**

### QA reports `[VERIFIED-QA]`
`iteration_1..7.json`, covering v0.1→v0.8 (06–13 May): 34 backend → fe e2e → 68 → 93 → 104 → 119+24
→ fe axios-hardening matrix. **No iteration report exists for v0.9–v0.17.**

### PRD-prose-only counts `[PRD-CLAIM]`
143 (v0.5) / 150 (v0.6) / 167 (v0.7, v0.10) / 168 (v0.11, v0.14) / 170 (v0.15). **None corroborated
by JUnit XML.**

### Static current count `[VERIFIED-CODE]`
`grep "def test_"` across `backend/tests/*.py` = **152** functions (8 files, incl. `test_patria_v6`
and `test_patria_v7` which postdate the last XML).

### The discrepancy, stated plainly
- **Stored machine evidence stops at 119 (12 May, v0.5).** `[VERIFIED-TEST]`
- **PRD later claims up to 170.** `[PRD-CLAIM]` — unverified by any stored run.
- **Current static function count is 152.** `[VERIFIED-CODE]` — a count of definitions, not a
  passing-run result.
- **Do not treat 143/150/167/168/170 as verified.** The only defensible statements are "119 passed
  on 12 May per JUnit" and "152 test functions exist today." A fresh `pytest` run is required to
  reconcile. `[INFERRED]` the gap ≈ v0.6–v0.17 suites added after XML capture stopped.

---

## 8. DANGLING COMMIT ANALYSIS (`3614950`)

- **What it is:** an unreachable commit found via `git fsck`. Parent = `1a16967` (same as on-main
  `0409806`); **same job UUID `9b44c9fc`** and same timestamp minute (2026-05-22 23:48). `[VERIFIED-GIT]`
- **Difference from main:** **none.** `git diff --stat 3614950 0409806` returns **empty** — the two
  trees are byte-identical (both: `Onboarding.jsx` 664L, `household.py` containing `first-charter`,
  `+47` test lines, `+27` PRD lines). `[VERIFIED-GIT]`
- **Product/UX direction it represented:** exactly the v0.15 "First Rule of the Home" 8-step
  onboarding + charter — i.e. the direction that **did** ship. `[VERIFIED-GIT]`
- **Did its ideas reappear?** They *are* the shipped version; `0409806` is its on-main twin.
- **Useful historical evidence?** Only as confirmation that the v0.15 step produced one canonical
  result; the dangling copy is a duplicate snapshot (likely a commit-graph artifact of the
  auto-commit/rollback machinery), not an abandoned alternative.
- **Anything unintentionally lost?** **No.** Nothing unique exists in `3614950`. `[VERIFIED-GIT]`
- (Not restored/merged, per instruction — and there is nothing to merge.)

---

## 9. HISTORICAL vs CURRENT STATE

| Area | Earlier behavior | Later behavior | Current verified behavior | Evidence |
|------|------------------|----------------|---------------------------|----------|
| Dashboard health | `weekly_score` composite | removed (v0.9) | none | `[VERIFIED-GIT]`/`[VERIFIED-CODE]` |
| Goal aggregate | `avg_progress` | removed (v0.10) | per-goal bars only | `[VERIFIED-GIT]`/`[VERIFIED-CODE]` |
| Prayer | per-member matrix, streak/week_count | household rhythm (v0.11–0.14) | `days_with_prayer_last_7`; `member_id` Optional | `[VERIFIED-GIT]`/`[VERIFIED-CODE]` |
| Onboarding | 3-step → 2-step | 8-step charter (v0.15) | 8-step + shared `CharterCard` | `[VERIFIED-GIT]`/`[VERIFIED-CODE]` |
| Charter | none | `/charter` + endpoint (v0.15–0.16) | permanent, printable, Council-linked | `[VERIFIED-GIT]`/`[VERIFIED-CODE]` |
| Council | basic; dup-task risk | idempotent finalize (v0.5) | idempotent + charter card | `[VERIFIED-GIT]`/`[VERIFIED-CODE]` |
| Backend layout | 680→1630L monolith | 60L + routers (v0.5) | 14 routers + `deps.py` | `[VERIFIED-GIT]`/`[VERIFIED-CODE]` |
| `Today.jsx` | full page | deleted (13 May) | absent; `/today`→`/dashboard` | `[VERIFIED-GIT]`/`[VERIFIED-CODE]` |
| Rule of Life | active page | superseded by Household Order | file unused on disk; `/rule`→`/order` | `[VERIFIED-CODE]` |
| Challenge count | per-member leaderboard | removed from UI (v0.14) | UI communal; `member_progress` computed unused | `[PRD-CLAIM]`/`[VERIFIED-CODE]` |
| Budget | flat categories | grouped + income sources + goals (v0.7) | grouped stewardship planner | `[VERIFIED-GIT]`/`[VERIFIED-CODE]` |
| AI | scaffolded dep only | never wired | no AI; `emergentintegrations` unused | `[VERIFIED-GIT]`/`[VERIFIED-CODE]` |

---

## 10. DECISION-RATIONALE GAPS

For each: git proves *what* changed; the *why* below is not recoverable from transcripts.

1. **Removal of `weekly_score`/`avg_progress`/`streak`.** Evidence `e9f7cba`/`0aacc42`/`1a16967`
   `[VERIFIED-GIT]`. PRD says "Patria does not grade the family" `[PRD-CLAIM]`. The *originating
   user request/discussion* that triggered the arc is `[UNKNOWN]`. Current implementation appears
   **intentional** (test locks assert absence). `[VERIFIED-CODE]`
2. **`Today.jsx` deletion timing.** Evidence: deleted `8c8cf22` 13 May 19:05 `[VERIFIED-GIT]`, hours
   after PRD v0.8 said it was "kept." Whether this was a same-session decision reversal or a later
   cleanup is `[UNKNOWN]`. The fork handoff attributes its removal to the *latest* (v0.15–17)
   session `[HISTORICAL-SUMMARY]`, which **conflicts with git** (13 May). Treat git as authoritative.
   Current state (absent) appears **intentional**. `[VERIFIED-CODE]`
3. **Byzantine calendar left label-only.** Evidence: `liturgical_for` coerces non-roman/traditional
   to roman `[VERIFIED-CODE]`. Whether this was a scoping decision or unfinished work is `[UNKNOWN]`
   (PRD backlog lists "Full Byzantine engine" as P2, suggesting intentional deferral `[PRD-CLAIM]`).
4. **`emergentintegrations` present but never imported since day one.** Evidence `[VERIFIED-GIT]`.
   Rationale (planned AI vs base-image default) is `[UNKNOWN]`; appears **historical/vestigial**.
5. **`RuleOfLife.jsx` kept on disk after supersession.** Evidence `[VERIFIED-CODE]`. Whether kept
   deliberately or overlooked is `[UNKNOWN]`; appears **historical remnant**.
6. **`member_progress` still computed after UI removal (v0.14).** PRD says "left intact; may be
   useful later" `[PRD-CLAIM]`; the deeper reasoning is `[UNKNOWN]`. Appears **intentional-but-dormant**.
7. **Income auto-carry on a GET (read-path write).** Evidence v0.7 `[VERIFIED-GIT]`. Whether the
   read-side write was a deliberate convenience or an accident is `[UNKNOWN]`; appears **intentional**
   (function name `_autocarry_recurring_income`, PRD describes the behavior). `[PRD-CLAIM]`

---

## 11. CHRONOLOGY WARNING

Three inconsistent date systems exist:
- **Git commit timestamps:** 2026-04-30 → 2026-05-23 (dev), + 2026-09-28 (dossier). `[VERIFIED-GIT]`
- **PRD.md version labels:** written as "Jan 2026 / Feb 12–13, 2026." `[PRD-CLAIM]`
- **Environment/system dates:** task context says "current month: June 2026"; file mtimes range to Sep 28.

**Guidance:**
- **Relative sequencing:** use **git commit order** (authoritative). It cleanly orders v0.1→v0.17.
- **Absolute dating:** use **git timestamps** as the best available, but treat them cautiously —
  they may themselves be environment-clock artifacts.
- **Historical interpretation:** rely on **git order + PRD version numbers together**; ignore the
  PRD's absolute "Jan/Feb" labels and file mtimes as unreliable. Do **not** "fix" any dates.

---

## 12. HANDOFF NOTES FOR THE NEXT AI AGENT

**Strong parts of the record:**
- Complete, diff-level code history on `main` (37 dev steps) — every change is recoverable, including
  deleted files, via `git show`. `[VERIFIED-GIT]`
- The v0.9–v0.14 "subtraction arc" is precisely dated and confirmed still-in-effect in current code. `[VERIFIED-GIT]`/`[VERIFIED-CODE]`
- Early QA (v0.1–v0.8) is well documented (iteration_1–7 + JUnit through v0.5). `[VERIFIED-QA]`/`[VERIFIED-TEST]`
- PRD.md is a coherent, version-tagged narrative recoverable per revision.

**Weak parts:**
- **No machine test evidence after v0.5 (119 tests).** All higher counts are PRD prose.
- **No QA reports after v0.8.**
- **Absolute dates are unreliable** (three conflicting systems).
- **Early PRD version blocks (v0.1–v0.3) were written retrospectively.**

**Treat as PRIMARY:** git diffs/blobs, JUnit XML, iteration_*.json, current source.
**Treat as SECONDARY:** PRD.md narrative (esp. test counts + absolute dates), the fork handoff summary.

**Unknowable without the original chat transcript:** all user instructions and agent reasoning;
the exact trigger for the anti-gamification arc; the `Today.jsx` deletion decision; whether
vestigial items (`emergentintegrations`, `RuleOfLife.jsx`, `member_progress`) are intentional;
debated-but-rejected alternatives.

**Historical areas deserving special attention in an audit (observation only, no recommendation):**
- The 152-vs-119-vs-170 test-count reconciliation (run `pytest`).
- Vestigial/dead items flagged in §5/§10.
- The read-path-write in budget income auto-carry.
- The byzantine-as-roman coercion.
- The date-system inconsistency when interpreting any "when" question.
