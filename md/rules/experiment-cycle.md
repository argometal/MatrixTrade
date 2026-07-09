# Experiment cycle H001–H030

> **Risk model updated (2026-07-09):** Monthly loss cap and experiment cycle are separate.
> See [monthly-risk-vs-experiment.md](monthly-risk-vs-experiment.md). The `cycleLossLimit` field
> is deprecated; use `monthlyLossLimit` for the -$300/month account cap.

Technical contract for the MatrixTrade experiment engine.

## Objective

- Record experiment trades H001 through H030 only
- Auto-calculate P/L
- Enforce cycle risk limits
- Block rule violations
- Link each trade to Obsidian for qualitative notes

## System rules

1. Only H001–H030 belong to the experiment
2. Maximum 30 trades per cycle
3. `monthlyLossLimit = -300 USD` per calendar month (see [monthly-risk-vs-experiment.md](monthly-risk-vs-experiment.md))
4. Required fields: id, ticker, entry, stop, shares, status
5. No external trades, no manual P/L editing in Obsidian frontmatter

## Nomenclature

Use:

- `realizedPnL`
- `remainingLossBudget`
- `cycleLossLimit`

Do not use: `currentLoss`

## Formulas

```
result = (exit - entry) * shares - fees   // fees = 0 in MVP
realizedPnL = sum(closed trade results)
remainingLossBudget = cycleLossLimit - realizedPnL
```

Win: result > 0 · Loss: result < 0

## Trade statuses

| Status | Meaning |
|--------|---------|
| pending | Created, not in market yet |
| open | In position |
| closed | Exited; exit price required |

Closed trades cannot reopen.

## Validation highlights

- ID must match `H001`…`H030`
- Stop must be below entry (long trades)
- Shares = positive integer
- New trades blocked when `realizedPnL <= cycleLossLimit`

## Trade file location

```
vault/Trades/H003-MSFT.md
```

Config: `data/rules.json`

## Example closed trade (reference)

**H001 · AMZN**

- Entry 240.00 · Exit 225.90 · Shares 8 · Result -112.80 USD
- Stop executed correctly. No immediate re-entry. Maintain discipline.
