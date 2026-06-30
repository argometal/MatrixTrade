# MatrixTrade app

Local Next.js application. Experiment control H001–H030.

## Stack

- Next.js 15, React 19, TypeScript, Tailwind
- Portable Node in `runtime/node/` (or shared `c:\Tools\runtime\env.bat`)
- No external database — files on disk

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Dashboard: P/L, budget, win rate, ChatGPT Handoff |
| `/trades` | List all trades |
| `/trades/new` | Create trade (validated) |
| `/trades/[id]` | Open, close, Obsidian link |
| `/connect` | QR codes for mobile access (all local IPs) |

## Key lib modules

| File | Role |
|------|------|
| `lib/storage.ts` | CRUD trades, experiment summary |
| `lib/obsidian.ts` | Read/write markdown + frontmatter |
| `lib/validation.ts` | H001–H030 rules, cycle limit |
| `lib/calculate.ts` | P/L, win rate, budget |
| `lib/snapshot.ts` | Export Full Context for ChatGPT |
| `lib/network.ts` | Local IPs for mobile |
| `lib/qr.ts` | QR generation for /connect |

## Server actions

`app/actions.ts` — createTrade, openTrade, closeTrade

## Scripts

| Script | Use |
|--------|-----|
| `start.bat` | Dev server on `0.0.0.0:3000` |
| `start-prod.bat` | Production build |
| `stop.bat` | Free port |
| `publish-github.bat` | Push to GitHub |

## MVP contract

Full experiment rules: `md/rules/experiment-cycle.md`  
Original: `MatrixTrade-IP01.md` at repo root.

## Out of scope (MVP)

Charts, auth, external DB, automatic AI calls, public hosting.
