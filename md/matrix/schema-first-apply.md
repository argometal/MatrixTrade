# MTA — Schema-first Apply discipline

## Why

AI must not invent Apply JSON. Semantic guesses that look reasonable but fail import destroy trust.

## Rules

1. **Schema-first** — before Apply JSON, copy **Control → MTA Mechanics → Apply schema contract** (or an accepted export example).
2. **Never invent keys** — only fields in the contract / sample / validator feedback.
3. **Stop if contract missing** — deliver conceptual analysis only; do not call it importable JSON.
4. **One validator error ≠ full validation** — re-check the whole object against the contract.
5. **Separate analysis from serialization** — conceptual ticket first, then exact keys.
6. **Layer ownership** — MTAE / Stock File / Scout / Trade stay separate.
7. **Paste payload** — when Apply JSON is requested, deliver one JSON object. The human copies only `{` through `}`. No explanation, Prompt IDs, block IDs, extra Markdown, or comments in that paste. The parser rejects surrounding text — do not wrap the object.
8. **Layered `executionInstruction`** — AI writes share quantities in the sentence (`Buy 1 share at $315. Buy 2 shares at $310. Buy 2 shares at $305.`). `allocationPercent` on `limits[]` is structural. Do not send `plannedQuantity`.

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
