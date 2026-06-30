# Data ownership

Who writes what — never mix responsibilities.

## MatrixTrade app (frontmatter)

The app **owns** and overwrites these fields on save:

```
id, ticker, entry, exit, stop, target, shares, status,
createdAt, closedAt, matrixtrade, mtVersion
```

Do not edit these manually in Obsidian.

## You (note body)

Write in Obsidian only:

- Tesis
- Multi-timeframe
- Psicología
- Lecciones

The app preserves body content on every update.

## Repository `md/`

Architecture, rules, protocols — edited when the **system** changes, not per trade.

## Repository data folders

`portfolio/`, `companies/`, `journal/`, etc. — your long-term knowledge base.  
Version in git when you choose.

## ChatGPT

Produces analysis and recommendations.  
Does **not** write to disk unless you paste MT-IMPORT (future) and confirm.

## Source of truth

| Data | Source of truth |
|------|-----------------|
| Live experiment numbers | MatrixTrade app → vault frontmatter |
| Qualitative trade notes | Obsidian body |
| System rules | `md/` library |
| Long-term theses | `companies/TICKER/thesis.md` |
| Reasoning | ChatGPT (session + your memory) |
