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

**Primary path (planned / in progress):** Cloudflare Worker + KV — MatrixTrade POSTs a snapshot; ChatGPT reads `GET /snapshot?token=…`. See **`md/integrations/cloudflare-worker-bridge.md`**.

Legacy / secondary:

- Paste export manually (works today, mobile-friendly)
- GitHub connector reads repo docs (private)
- Vercel URL for read-only dashboard (no LAN)
- DataTransfer / QR / LAN — secondary only, not architecture

Nothing auto-sent to OpenAI API.

## Prompt hint for ChatGPT

When saving a trade proposal, respond with `MT-IMPORT:v1` block (when parser exists).  
Until then, export is one-way; you save manually in app/Obsidian.
