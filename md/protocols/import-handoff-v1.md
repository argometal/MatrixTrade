# Import handoff v1 (planned)

Structured format for ChatGPT → MatrixTrade. **Not implemented yet** (Phase 3).

## Why structured blocks

- Parse any length
- Language-independent
- No free-text NLP in the app

## MT-IMPORT:v1

```text
MT-IMPORT:v1

[TRADE]
ID=H004
TICKER=AMZN
ENTRY=240.00
STOP=230.00
SHARES=8
STATUS=pending

[ANALYSIS]
THESIS:
Breakout en daily con volumen creciente.

PSYCHOLOGY:
Confianza alta pero evitar sobreposición.

RISK:
Riesgo controlado, R/R 2:1.

[LEARNINGS]
Esperar confirmación previa.

MT-END
```

## MT-UPDATE:v1 (close trade)

```text
MT-UPDATE:v1

[TRADE]
ID=H004
STATUS=closed
EXIT=255.00

MT-END
```

## MT-BATCH:v1 (future)

Multiple `MT-IMPORT` blocks in one paste.

## Save rules

| Block | Saved to |
|-------|----------|
| [TRADE] fields | App frontmatter |
| [ANALYSIS], [LEARNINGS] | Obsidian body |

## UI (planned)

`/import` — paste → preview JSON → confirm

## ChatGPT instruction

When proposing a trade to save, wrap response in `MT-IMPORT:v1` … `MT-END`.
