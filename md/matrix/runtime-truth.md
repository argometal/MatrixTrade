# MatrixTrade — Runtime truth (what works today)

**Status:** Updated 2026-07-10 (Phase C).  
**Rule:** This doc must match deployed code. V2 target lives in [v2-engine-architecture.md](v2-engine-architecture.md).

**Production:** https://matrix-trade-theta.vercel.app

---

## Mission (shipped in docs + partial code)

Expectation database → train chat → validate thesis → scout decision → (later) execute. **Not** a polished operator UI.

---

## Routes that matter for the core loop

| Route | Role | Usable? |
|-------|------|---------|
| `/planning` | Scouting Desk | Copy AI package; log PLAN scout; record decisions; probe state |
| `/stock-theses/[id]` | Stock Profile | View TSLA; edit 3 fields; copy AI package; active scout links |
| `/exchange` | Assistant | Same AI engine; import blocks |
| `/inbox` | Apply gate | `decision-update`, `scout-assessment`, `file-update`, `evidence-add`, trades… |
| `/scout-access/[grantId]` | Scoped AI | Context + inbox for one profile (optional one PLAN) |
| `/playbook` | Method | Example only |
| `/trades` | Execution | **Frozen** for redesign — journal layer |

---

## Data files (local / JSON mode)

| File | Contents |
|------|----------|
| `data/stock-theses.json` | Stock profiles (1 pilot: TSLA) |
| `data/plans.json` | Scouts as `PLAN-xxx` — TSLA pilot with sample `wait` decision |
| `data/market-evidence.json` | Evidence stream (`ME-xxx`) |
| `data/scoped-ai-grants.json` | Temporal AI grants (`GRANT-xxx`) |
| `data/playbooks.json` | Weekly Breakout example |
| `data/trades.json` or Supabase | Trades |

---

## AI fleet (shipped)

| Piece | Status |
|-------|--------|
| `lib/ai-context.ts` | Unified export for Exchange + Scouting |
| `buildMatrixMechanicsBrief` | Primer in every package |
| `evidence-add` inbox apply | Appends `ME-xxx` rows |
| `scout-assessment` inbox apply | Appends to profile `notes` |
| `file-update` inbox apply | Patches status, hypothesis, notes; `version++` |
| **`decision-update` inbox apply** | Appends Decision on `TradePlan`; optional Probe authorize |
| Scoped AI grants | 24h TTL; optional `planId` binding |

---

## Phase C — Decision + Probe (shipped)

| Piece | Status |
|-------|--------|
| `ScoutDecision` on `TradePlan` | `decision`, `decisionHistory`, `scoutLifecycle` |
| Verdicts | `wait` \| `probe` \| `go` \| `no` |
| Probe state machine | authorize → activate → convert \| cancel \| stop |
| Human record decision | `/planning` form + server actions |
| AI `decision-update` block | Inbox Apply → `appendDecision` |
| Trade creation from probe | **Not built** (execution frozen) |

---

## What does NOT work / not built

- Missed opportunity outcome (Learning Engine)
- Create new Stock Profile from UI
- Edit levels / historical analysis from UI
- Attribution scores
- Dimensional statistics engine
- Bayesian automation (only optional prior/posterior fields stored)
- Automatic Coach
- Paid AI API integration

---

## Known mismatches (UI vs data)

| UI shows | Reality |
|----------|---------|
| Full dossier sections | Only status, hypothesis, notes save |
| Go / Wait / No badge (thesis summary) | Stored plan decision when present; else computed from `status` |
| Probe panel | Planning artifact only — no position/trade link |
| “Scouting Desk” | `TradePlan` CRUD + Decision + AI copy |

See [stock-profile-design.md](stock-profile-design.md) for save matrix.

---

## Library entry points

1. [strategic-planning-vision.md](strategic-planning-vision.md) — mission
2. [v2-engine-architecture.md](v2-engine-architecture.md) — target
3. [ai-engineering.md](ai-engineering.md) — AI contract
4. [ai-evolution.md](ai-evolution.md) — dummy→real via protocol
5. This file — **what is true in prod**

---

## Next coding phase

Order per [v2-engine-architecture.md](v2-engine-architecture.md): **Phase D** — Learning outcomes + missed scout.

Do not expand trade UI until Scout loop validated on TSLA.
