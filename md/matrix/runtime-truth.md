# MatrixTrade — Runtime truth (what works today)

**Status:** Updated 2026-07-22.  
**Rule:** This doc must match deployed code. V2 target lives in [v2-engine-architecture.md](v2-engine-architecture.md). Control naming lives in [control-panel-ia.md](control-panel-ia.md).

**Production:** https://matrix-trade-theta.vercel.app  
**Branch of truth for this refresh:** `main` + Control IA (Matrix Mechanics · Stock Files · Apply · Library).

---

## Mission (shipped product loop)

```text
Playbook (HOW)
  → Stock file (WHO)
  → Scout war room (decide + execute)
  → Trade fill
  → Trades histórico (verdict / learning)
  → MAF attribution (component expectancy — V1 foundation)
```

External AI proposes; human **Accept** via **Control → Apply** (preferred) or History Apply. Matrix never auto-writes.

There is **no Request layer** in Control — the human states the task in chat; AI asks for the exact visible block label when needed.

---

## Information architecture (nav)

| Area | Route | Role |
|------|-------|------|
| Dashboard | `/home-preview` | Hoy: riesgo + atención |
| Scout | `/planning` | **War room** — one case: radiografía + execute |
| Trades | `/trades` | **Histórico** filtrable por veredicto |
| Playbook | `/playbook` | Policies / method experiments |
| Insights | `/stats` | Stats / journal / mistakes |
| History | `/inbox` | Past proposals; prefer Control → Apply for new blocks |
| System | `/system` | Mechanics snapshot + system status |
| Connect | `/connect` | Bridge / connect helpers |

**Mobile tabs:** Dashboard · Scout · Trades.

**Deprecated:** Enter Trade (`/trades-preview`) → redirects to `/planning`. Execution = Scout boot package → Control → Apply → Accept.

---

## Control panel (global)

### Primary

| Entry | Job |
|-------|-----|
| **Matrix Mechanics** | Copy Matrix constitution once for a new AI chat |
| **Stock Files** | Pick one ticker → MTAE request + profile + linked scouts (direct access) |
| **Apply** | Paste AI Block → Validate → Accept |

### Library

| Entry | Job |
|-------|-----|
| **Technical Analysis** | MTAE protocol + TF role maps (no capital) |
| **Playbook** | Method rules / checklists / stats |
| **Scout Desk** | Desk overview + monthly risk room |
| **Learning** | MAF attribution protocol (existing `buildMafProtocolBrief`) |

**Not in Control:** Closed-trade forensic picker. Forensic lives on `/trades/{id}` (evidence only — no embedded Mechanics / Request).

Canonical rules: [control-panel-ia.md](control-panel-ia.md) · [ui-naming.md](../rules/ui-naming.md).

---

## Scout vs Trades (critical)

| Concept | Meaning in prod |
|---------|-----------------|
| **Scout** | Live case desk. Incomplete fills stay here by ticker until **completed**. |
| **Completed** | Closed fill **+** review/analysis done — leaves war room for Trades histórico. |
| **Closed alone** | Still incomplete for Scout purposes — stays in war room. |
| **Trades ledger** | Filtrable: éxito / perdido / entrada tardía / jamás ejecutado / sin veredicto. |
| Scout Plan (PLAN-xxx) | One tactical WINDOW (this setup / this period). NEW opportunity on same ticker → NEW PLAN id. |
| Trade (H00x) | One fill. NEW execution → NEW trade id. Closed trades stay in Trades histórico. |

**Same ticker ≠ recreate Stock File.** See Mechanics brief section `SAME TICKER LIFECYCLE` (rev 16+).

Code: `lib/scout-case-trades.ts`, `lib/trades-ledger.ts`, `ScoutExecutePanel`.

---

## Routes that matter for the core loop

| Route | Role | Usable? |
|-------|------|---------|
| `/home-preview` | Dashboard | Yes |
| `/planning` | Scout war room | Yes — case pick, snapshot, boot package, execute panel |
| `/trades` | Histórico | Yes — ledger filters |
| `/trades/[id]` | Trade detail + snapshots (incl. forensic if closed) | Yes |
| `/playbook` | Method lab | Yes — 7 playbooks in `data/playbooks.json` |
| `/stats` | Insights | Yes |
| `/inbox` | History / Apply gate | Yes — Control → Apply preferred for new pastes |
| `/stock-theses/[id]` | Stock profile | Yes — dossier + AI packages; UI save still partial |
| `/stock-theses/new` | New stock case UI | Yes (also `stock-case-create` via Apply) |
| `/system` | Mechanics + status | Yes |
| `/scout-access/[grantId]` | Scoped AI grant | Yes |
| `/exchange` | Legacy assistant paste | Prefer Control → Apply |
| `/trades-preview` | Deprecated Enter Trade | Redirect → `/planning` |

---

## Data & stores

### Local / JSON mode (dev)

| File | Contents (repo seed) |
|------|----------------------|
| `data/stock-theses.json` | Stock profiles (seed: TSLA) |
| `data/plans.json` | Scouts `PLAN-xxx` (seed: TSLA wait, NFLX go) |
| `data/playbooks.json` | 7 playbooks — all `TESTING` (expectancy, layered entry, MTF, pullback, risk-weighted, …) |
| `data/market-evidence.json` | Evidence stream (`ME-xxx`) |
| `data/scoped-ai-grants.json` | Temporal AI grants |
| `data/trade-evaluations.json` | Post-close evaluation records |
| `data/maf-experiments.json` | MAF attribution experiments |
| `data/learning-outcomes.json` | Learning Outcome (`LO-xxx`) — win/loss/miss/cancel/expire |
| `data/observations.json` | Observation Engine (`OBS-xxx`) |
| `data/setups.json` | Setup catalog |
| `data/trades.json` | Used when not on Supabase |

