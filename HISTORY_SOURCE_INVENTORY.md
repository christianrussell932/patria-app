# HISTORY SOURCE INVENTORY — Patria (Catholic Household OS)

> **Scope.** This document is a factual inventory of the historical development evidence that is
> *actually accessible* to the current agent inside this Emergent workspace as of **28 Sep 2026**
> (commit timestamps in the repo are dated Apr–May 2026; see note on clock skew in §Caveats).
>
> **Rule followed:** I did **not** infer or reconstruct history here. I only recorded what sources
> exist, what they physically contain, whether each is *primary evidence* (a contemporaneous
> artifact) or a *later summary*, how reliable/comprehensive it is, and what gaps remain.
>
> **Evidence-type key:**
> - **PRIMARY (contemporaneous)** — produced at the time of the work (git diffs, JUnit XML with timestamps, agent test reports written that day).
> - **PROGRESSIVE SUMMARY** — a narrative written/appended over time (PRD.md), partly contemporaneous, partly retrospective.
> - **LATER SUMMARY** — written after the fact (the fork handoff, my own dossier).
> - **INFRASTRUCTURE** — platform machinery, not development history.

---

## SUMMARY TABLE

| # | Source | Period covered | Type | Reliability | Conversation content? |
|---|--------|----------------|------|-------------|-----------------------|
| 1 | Git history on `main` (39 commits) | 30 Apr – 23 May 2026 (+1 on 28 Sep) | PRIMARY (diffs) | High for code; commit msgs are opaque | **No** — messages are only `auto-commit for <job-uuid>` |
| 2 | Git dangling commit `3614950` | 22 May 2026 | PRIMARY (superseded snapshot) | High | No |
| 3 | Git reflog (40 entries) | same as commits | PRIMARY | High | No |
| 4 | `/app/memory/PRD.md` (17 git revisions, 59→246 lines) | 06 May – 23 May 2026 | PROGRESSIVE SUMMARY | High, author-written, version-tagged | Partial (design rationale, not raw chat) |
| 5 | `/app/test_reports/iteration_1..7.json` | 06 May – 13 May 2026 | PRIMARY (agent test reports) | High for what they cover (v0.1–v0.8) | Agent-authored prose summaries |
| 6 | `/app/test_reports/pytest/*.xml` (8 JUnit files) | 06 May – 12 May 2026 | PRIMARY (machine) | High but only through v0.5 | No |
| 7 | `/app/auth_testing.md` | ~06 May 2026 | PRIMARY (playbook) | Medium (generic) | No |
| 8 | `/app/test_result.md` | template only | TEMPLATE | N/A (unused) | No |
| 9 | `/app/design_guidelines.json` | ~06 May 2026 | PRIMARY (design spec) | High | No |
| 10 | `/app/memory/test_credentials.md` (gitignored) | current | PRIMARY (config) | High | No |
| 11 | `.emergent/` (emergent.yml, cron/, markers/) | current | INFRASTRUCTURE | N/A | No |
| 12 | Old file versions via `git show <hash>:<path>` | 06 May – 23 May 2026 | PRIMARY | High | No |
| 13 | Fork handoff summary (from the task prompt) | up to fork point | LATER SUMMARY | Medium (summarized) | Summarized, not raw |
| 14 | `PROJECT_HANDOFF_DOSSIER.md` (my prior turn) | retrospective | LATER SUMMARY | Derived | No |

---

## DETAILED SOURCE ENTRIES

### 1. Git commit history on `main`
1. **Location:** `/app/.git` (branch `main`).
2. **Period:** `Initial commit` 2026-04-30; first real code 2026-05-06; last development
   auto-commit 2026-05-23 22:38; plus one commit 2026-09-28 (my previous turn's shell output text
   captured as a message). **39 commits total on main** (37 dev-step `auto-commit` commits +
   initial + my Sep-28 commit).
