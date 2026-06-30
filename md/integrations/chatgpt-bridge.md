# ChatGPT bridge

## Roles

| Component | Role |
|-----------|------|
| ChatGPT | Reasoning, analysis, recommendations (already knows your style) |
| MatrixTrade export | Live experiment state + Obsidian notes |
| GitHub private repo | Structure, rules, roadmap (`md/`) |
| DataTransfer | Optional private file bridge between devices |

## Export (implemented)

Dashboard → **Copy Full Context for ChatGPT**

Includes:

- Cycle summary (P/L, budget, win rate)
- Open, pending, recent closed trades (numbers)
- Obsidian analysis bodies per trade

Optional: **Copy Context + Question** with default or custom question.

## Import (planned — Phase 3)

ChatGPT responds with structured `MT-IMPORT:v1` → paste on `/import` → preview → save.

See `md/protocols/import-handoff-v1.md`.

## Sync control

You decide what leaves the machine:

- Paste export manually (always works, mobile-friendly)
- GitHub connector reads repo docs (private)
- DataTransfer for file handoff

Nothing auto-sent to OpenAI API.

## Prompt hint for ChatGPT

When saving a trade proposal, respond with `MT-IMPORT:v1` block (when parser exists).  
Until then, export is one-way; you save manually in app/Obsidian.
