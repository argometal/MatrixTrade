# Trades

Experiment trades **H001–H030**.

## Today

The MatrixTrade app writes to:

```
vault/Trades/H001-AMZN.md
```

Those files are **gitignored** (private data). This folder is the v2 home for trade records when you choose to version them in git.

## Each trade file contains

- ID (H001…H030), ticker, entry/exit, shares, stop, target
- Status: pending | open | closed
- Reasons, psychology, lessons (note body)
- Links to `companies/TICKER/trades.md`

## Rules

- Closed trades are immutable.
- Corrections go to `history/`, not overwrites.