3. **Contains:** The complete **code diff** of the project's evolution — every file added/changed
   at each of 37 development steps. Each dev step maps to a **job UUID** (e.g.
   `fbcda0d7-…`, `9430892b-…`). Example landmarks:
   - `6140210` (05-06 18:52): scaffold (75 files, base image + shadcn UI).
   - `b3ba2bf` (05-06 19:04): first Patria backend + pages incl. `Today.jsx`, `RuleOfLife.jsx`, per-member `PrayerTracker`.
   - `e22e344`/`ec70ed2`: `weekly_score` present (later removed).
   - `e9f7cba` (05-14): `weekly_score` removed (v0.9).
   - `539ddc7` (05-14): `PrayerTracker` matrix→household refactor (v0.11).
   - `0409806` (05-22): v0.15 onboarding charter expansion (`first-charter` endpoint).
   - `b05181f` (05-23): last dev commit (v0.17 Charter↔Council seam).
4. **Evidence type:** PRIMARY for code. **Commit messages contain NO conversation** — they are
   literally `auto-commit for <uuid>`. The *diffs* are direct evidence; the *reasoning* is not here.
5. **Reliability:** Very high for "what changed when." The job-UUID lets you correlate a code change
   to a single agent job, but the prompt/response text of that job is not stored in git.
6. **Gaps:** No human/agent messages; no rationale; sparse relative to actual conversation turns
   (many chat exchanges collapse into one auto-commit). Large calendar gaps between commits
   (05-14 → 05-22, and 05-23 → 09-28) reflect idle periods, not lost commits.

### 2. Git dangling (unreachable) commit `3614950`
1. **Location:** `git show 3614950` (found via `git fsck --lost-found`).
2. **Period:** 2026-05-22 23:48:36 — same job UUID `9b44c9fc-…` as on-main commit `0409806`
   (23:48:31), i.e. an **alternate/superseded snapshot** of the same v0.15 onboarding step.
3. **Contains:** `backend/routers/household.py` (+54), `schedule.py`, `test_catholic_household_os.py`
   (+47), `frontend/src/pages/Onboarding.jsx` (+681/-129), `memory/PRD.md` (+27) — the v0.15
   charter work.
4. **Evidence type:** PRIMARY (a real committed tree), but **not on `main`** (truly dangling).
5. **Reliability:** High as a code snapshot; represents a slightly different take on the same step
   that was replaced. Recoverable with `git show`/`git checkout 3614950`.
6. **Gaps:** No message beyond the job UUID; identical opacity to §1.

### 3. Git reflog
1. **Location:** `git reflog` (40 entries).
2. **Period:** mirrors the commit set.
3. **Contains:** HEAD movement log — no extra recoverable states beyond the commits already listed.
4. **Evidence type:** PRIMARY.
5. **Reliability:** High; confirms there are **no stashes, no tags, and a single branch (`main`)**.
6. **Gaps:** Provides no additional narrative.

### 4. `/app/memory/PRD.md` — Product Requirements / evolution log
1. **Location:** `/app/memory/PRD.md` (current working tree ~246–247 lines).
2. **Period:** First committed 2026-05-06 (59 lines); grown across **17 git revisions** to 246
   lines by 2026-05-23. Version headings inside span **v0.1 → v0.17** with dated entries
   (Jan–Feb 2026 as written by the author, though git timestamps are May 2026 — see Caveats).
3. **Contains:** Original problem statement, brand, architecture, information architecture, an
   `Implemented` changelog per version (v0.1–v0.17 with rationale), a P0/P1/P2 backlog, and test-credential pointer.
4. **Evidence type:** PROGRESSIVE SUMMARY — author(agent)-written, appended step-by-step, so each
   version block is roughly contemporaneous with that step, but it is a *curated narrative*, not raw chat.
5. **Reliability:** High and the single richest *narrative* source. Because it was version-tagged
   and grew monotonically, you can `git show <hash>:memory/PRD.md` to see exactly which paragraphs
   were added at which step (growth: 59→80→89→76→82→88→109→117→125→133→144→157→173→191→218→229→246).
6. **Gaps:** Contains decisions and their stated *why*, but not the user's exact words, alternatives
   debated, or discarded ideas beyond what the author chose to record.