### Production trades

| Mode | When |
|------|------|
| **Supabase** | `TRADES_STORE=supabase` or `VERCEL_ENV=production` |
| JSON file | Local / explicit JSON mode |

Upsert tolerates missing `loss_classification` / `post_stop_study` columns (retry without those fields). Prefer running `supabase/trade-learning-extensions.sql` when schema allows.

Stock files / plans / playbooks remain file-backed unless otherwise configured.

---

## AI fleet (shipped)

| Piece | Status |
|-------|--------|
| Control → Apply | Primary write path (user-facing; internal component may still be named ControlPanelUpdate) |
| `buildMatrixMechanicsBrief` / snapshot | Primer in packages — **mechanics_revision: 21** (Control IA: Apply + Library; forensic evidence-only) |
| **MTAE** | Control → Library → **Technical Analysis**; optional per-TF `participation` + `participationSynthesis` |
| **MAF** | `attribution` Apply → `data/maf-experiments.json`; evidence from Trade+Plan+Observation+LearningOutcome; rule hints |
| **Learning Outcome** | Auto on trade close / plan outcome → `data/learning-outcomes.json` (`LO-xxx`) |
| **Observation** | Auto seed + `observation-update` Apply → `data/observations.json` (`OBS-xxx`) |
| TF role presets | `data/mtae-timeframe-maps.json` (swing-6m, swing-3m, day-active) |
| `lib/ai-context.ts` | Unified export builders |
| Entry Solver vs Entry Optimization | Feasibility ceiling (`maximumEntry`) ≠ recommended entry |
| Scout trade boot package | `lib/trade-boot.ts` + Scout execute panel |
| Trade forensic snapshot | Closed trades on `/trades/[id]` only |
| Scoped AI grants | 24h TTL; optional `planId` |

### Apply-ready AI Block types

Scouting: `stock-case-create`, `stock-case-delete`, `evidence-add`, `file-update`, `scout-plan-create`, `technical-assessment`, `technical-calibration`, `scout-assessment`, `decision-update`  
Execution: `trade-proposal`, `trade-update`, `trade-close`, `trade-review`, `analysis`, `attribution`, `observation-update`  
Method: `playbook-create`, `playbook-update`

**Same-ticker new window:** `scout-plan-create` (not `stock-case-create`).  
**Boundary:** MTAE = technical only (geometry + optional participation). Scout = capital. MAF = post-experiment component attribution (not journal). See [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md) · [mtae-participation-layer.md](mtae-participation-layer.md) · [maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md).

---

## Decision + Probe + evaluation (shipped)

| Piece | Status |
|-------|--------|
| Scout = `TradePlan` | `data/plans.json` |
| `ScoutDecision` | `wait` \| `probe` \| `go` \| `no` |
| Probe state machine | authorize → activate → convert \| cancel \| stop |
| Probe → Trade | `lib/probe-to-trade.ts` |
| `TradeEvaluation` | ADR-0002 — observing window after close |
| Layered entry experiments | Playbook-level (preferred over Probe for entry optimization) |

---

## What does NOT work / not built

- Aggregated attribution dashboards / dimensional statistics Coach UI
- Automatic market-feed MFE/MAE (supply via `observation-update` / forensic)
- Bayesian automation (optional prior/posterior fields only)
- Automatic Coach
- Paid AI API integration
- AI Session + QR path (disabled — see `lib/ai-session-disabled.ts`)
- MAF confidence calibration / Supabase persistence for MAF / LO / OBS rows

---

## Known mismatches (UI vs data)

| UI / copy | Reality |
|-----------|---------|
| Full dossier sections on Stock file | Only subset of fields save from forms; prefer `file-update` / Control |
| Seed JSON vs prod | Prod trades = Supabase; local seed may show TSLA/NFLX plans without matching prod fills |
| “Case” in Scout war-room speech | Product language for a live ticker episode — **not** a Control section label (forbidden: Control → Case) |
| Legacy Enter Trade / workspace components | May still exist in tree; nav + `/trades-preview` redirect are the product path |

---

## Library entry points

1. [strategic-planning-vision.md](strategic-planning-vision.md) — mission  
2. [v2-engine-architecture.md](v2-engine-architecture.md) — target  
3. [control-panel-ia.md](control-panel-ia.md) — Control + naming bans  
4. [snapshot-catalog.md](snapshot-catalog.md) — where each snapshot lives  
5. [ai-engineering.md](ai-engineering.md) — AI contract  
6. [scout-execution-model.md](scout-execution-model.md) — Scout vs Trade vs Probe  
7. This file — **what is true in prod**

---

## Next coding phase

| Status | Item |
|--------|------|
| **NEXT** | Closed-trade Observation UX reusing existing `observation-update` + Observation store (no new schema) |
| **EVALUATION** | MAF expectancy aggregation by component/Playbook — only if enough attributed rows exist |
| **OUT OF SCOPE now** | Request layer, Library schema, Volume profile / AVWAP, L2 / heatmap, empty dashboards |

Do not reintroduce Control → Closed trade, Session, Case, or Update labels. Do not bury Stock Files under Library.
