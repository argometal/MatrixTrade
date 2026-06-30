# MATRIX v2 — Private Investment Knowledge Base

North star document. MatrixTrade app = experiment engine (H001–H030). This repo = long-term private memory.

**Canonical documentation:** [`md/README.md`](md/README.md) — full MD library by topic. Start there to find or rebuild anything.

## Objective

Build a private investment system that stores every investment, trade, thesis, lesson and portfolio movement in a structured way.

- **ChatGPT** = reasoning engine (already trained on your style and process).
- **This repository** = structured long-term memory.
- **MatrixTrade app** = numeric source of truth for the H001–H030 experiment cycle.

No public information. Everything remains private.

## Core principles

1. Never overwrite historical data.
2. Every closed trade is immutable.
3. Every analysis is versioned.
4. Every thesis can evolve while preserving history.
5. Losses are more valuable than gains.
6. Capital preservation has priority.

## Repository layout

```
portfolio/     Current positions and allocation
trades/        Experiment trades H001–H030 (see vault/Trades/ for app storage today)
companies/     One folder per ticker — thesis, research, trade index
watchlist/     Potential investments
journal/       Investment decisions log
lessons/       Mistakes and wins as knowledge
metrics/       Computed performance exports (derived, not source of truth)
research/      Reports, earnings, articles, summaries
assets/        Charts, screenshots, attachments
history/       Append-only snapshots and audit trail
```

## Company-centric model

Each company gets its own folder:

```
companies/
  GOOG/
    thesis.md
    valuation.md
    trades.md       Index of H00x trades for this ticker
    earnings/
    charts/
    news/
  AMZN/
    ...
```

Trade files (`H001-AMZN.md`) remain the experiment record. Company folders aggregate long-term context.

## MatrixTrade app (today)

| Layer | Location | Owner |
|-------|----------|-------|
| Numbers (entry, stop, exit, P/L) | `vault/Trades/*.md` frontmatter | App |
| Analysis (tesis, psychology) | Note body | You (Obsidian) |
| Export to ChatGPT | Dashboard → Copy Full Context | App |

Future: `MT-IMPORT:v1` parser to save structured ChatGPT responses.

## Sync with ChatGPT

You control what leaves the machine:

- **Copy Full Context** — live state + Obsidian notes (mobile/desktop)
- **DataTransfer** — private file bridge
- **GitHub connector** — read repo structure and docs (private repo only)

ChatGPT already holds your investment style. The repo adds **structure, rules, and current state** — not a blank slate.

## Decision framework (every new investment)

- Why this company?
- Why now?
- Why not later?
- Biggest risks / worst case
- Expected upside / max acceptable loss
- Exit conditions

## Analysis workflow

3M chart → 1M → 1W → 1D → fundamentals → valuation → decision.

No trade unless higher timeframes support the thesis.

## Rules

- Capital preservation first.
- Never average down without a new thesis.
- Every trade has a stop. Every stop is respected.
- Document everything. Never delete history.

## Phases

| Phase | Status |
|-------|--------|
| 0 — MatrixTrade app + GitHub private repo | Done |
| 1 — Vision doc + folder skeleton | Done |
| 1b — `md/` documentation library | Done |
| 2 — Manual content (H001, company theses) | Next |
| 3 — MT-IMPORT parser + selective export | Planned |
| 4 — Auto metrics from trades | Planned |

## Privacy

- Repo: **private** (`github.com/argometal/MatrixTrade`)
- Trade notes in `vault/Trades/*.md` are **gitignored** by default
- Only sync what you explicitly export or push
