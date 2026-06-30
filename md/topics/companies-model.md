# Companies model

One folder per ticker. All company history stays together.

## Structure

```
companies/
  GOOG/
    thesis.md       Business, moat, risks, valuation, bull/bear
    valuation.md    Fair value, expected return, last review date
    trades.md       Index: H007 → vault/Trades/H007-GOOG.md
    earnings/       Quarterly notes
    charts/         Screenshots
    news/           Articles and summaries
  AMZN/
    thesis.md
    trades.md       H001 reference
    ...
```

## trades.md example

```markdown
# AMZN trades

| ID | Status | Entry | Exit | P/L | Notes |
|----|--------|-------|------|-----|-------|
| H001 | closed | 240 | 225.90 | -112.80 | Stop respected |

File: vault/Trades/H001-AMZN.md
```

## Thesis file sections

- Business · Competitive advantage · Management
- Financials · Debt · Growth · Risks · Catalysts
- Valuation · Fair value · Expected return
- Bear case · Bull case · Personal confidence
- Date of last review

## Why

40 trades in Google over 5 years → everything under `companies/GOOG/`.  
ChatGPT + private bridge can load full company context before recommending action.
