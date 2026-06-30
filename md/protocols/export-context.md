# Export context protocol

Plain text export from MatrixTrade dashboard.

## Trigger

**Copy Full Context for ChatGPT** button on `/`

## Structure

```text
MATRIX TRADE FULL CONTEXT
(numbers + Obsidian analysis — paste into ChatGPT)

MATRIX TRADE SNAPSHOT
Date: YYYY-MM-DD
Cycle: 1

Loss limit: -300.00
Realized P/L: ...
Remaining risk: ...

OPEN TRADES:
...

PENDING ORDERS:
...

CLOSED TRADES:
...

ANALYSIS FROM OBSIDIAN:

H001 AMZN
(thesis, psychology, …)
```

## Variants

| Button | Scope |
|--------|-------|
| Copy Full Context | Open + pending + recent closed + analysis |
| Copy with ALL closed | Full closed history |
| Copy Context + Question | Above + optional question |

## Rules

- Plain text, no HTML
- Numbers from app only (single source of truth)
- Analysis from Obsidian note bodies
- No automatic send — clipboard only

Implementation: `lib/snapshot.ts`
