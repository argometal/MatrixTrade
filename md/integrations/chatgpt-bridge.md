# ChatGPT bridge

**Start here for handoff context:** [`CHATGPT.md`](../../CHATGPT.md) (repo root)

**Worker URL:** `https://matrixtrade-bridge.argometal.workers.dev`

---

## Roles

| Component | Role |
|-----------|------|
| **ChatGPT** | Analysis, patterns, validated JSON proposals — knows user style |
| **MatrixTrade** | Source of truth: numbers, rules, dashboard (`data/trades.json`) |
| **Cloudflare Worker** | Bridge: snapshot read + inbox queue |
| **Obsidian** | Long-term knowledge: thesis, psychology, lessons |
| **GitHub** | Architecture docs (`md/`), code, private repo |
| **Cursor** | Infrastructure builder only |
| **Vercel** | Optional read-only dashboard from git |

---

## Primary path (active)

### Read state

ChatGPT → `GET /snapshot?token=READ_TOKEN` → analyze H001–H030, P/L, patterns.

### Queue proposals (infra ready, workflow validating)

ChatGPT → validated JSON → `POST /inbox` (Bearer WRITE_TOKEN) → pending queue.

MatrixTrade will process inbox later — **does not write trades today**.

Detail: [`cloudflare-worker-bridge.md`](cloudflare-worker-bridge.md)

---

## Legacy / secondary

| Method | Status |
|--------|--------|
| Dashboard **Copy Full Context** | Works locally — paste into ChatGPT |
| Vercel URL | Read-only dashboard, no Worker sync |
| GitHub connector | Reads repo docs including `CHATGPT.md` |
| LAN / QR / DataTransfer | **Discarded** as primary — network restrictions |

Nothing auto-sent to OpenAI API.

---

## Project goal (not just storage)

Build a **statistical and behavioral base** so ChatGPT can:

- Identify user behavior patterns
- Compare setups across trades
- Measure expectation vs outcome
- Detect repeated errors
- Improve decision-making

Experiment H001–H030, cycle limit -$300, max 30 trades.

---

## Import (future)

Structured `MT-IMPORT:v1` or inbox payload → MatrixTrade preview → user confirms → `data/trades.json` + Obsidian.

See `md/protocols/import-handoff-v1.md`.

**Not implemented:** auto-apply from Worker, POST `/trades`.

---

## Prompt hint for ChatGPT

When user asks to save a trade proposal:

1. Read current state via GET `/snapshot` if URL available.
2. Prepare validated JSON for POST `/inbox` (see `bridge/sample-inbox.json`).
3. Do not assume trades are updated until MatrixTrade confirms.
4. Keep `CHATGPT.md` recommendations — no Supabase/Telegram/LAN as primary fix.
