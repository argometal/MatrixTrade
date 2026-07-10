# MatrixTrade app

**Status:** Runtime truth  
**Last updated:** 2026-07-10

Next.js application — trading lab with monthly risk control, unified preview shell, cloud-ready.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind
- **Production:** Vercel — https://matrix-trade-theta.vercel.app
- **Data:** `TRADES_STORE=supabase` (trades, playbooks, trade plans, rules) or local JSON in `data/`
- Obsidian vault sync (optional, local paths)

## Shell

All trading routes use **dark `PreviewShell`** via `PreviewRouteLayout`.  
Legacy light UI preserved in `app/components/legacy/` — not mounted on active routes.

## Routes

| Route | Purpose |
|-------|---------|
| `/` → `/home-preview` | Dashboard — monthly risk, experiment P/L, attention queue |
| `/home-preview` | Same dashboard |
| `/trades-preview` | New Trade workspace — proposals → Inbox |
| `/planning` | Pre-trade plans — entries, MTF, failed/expired tracking |
| `/trades` | Trades list |
| `/journal` | Closed trades log |
| `/playbook` | Playbook Lab |
| `/mistakes` | Mistake cost breakdown |
| `/inbox`, `/inbox/[id]` | Apply/reject proposals |
| `/exchange` | Assistant + snapshot copy (dark theme) |
| `/stats` | Cycle analytics |
| `/review` | Attention queue + reviews |
| `/system` | Rules, carryover toggle, bridge sync, connect QR |
| `/trades/[id]` | Open, close, meta, **close date edit** |
| `/trades/[id]/review` | Review wizard |
| `/trades/new` | Direct create (LAN/phone workflow) |
| `/connect` | Redirect → `/system#connect` |
| `/ai-workspace` | Redirect → `/exchange` |

Route map detail: [`design/legacy-vs-preview-map.md`](../design/legacy-vs-preview-map.md)

## Key lib modules

| File | Role |
|------|------|
| `lib/storage.ts` | CRUD trades, experiment, rules (`carryoverEnabled`) |
| `lib/monthly-risk.ts` | Monthly cap + carryover; `monthlyRoomCap` display |
| `lib/plans.ts` | Trade plans CRUD, auto-expire |
| `lib/validation.ts` | Trade create/close — monthly + per-ticker caps |
| `lib/smart-snapshot.ts` | Export for ChatGPT (includes plans) |
| `lib/bridge.ts` | Worker snapshot publish |

## Risk model (two dimensions)

See `md/rules/monthly-risk-vs-experiment.md`:

- **Monthly:** $300 base; optional carryover from prior month unused budget
- **Carryover toggle:** `/system` → Experiment rules → *Enable monthly carryover*
  - On: allowance = base + carryover; dashboard *Monthly room left* = budget + carryover
  - Off: allowance = base only
- **Bucketing:** `closedAt` calendar month (editable on trade detail)
- **Lab:** all closed trades accumulate — no trade-count cap
- **Experiment P/L:** net across all trades — informational
- **Per ticker:** `maxLossPerTicker` (e.g. -$250)

## Planning module

Phase 0 shipped — see `md/design/planning-module-proposal.md`:

- `data/plans.json` or Supabase `trade_plans`
- Auto-expire when `validUntil` passes
- Dashboard attention + AI snapshot section

Phase 1+ concepts: `md/concepts/deferred-matrixtrade.md`

## Supabase migrations

Run in SQL Editor when using cloud store:

- `supabase/schema.sql` — playbooks, trades
- `supabase/trade-plans.sql` — trade plans table

## Scripts

| Script | Use |
|--------|-----|
| `npm run dev` | Dev server (port 3002) |
| `npm run build` | Production build |
| `npm run seed:supabase` | Seed playbooks + trades from JSON |

## Docs

- Rules: `md/rules/experiment-cycle.md`
- Design QA: `md/design/README.md`
- Concepts: `md/concepts/README.md`
- Architecture: `md/architecture/system-overview.md`
