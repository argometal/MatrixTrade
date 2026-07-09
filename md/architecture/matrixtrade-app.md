# MatrixTrade app

Next.js application — experiment control H001–H030, preview shell, cloud-ready.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind
- **Production:** Vercel — https://matrix-trade-theta.vercel.app
- **Data:** `TRADES_STORE=supabase` (trades, playbooks, trade plans) or local JSON in `data/`
- Obsidian vault sync (optional, local paths)

## Preview routes (dark `PreviewShell`)

| Route | Purpose |
|-------|---------|
| `/` → `/home-preview` | Dashboard — monthly risk, experiment P/L, attention queue |
| `/home-preview` | Same dashboard |
| `/trades-preview` | New Trade workspace — proposals → Inbox |
| `/planning` | **Pre-trade plans** — entries, MTF, failed/expired tracking |
| `/trades` | Trades list |
| `/journal` | Closed trades log |
| `/playbook` | Playbook Lab |
| `/system` | Rules, bridge sync, connect QR |

## Classic routes (light shell — parity migration pending)

| Route | Purpose |
|-------|---------|
| `/inbox` | Apply/reject proposals |
| `/exchange` | Assistant + snapshot copy |
| `/stats`, `/review`, `/mistakes` | Analytics |
| `/trades/[id]` | Open, close, meta |
| `/trades/new` | Dormant on web nav — phone/LAN only |

## Key lib modules

| File | Role |
|------|------|
| `lib/storage.ts` | CRUD trades, experiment, rules |
| `lib/monthly-risk.ts` | Monthly cap + carryover (gross losses per month) |
| `lib/plans.ts` | Trade plans CRUD, auto-expire |
| `lib/validation.ts` | H001–H030, monthly + per-ticker caps |
| `lib/smart-snapshot.ts` | Export for ChatGPT (includes plans) |
| `lib/bridge.ts` | Worker snapshot publish |

## Risk model (two dimensions)

See `md/rules/monthly-risk-vs-experiment.md`:

- **Monthly:** $300 base + carryover from prior month; gross losses consume budget
- **Experiment:** H001–H030 sample; net P/L informational
- **Per ticker:** `maxLossPerTicker` (e.g. -$250)

## Planning module

See `md/design/planning-module-proposal.md` — Phase 0 implemented:

- `data/plans.json` or Supabase `trade_plans`
- Auto-expire when `validUntil` passes
- Dashboard attention + AI snapshot section

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
- Architecture: `md/architecture/system-overview.md`
