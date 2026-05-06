# Domus — Catholic Household OS

## Original Problem Statement
Build a structured operating system for intentional Catholic households — the digital backbone of family life. Strategically differentiated from devotional content apps (e.g., Exodus 90) by being category-defining: not "another Catholic content app," but a structured OS for the household's spiritual life — rule of life, shared prayer rhythm, liturgical calendar, and seasons walked together.

## Architecture
- **Frontend:** React 19 + React Router 7, Tailwind, Radix/shadcn UI primitives, axios. Editorial typography (Fraunces serif + Geist sans + JetBrains Mono). Light "bone white" + dark "candlelight" themes. Liturgical color system as semantic data accents.
- **Backend:** FastAPI with `/api` prefix, MongoDB (motor), Pydantic v2. Liturgical engine (Easter via Meeus algorithm; seasons, fixed feasts, fasting/abstinence rules).
- **Auth:** Emergent-managed Google OAuth — session_id (URL hash) → backend exchange via `https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` → 7-day session_token in httpOnly cookie + persisted in `user_sessions`.
- **Mongo collections:** users, user_sessions, households, members, rules, rule_checkins, prayer_logs, challenges, challenge_checkins.

## User Personas
- **The Householder Father / Mother** (25–50): Catholic, intentional, runs the family with discipline. Already has bookmarks, novena cards, and a rule on paper. Wants a digital backbone that respects the seriousness of the vocation.
- **The Catechized Spouse:** Walks the rule alongside; logs prayers; participates in shared seasons.
- **The Child:** Has a profile (parent-controlled), checks in on simplified rule items and challenges.

## Core Requirements (static)
1. **Liturgical Calendar** — every day is computed: season color, feast/saint, rank, fasting/abstinence, Sunday flag.
2. **Rule of Life Builder** — 7 pillars (Prayer, Fasting, Almsgiving, Work, Rest, Formation, Hospitality). Daily/weekly cadence, per-member assignment, idempotent check-ins.
3. **Shared Prayer Tracker** — 6 prayer types (Morning Offering, Angelus, Rosary, Divine Mercy, Examen, Lectio Divina). Member × prayer matrix; 7-day household stats.
4. **Challenges / Seasons** — 5 built-in templates: Advent Jesse Tree (25), Lent 40, Exodus 90, Marian Consecration 33, 54-day Rosary Novena. Per-member daily check-ins.
5. **Multi-member household** — Parent-created members with role (parent/child), tile color, optional patron saint.
6. **Today (breviary) view** — single-glance: liturgical day, prayer rhythm, today's rule items, active seasons.

## Implemented (Jan 2026 — MVP v0.1)
- Marketing landing with editorial hero + positioning + module grid + dual CTAs
- Emergent Google Auth flow (synchronous hash detection, useRef-guarded callback, AuthProvider skip-on-hash)
- 3-step onboarding (household → primary parent → members)
- Today dashboard with liturgical breviary header, member switcher, prayer rhythm, rule check-ins, active challenge cards
- Liturgical Calendar page (list + side Sheet panel)
- Rule of Life builder (7 pillars, modal-driven rule creation, per-member assignment, delete)
- Prayer Tracker matrix (member × prayer type, 7-day stats)
- Challenges page (5 templates, member picker, active list with progress + check-ins)
- Household member management
- Settings (household + theme toggle)
- Light/dark theme; editorial typography; liturgical accent strips
- Backend: 100% (34/34) backend tests passing; frontend: 100% e2e flows passing

## Backlog
### P0 (next)
- Streak computation surfaced in Today + Rule pages
- Rule completion history calendar (per rule, last 30 days)
- Empty state CTAs on Today linking to Rule/Challenges

### P1
- AI module (Claude Sonnet 4.5) for: daily reflection, family conversation prompts, personalized rule suggestions
- Notifications (PWA push) for prayer rhythm slots
- Kid-mode simplified UI (auto-switches when child profile is active)
- Saint database with biographical pages and reading
- Custom challenges (build your own arc)

### P2
- Sharing / printable weekly household sheet
- Stripe paid plan after Lenten beta
- Native mobile (Capacitor)
- Byzantine calendar variant (currently field exists but identical computation)

## Test Credentials
See `/app/memory/test_credentials.md`.