### 5. `/app/test_reports/iteration_1.json … iteration_7.json`
1. **Location:** `/app/test_reports/`.
2. **Period:** 2026-05-06 (iter 1–3), 05-06/05-11/05-12 (iter 4–6), 05-13 (iter 7). Cover product
   phases **v0.1 → v0.8**.
3. **Contains:** Agent-authored QA reports with a prose `summary`, `backend_issues`
   (critical/minor), `frontend_issues`, and links. Concrete detail, e.g.:
   - iter 1: 34 backend tests; flags the logout-by-cookie-only minor bug.
   - iter 2: Playwright e2e of the (then) 3-step onboarding + per-member prayer matrix + a11y warning.
   - iter 3: Patria restructure, 68/68, 7-module landing, legacy redirects.
   - iter 4: v0.3 Council/Sacred Heart/Rhythms, 93/93.
   - iter 5: v0.4 season_label, 104/104.
   - iter 6: v0.5 refactor + correctness, 119/119 + 24 public smoke tests.
   - iter 7: v0.8 axios hardening matrix (mentions `Today.jsx` when it still existed).
4. **Evidence type:** PRIMARY (contemporaneous test documentation).
5. **Reliability:** High for the phases they cover; they are the best evidence of *what was verified*
   and *what bugs were found* early on.
6. **Gaps:** **They stop at iteration 7 (v0.8).** There are **no iteration reports for v0.9–v0.17**
   — that later history exists only in PRD.md prose + git diffs.

### 6. `/app/test_reports/pytest/*.xml` (JUnit)
1. **Location:** `/app/test_reports/pytest/` (8 XML files).
2. **Period (from `timestamp=` attrs):** 2026-05-06 → 2026-05-12.
3. **Contains:** Machine-generated JUnit results with test counts/timings:
   - `pytest_results` 34 (05-06 19:03), `patria_modules` 34, `regression` 34 (05-06 20:57/58),
     `v3` 25, `full` 93 (05-11 19:38), `v4_full` 104 (05-12 16:29), `v5` 119 (05-12 17:05),
     `v5_public` 24 (05-12 17:07). **All 0 failures / 0 errors.**
4. **Evidence type:** PRIMARY (machine).
5. **Reliability:** Highest for "tests that actually ran and passed" — but only through **v0.5 (119 tests)**.
6. **Gaps:** **No XML exists for v0.6–v0.17.** So the PRD/handoff claims of 143→150→167→168→170
   passing tests are **not corroborated by any stored JUnit file** — only by PRD prose. (This is
   the source of the "152 vs 170" discrepancy noted in the dossier.)

### 7. `/app/auth_testing.md`
1. **Location:** `/app/auth_testing.md` (73 lines, committed 2026-05-06).
2. **Period:** Early (foundation).
3. **Contains:** A generic Emergent auth-testing playbook — mongosh seed snippet, curl examples,
   Playwright cookie injection, a checklist (`{"_id":0}` projection, cookie-first auth, `useRef`
   dedupe). Notably references `/today` (the since-deleted route).
4. **Evidence type:** PRIMARY (procedural), but largely a reusable template rather than project-specific narrative.
5. **Reliability:** Medium — accurate but generic; confirms early auth design intent.
6. **Gaps:** No per-feature history.

### 8. `/app/test_result.md`
1. **Location:** `/app/test_result.md`.
2. **Period:** Template header only.
3. **Contains:** The standard testing-protocol boilerplate (YAML schema for backend/frontend tasks,
   communication protocol). **The data section below the protocol is empty** — it was never populated.
4. **Evidence type:** TEMPLATE (unused).
5. **Reliability:** N/A — carries no historical data for this project.
6. **Gaps:** Entirely; do not rely on it for history.

### 9. `/app/design_guidelines.json`
1. **Location:** `/app/design_guidelines.json` (committed 2026-05-06).
2. **Period:** Foundation.
3. **Contains:** The full design system spec — theme/archetype, typography (Fraunces/Geist/JetBrains
   Mono), light/dark + liturgical color palettes, layout/spacing rules, per-screen guidance, media
   references, and explicit "instructions to main agent."
