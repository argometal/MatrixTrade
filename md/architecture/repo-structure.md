# Repository structure

## Top-level layout

```
MatrixTrade/
├── md/                  ← The Library (architecture docs — START HERE)
│   ├── architecture/    ← Runtime: app structure, data flow
│   ├── rules/           ← Runtime: experiment + monthly risk
│   ├── design/          ← Runtime: UI checklists + shipped proposals
│   ├── concepts/        ← Deferred ideas — apply later
│   ├── phases/          ← Roadmap status
│   └── argus/           ← Separate product track
├── app/                 ← Next.js UI + server actions
├── lib/                 ← Business logic
├── data/rules.json      ← Cycle limits, vault path
├── vault/               ← Obsidian vault (Trades/ = live experiment)
│
├── portfolio/           ← Current positions (v2 data)
├── trades/              ← Trade records index (v2; app uses vault/Trades/)
├── companies/           ← One folder per ticker
├── watchlist/
├── journal/
├── lessons/
├── metrics/
├── research/
├── assets/
└── history/             ← Append-only snapshots
```

## What goes in git

| Path | In git? | Notes |
|------|---------|-------|
| `md/` | Yes | Architecture and rules |
| `app/`, `lib/` | Yes | Application code |
| `vault/Trades/*.md` | **No** | `.gitignore` — private trade data |
| `companies/`, `journal/` | Yes when you add content | Your choice per file |
| `history/` | Yes | Dated exports, audit trail |

## Company-centric model

```
companies/
  TICKER/
    thesis.md
    valuation.md
    trades.md      ← index of H00x for this ticker
    earnings/
    charts/
    news/
```

Trade files: `vault/Trades/H001-AMZN.md` (app) · referenced from `companies/AMZN/trades.md`.

## Config

`data/rules.json`:

```json
{
  "cycleLossLimit": -300,
  "maxTrades": 30,
  "obsidianVault": "TradingVault",
  "obsidianVaultPath": "vault",
  "tradesFolder": "Trades"
}
```

## Rebuild checklist

To reconstruct from this repo alone:

1. Read `md/README.md`
2. Install: `install.bat` · Start: `start.bat`
3. Open Obsidian on `vault/`
4. App at `http://localhost:3000`
5. Mobile: `/connect` for QR codes
