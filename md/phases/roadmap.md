# Roadmap

**Last updated:** 2026-07-12

## Phase 0 — Done

- MatrixTrade app (H001–H030)
- Obsidian vault integration
- Private GitHub repo + Vercel production
- Mobile connect + QR
- Copy Full Context / smart snapshot export

## Phase 1 — Done

- `md/` documentation library (the Library)
- Preview shell migration — **all trading routes**
- Monthly risk vs experiment (carryover, per-ticker cap)
- Cloud-first Supabase for trades + playbooks
- Legacy UI preserved in `app/components/legacy/`

## Phase 2 — Done (MatrixTrade product shell)

| Item | Status |
|------|--------|
| Preview shell on all routes | **Done** |
| Planning module (`/planning`) Phase 0 | **Done** |
| Stats / Review / Exchange / Mistakes dark variants | **Done** |
| Trade detail / review / new in preview shell | **Done** |
| Carryover toggle + `closedAt` edit | **Done** |
| Retire classic nav from active routes | **Done** (legacy code kept) |

## Phase 3 — Active (V2 architecture documented)

| Item | Status | Doc |
|------|--------|-----|
| V2 engine architecture (5 engines + Probe) | **Done** | `matrix/v2-engine-architecture.md` |
| Stock Profile design (append, light) | **Done** | `matrix/stock-profile-design.md` |
| Scout / execution model | **Done** | `matrix/scout-execution-model.md` |
| Runtime truth | **Done** | `matrix/runtime-truth.md` |
| Unified AI fleet | **Done** | `matrix/ai-engineering.md` |
| **Code Phase B** — Evidence + Profile synthesis | **Done** | `dbf87a6` |
| **Code Phase C** — Decision on Scout + Probe state | **Done** | Decision + Probe |
| **Code Phase D** — Learning + missed scout | **Next** | after TSLA loop sign-off |
| **Scoped AI Grant API** (GET link for external IA) | **ON HOLD — HIGH** | `matrix/building-backlog.md` — resume ~Aug 2026 |

## Phase 4 — Code (learning stack)

| Item | Status |
|------|--------|
| Decision fields on Scout | **Done** |
| Probe state machine | **Done** |
| Missed scout outcomes | Pending |
| Attribution + Statistics | Pending |

## Phase 5 — Knowledge import

| Item | Status | Doc |
|------|--------|-----|
| Populate `companies/AMZN/` with H001 example | Pending | `topics/companies-model.md` |
| `MT-IMPORT:v1` parser + `/import` confirm | Pending | `protocols/import-handoff-v1.md` |
| Library alignment backlog P1–P3 | Pending | `matrix/library-alignment-backlog.md` |

## Phase 5 — Planned (metrics)

Deferred concepts — see `md/concepts/deferred-matrixtrade.md`:

- Auto metrics in `metrics/` from trade + plan outcomes
- Win rate, expectancy, drawdown, strategy validity rate
- AI batch analysis on plan failure corpus
- Experiment restart (`experimentId`)

## ARGUS (parallel track)

Separate product — see `md/argus/README.md`. Shares auth only.

## Documentation rule

When a phase completes, update this file.  
Shipped features move from `concepts/` to runtime docs (`architecture/`, `rules/`).
