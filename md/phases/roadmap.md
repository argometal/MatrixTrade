# Roadmap

**Last updated:** 2026-07-09

## Phase 0 — Done

- MatrixTrade app (H001–H030)
- Obsidian vault integration
- Private GitHub repo + Vercel production
- Mobile connect + QR
- Copy Full Context / smart snapshot export

## Phase 1 — Done

- `md/` documentation library
- Preview shell migration (dashboard, trades, journal, playbook, system)
- Monthly risk vs experiment (carryover, per-ticker cap)
- Cloud-first Supabase for trades + playbooks

## Phase 2 — In progress (MatrixTrade product)

| Item | Status |
|------|--------|
| Preview shell on Inbox + Exchange | Pending |
| **Planning module** (`/planning`) | **Phase 0 done** |
| Trade detail in preview shell | Pending |
| Stats / Review / Mistakes dark variants | Pending |
| Retire classic nav + orphan components | Pending |
| Verify `closedAt` on Supabase trades (carryover) | User QA |

## Phase 3 — Next (knowledge + import)

- Populate `companies/AMZN/` with H001 example
- `MT-IMPORT:v1` parser + `/import` confirm page
- `MT-PLAN:v1` structured blocks from ChatGPT → Planning
- Selective export by ticker

## Phase 4 — Planned (metrics)

- Auto metrics in `metrics/` from trade + plan outcomes
- Win rate, expectancy, drawdown, strategy validity rate
- AI batch analysis on plan failure corpus

## ARGUS (parallel track)

Separate product — see `md/argus/README.md`. Shares auth only.

## Documentation rule

When a phase completes, update this file and add topic docs under `md/topics/` or `md/design/` as needed.
