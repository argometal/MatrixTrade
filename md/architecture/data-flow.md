# Data flow

## Create a trade

```
Planning (/planning)     → optional pre-trade plan (levels, MTF, window)
User fills /trades-preview or /trades/new
  → validateCreateTrade() (H001–H030, monthly cap, per-ticker)
  → write trade → Supabase or vault/Trades/H00x-TICKER.md
```

## Daily use

```
MatrixTrade app          Obsidian
────────────────         ────────
Create / open / close    Write analysis in note body
Dashboard metrics        Do NOT edit frontmatter
Copy Full Context    ←── reads body + all trade numbers
```

## Export to ChatGPT

```
Dashboard → Copy Full Context
  → buildSnapshot() — numbers, open/pending/closed
  → buildAnalysisSection() — Obsidian bodies
  → clipboard → paste in ChatGPT
```

ChatGPT already knows your style. Export adds **current experiment state**.

## Planned: import from ChatGPT

```
ChatGPT responds with MT-IMPORT:v1
  → /import page (Phase 3)
  → parser → preview → confirm
  → frontmatter → app · analysis → Obsidian body
```

See `md/protocols/import-handoff-v1.md`.

## Planned: company aggregation

```
Trade H001-AMZN.md  →  referenced in companies/AMZN/trades.md
Thesis long-form    →  companies/AMZN/thesis.md
```

See `md/topics/companies-model.md`.
