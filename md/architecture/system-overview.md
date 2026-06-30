# System overview

## What this system is

A **private investment knowledge base** (MATRIX v2) with a local **experiment engine** (MatrixTrade app) for cycle H001–H030.

## Four layers

```
┌─────────────────────────────────────────────────────────┐
│  ChatGPT — reasoning engine (style + criteria already   │
│            trained; not zero context)                   │
└───────────────────────────┬─────────────────────────────┘
                            │ export / import (you control)
┌───────────────────────────▼─────────────────────────────┐
│  MatrixTrade app — numbers, validation, P/L, rules      │
│  localhost:3000 · mobile via /connect QR                │
└───────────────────────────┬─────────────────────────────┘
                            │ read/write frontmatter
┌───────────────────────────▼─────────────────────────────┐
│  Obsidian vault — vault/Trades/*.md                     │
│  Body = thesis, psychology, lessons (you write)         │
└───────────────────────────┬─────────────────────────────┘
                            │ structure + docs in git
┌───────────────────────────▼─────────────────────────────┐
│  Private GitHub repo — md/, companies/, journal/, …      │
│  Long-term memory · architecture · rules                │
└─────────────────────────────────────────────────────────┘
```

## Responsibilities

| Layer | Owns | Does not own |
|-------|------|--------------|
| App | entry, stop, exit, shares, status, P/L | Qualitative analysis |
| Obsidian body | Tesis, psychology, lessons | Frontmatter numbers |
| Repo `md/` | Architecture, rules, roadmap | Live trade prices |
| Repo data folders | Portfolio, theses, journal (when populated) | Real-time market data |
| ChatGPT | Reasoning, recommendations | Source of truth for numbers |

## Design goal

> ChatGPT thinks. The repo remembers. The app enforces rules.

Nothing public. You choose what syncs to ChatGPT.
