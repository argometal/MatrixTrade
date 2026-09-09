# MTA — Schema-first Apply discipline

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
If conflict or ambiguity exists, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
Verify the result.


## Why

AI must not invent Apply JSON. Semantic guesses that look reasonable but fail import destroy trust.

## Rules

1. **Schema-first** — before Apply JSON, copy **Control → MTA Mechanics → Apply schema contract** (or an accepted export example).
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
