# Roadmap

**Last updated:** 2026-07-10

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

## Phase 3 — Active (Scouting + AI fleet)

| Item | Status | Doc |
|------|--------|-----|
| Stock File + Scouting Desk Phase 0 | **Done** | `matrix/strategic-planning-vision.md` |
| Unified `lib/ai-context.ts` (Exchange + Scouting) | **Done** | `matrix/ai-engineering.md` |
| AI Block: `scout-assessment`, `file-update` + Inbox Apply | **Done** | `matrix/ai-engineering.md` |
| TSLA pilot loop (copy → chat → inbox) | **Validate** | user QA |
| Trade layer redesign | **Frozen** | after scouting loop proven |
| Design UI checklists | **Removed** | `design/README.md` |

## Phase 4 — Next (knowledge + import)

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
