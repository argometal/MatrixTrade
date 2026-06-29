# MatrixTrade-IP01 — MVP Contract

Technical contract v1.0 — local experiment control for H001–H030.

## Objective

- Record experiment trades (H001–H030)
- Auto-calculate P/L
- Enforce cycle risk limits
- Block rule violations
- Link each trade to Obsidian for qualitative notes

## Separation of concerns

- **App** → hard data, validation, calculation (single numeric source of truth)
- **Obsidian** → thesis, psychology, lessons

## System rules

1. Only H001–H030 belong to the experiment
2. Maximum 30 trades per cycle
3. `cycleLossLimit = -300 USD`
4. Required fields: id, ticker, entry, stop, shares, status
5. No external trades, no manual P/L editing

## Nomenclature

Use: `realizedPnL`, `remainingLossBudget`, `cycleLossLimit`  
Do not use: `currentLoss`

## Formulas

```
result = (exit - entry) * shares - fees   // fees = 0 MVP
realizedPnL = sum(closed trade results)
remainingLossBudget = cycleLossLimit - realizedPnL
```

Win: result > 0 · Loss: result < 0

## Data storage (Obsidian)

Each trade is a markdown file in the vault:

```
vault/Trades/H003-MSFT.md
```

- **Frontmatter** → app-managed (numbers, status)
- **Body** → user-managed in Obsidian (thesis, psychology)

Config: `data/rules.json` (limits + vault path)

## Project layout

```
MatrixTrade/
├── app/           # pages + server actions
├── data/          # rules.json
├── lib/           # types, calculate, validation, obsidian, storage
└── vault/         # Obsidian vault (Trades/)
```

## MVP pages

- `/` — dashboard (realizedPnL, budget, win rate, active/pending)
- `/trades` — table with Obsidian links
- `/trades/new` — create trade form
- `/trades/[id]` — detail, open, close

## Out of scope (MVP)

Charts, advanced analytics, AI, auth, external DB.
