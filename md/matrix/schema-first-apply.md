# MTA — Schema-first Apply discipline

## Why

AI must not invent Apply JSON. Semantic guesses that look reasonable but fail import destroy trust.

## Rules

1. **Schema-first** — before Apply JSON, read the Apply Schema Contract (Control → Train AI) or an accepted export example.
2. **Never invent keys** — only fields in the contract / sample / validator feedback.
3. **Stop if contract missing** — deliver conceptual analysis only; do not call it importable JSON.
4. **One validator error ≠ full validation** — re-check the whole object against the contract.
5. **Separate analysis from serialization** — conceptual ticket first, then exact keys.
6. **Layer ownership** — MTAE / Stock File / Scout / Trade stay separate.

## Creation hard gate

`stock-case-create` and `scout-plan-create` **require** `plannedEntry` + `stopPrice` + `targetPrice`.
Without them, Apply rejects the JSON.

`riskRules.invalidation` must be an **observable event** (e.g. `Weekly close below 130`), not a bare price.

## Conceptual ticket template (before JSON)

```
Ticker: …
Stock File
  Primary zone: …
  Secondary study zone: …
  Structural targets: …
  Current thesis invalidation: <event>
  Momentum: …
Scout candidate
  Entry: …
  Stop: …
  Target: …
  Extended target (ops): …
  Minimum R:R: …
  Status: …
```

Then serialize only with allowed keys.