4. **Evidence type:** PRIMARY (design source of truth).
5. **Reliability:** High; explains the aesthetic decisions.
6. **Gaps:** Design only; no feature/logic history.

### 10. `/app/memory/test_credentials.md`
1. **Location:** `/app/memory/test_credentials.md` — **gitignored** (`.gitignore` line
   `memory/test_credentials.md`), so it is **not in git history**.
2. **Period:** Current.
3. **Contains:** Demo session (`demo_session_patria`), demo user/household IDs, Bearer/cookie usage,
   fresh-session seeding snippet, role model notes. (Values intentionally not reproduced here.)
4. **Evidence type:** PRIMARY (config), current-state only.
5. **Reliability:** High for current test access; not versioned so no historical trail.
6. **Gaps:** Being gitignored, earlier versions are unrecoverable.

### 11. `.emergent/` platform directory
1. **Location:** `/app/.emergent/`.
2. **Contents:** `emergent.yml` (base image `fastapi_react_mongo_shadcn_base_image_cloud_arm:release-04052026-2`),
   `cron/` (webhook-cron machinery — `dispatch_webhook.sh`, `watch_crons.sh`, `webhook_crond.sh`,
   `webhook-crons`, empty `applied.hash`), `markers/.restore-complete`.
3. **Evidence type:** INFRASTRUCTURE (platform runtime), **not development history**.
4. **Reliability:** N/A for history. Confirms: no application crons are configured, and the base
   image date (04-05-2026) predates the first code commit — consistent with the timeline.
5. **Gaps:** Contains **no conversation logs, no checkpoint transcripts, no agent memory of chats.**

### 12. Old file versions via `git show`
1. **Location:** any historical blob, e.g. `git show b3ba2bf:frontend/src/pages/Today.jsx`.
2. **Period:** 2026-05-06 → 2026-05-23.
3. **Contains:** Fully readable prior versions of files that were later changed or deleted —
   verified recoverable: the deleted `Today.jsx`, the per-member `PrayerTracker` matrix
   (`b3ba2bf`/`539ddc7`), and the dashboard containing `weekly_score` (before `e9f7cba`).
4. **Evidence type:** PRIMARY.
5. **Reliability:** High — exact bytes of past implementations, ideal for confirming the
   "subtraction arc" claims against real code.
6. **Gaps:** Only captures states that were auto-committed; intra-step iterations are not preserved.

### 13. Fork handoff summary (delivered in the task prompt, not a file)
1. **Location:** Provided as text in this session's task prompt; **not stored anywhere on disk**.
2. **Period:** Up to the fork point (end of the prior context window, v0.17-era).
3. **Contains:** Original problem statement, last working item, pending/upcoming tasks, architecture,
   schema, recent user messages (summarized), known-issue recurrence counts.
4. **Evidence type:** LATER SUMMARY (a compression written for the fork).
5. **Reliability:** Medium — accurate in outline but lossy; it paraphrases user messages rather than quoting them.
6. **Gaps:** Not persisted; earlier fork summaries (if any prior forks existed) are **not present** as files.

### 14. `PROJECT_HANDOFF_DOSSIER.md` (my previous turn)
1. **Location:** `/app/PROJECT_HANDOFF_DOSSIER.md`.
2. **Period:** Retrospective (written 28 Sep 2026 turn).
3. **Contains:** The 39-section dossier synthesized from sources 1–13.
4. **Evidence type:** LATER SUMMARY (derived, not primary).
5. **Reliability:** As good as its sources; explicitly tags provenance.
6. **Gaps:** Any error inherited from the summarized sources.

---

## CAVEATS

- **Clock skew / dates:** Git commit timestamps run **2026-04-30 → 2026-05-23**, while PRD version
  entries are labelled **Jan–Feb 2026** and the environment's "current month" is **June 2026** (with
  file mtimes as late as Sep 28). These date systems are inconsistent; **treat git timestamps as the
  authoritative *relative* ordering** of development, and PRD version numbers (v0.1→v0.17) as the
  authoritative *logical* ordering.
- **Job UUIDs ≠ transcripts:** Each `auto-commit for <uuid>` ties a code change to one agent job, but
  the workspace stores **no transcript** for that job.
- **Test-count corroboration ends at v0.5:** JUnit XML exists only up to 119 tests (05-12). Every
  higher count (143/150/167/168/170) is PRD-prose only.

---

# EXPLICIT ANSWERS

## A. Are the original chat messages themselves accessible to me?
**No.** There is no transcript of the human↔agent conversation anywhere in the workspace. I searched
`/app` exhaustively (all `.md/.json/.txt/.xml/.yml/.log`), `/app/memory`, `/app/.emergent`, git
history, git reflog, git stash, and dangling objects. The only "message-like" text is git commit
subjects, which are `auto-commit for <job-uuid>` (plus one commit whose message is a stray line of my
own prior shell output). The fork handoff summary in the task prompt **paraphrases** recent user
messages but is not the raw chat and is not stored on disk.

## B. Do earlier checkpoints contain readable conversation content?
**No — but they contain readable CODE.** The "checkpoints" here are git auto-commits (one per job
step) and Emergent's own rollback checkpoints. Git checkpoints expose full, readable **file diffs and
prior file versions** (verified via `git show`), and there is **one recoverable dangling commit**
(`3614950`, an alternate v0.15 onboarding snapshot). None of these carry conversation/prompt text.
Emergent's platform-level rollback checkpoints (the user-facing "rollback" feature) are managed
outside this filesystem and are **not readable as conversation from inside the pod**.

## C. Are fork summaries from earlier context windows accessible?
**Only the single most recent one, and only as prompt text — not as a file.** The current fork's
handoff summary was given to me in the task prompt. It is not written to disk, and **no earlier fork
summaries exist anywhere in the workspace.** If prior context windows produced their own handoffs,
they were not persisted here.

## D. Are there historical project files NOT included in the first dossier?
**Yes — several, now catalogued above.** The dossier referenced PRD.md, test_credentials.md, and
mentioned test reports, but did **not** enumerate:
- The **8 JUnit XML files** in `test_reports/pytest/` (primary machine evidence, dated, with exact test counts through v0.5).
- The **detailed content of `iteration_1..7.json`** (agent QA narratives — I only summarized their existence before).
- `/app/auth_testing.md` (early auth playbook).
- The fact that `test_result.md` is an **empty template** (no logged data).
- **Git as a recoverable historical corpus** — including the **dangling commit `3614950`** and the ability to `git show` deleted files (`Today.jsx`) and pre-removal states (`weekly_score`, the per-member prayer matrix).
- The **17-revision growth trail of PRD.md** (59→246 lines) recoverable per-commit.
None of these change the dossier's conclusions, but they are additional primary evidence and are now inventoried here.

## E. What portions of the development history are still UNAVAILABLE?
1. **The raw conversation** — every user instruction, agent reply, reasoning, and clarification. Gone (not stored).
2. **Decision rationale beyond what PRD.md chose to record** — debated alternatives, rejected approaches (except where inferrable from code diffs), and the *exact wording* of user requirements.
3. **Intra-step iterations** — anything the agent tried and revised *within* a single job before the auto-commit; only the committed end-state of each step survives.
4. **Test verification for v0.6–v0.17 at the machine level** — no JUnit XML; only PRD prose asserts those counts.
5. **QA detail for v0.9–v0.17** — no iteration_*.json beyond #7 (v0.8).
6. **Earlier fork/handoff summaries** and any prior context-window state — not persisted.
7. **Historical `test_credentials.md`** — gitignored, so no version trail.
8. **Platform-side artifacts** (rollback checkpoint contents, deployment logs, the agent-service job records behind each UUID) — these live outside the pod filesystem and are not readable from here.

**Bottom line:** The *code* history is richly and reliably recoverable (git diffs + prior versions +
one dangling commit), and the *product narrative* is well preserved (PRD.md v0.1–v0.17 + iteration
reports v0.1–v0.8 + JUnit through v0.5). The *conversational* history — the actual messages and
reasoning — is **not accessible anywhere** and cannot be reconstructed, only summarized from the
surviving artifacts.
