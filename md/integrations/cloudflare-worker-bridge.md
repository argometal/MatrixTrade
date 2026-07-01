# Cloudflare Worker bridge — plan & status

**Purpose:** Let ChatGPT read MatrixTrade state from a public URL without LAN, QR, DataTransfer, or long copy-paste blocks.

**Status:** Worker code in repo at `bridge/`. **Not connected to MatrixTrade app yet.** Validate Worker in isolation first, then add Sync button.

**Cost:** $0 — Cloudflare Workers + KV free tier.

---

## Architecture (minimal)

```text
MatrixTrade (local PC)
        │  POST /snapshot  + Bearer WRITE_TOKEN
        ▼
Cloudflare Worker + KV  (key: snapshot:latest)
        │  GET /snapshot?token=READ_TOKEN
        ▼
ChatGPT (web browsing) or Safari on iPhone
```

### Roles

| Component | Role |
|-----------|------|
| MatrixTrade | UI, metrics, publishes snapshot on demand |
| Cloudflare Worker | Auth + store/retrieve one JSON blob |
| Cloudflare KV | Persistent storage (`snapshot:latest`) |
| ChatGPT | Reads URL, analyzes trades — no MatrixTrade API |
| Obsidian | Long-term notes (not in v1 snapshot body) |
| GitHub | Repo + this doc; optional deploy trigger later |
| Vercel | Read-only dashboard from git (separate path) |

### What we are NOT using

- LAN / localhost as primary access
- QR codes as primary flow
- DataTransfer
- D1, Supabase, Telegram, Gmail, Google Drive
- Paid services

---

## Endpoints

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| `POST` | `/snapshot` | `Authorization: Bearer WRITE_TOKEN` | Accept JSON body, set/validate `updatedAt`, write to KV |
| `GET` | `/snapshot?token=READ_TOKEN` | query param | Return JSON from KV or `404` if empty |
| `POST` | `/inbox` | `Authorization: Bearer WRITE_TOKEN` | Queue structured JSON; adds `id`, `receivedAt`, `status: pending` |
| `GET` | `/inbox?token=READ_TOKEN` | query param | Return pending inbox items (does not modify trades) |

KV keys: `snapshot:latest`, `inbox:index`, `inbox:item:{id}`

**Flow:** User → ChatGPT → validated JSON → `POST /inbox` → MatrixTrade processes later via `GET /inbox`.

---

## Minimum snapshot payload

Single JSON object (~2–5 KB). MatrixTrade will build this from `data/trades.json`, `data/rules.json`, and computed experiment metrics.

```json
{
  "updatedAt": "2026-06-30T12:00:00.000Z",
  "rules": {
    "cycleLossLimit": -300,
    "maxTrades": 30
  },
  "experiment": {
    "realizedPnL": -112.8,
    "remainingLossBudget": -187.2,
    "closedTrades": 1,
    "wins": 0,
    "losses": 1
  },
  "trades": [
    {
      "id": "H001",
      "ticker": "AMZN",
      "status": "closed",
      "entry": 240,
      "exit": 225.9,
      "stop": 230,
      "shares": 8,
      "result": -112.8,
      "lessons": "Stop executed correctly. No immediate re-entry. Maintain discipline."
    }
  ]
}
```

**v1 excludes:** full Obsidian note bodies (privacy + size). Only structured fields already in JSON (`lessons`, etc.).

---

## Storage choice

| Option | Verdict |
|--------|---------|
| Worker memory | ❌ Stateless — data lost between requests |
| **KV** | ✅ **Use this** — one key, one JSON string |
| D1 | ❌ Overkill for a single blob |
| R2 | ❌ Unnecessary complexity |

---

## Token protection

| Operation | Secret | Where |
|-----------|--------|-------|
| Write (POST) | `WRITE_TOKEN` | Cloudflare secret; header `Authorization: Bearer …` |
| Read (GET) | `READ_TOKEN` | Cloudflare secret; query `?token=…` |

Never commit tokens. Set via `wrangler secret put`.

---

## How ChatGPT reads state

1. **Primary:** User asks ChatGPT (with browsing): *“Read https://WORKER_URL/snapshot?token=READ_TOKEN and analyze H001.”*
2. **Fallback:** Open URL in Safari → copy JSON → paste in ChatGPT.
3. **Not v1:** Custom GPT Actions (requires paid ChatGPT plan).

ChatGPT does **not** maintain a live connection. It reads the **last published snapshot**.

---

## Deploy steps (Worker only)

Folder: `bridge/` (inside this repo).

```bat
cd c:\Tools\MatrixTrade\bridge
call c:\Tools\runtime\env.bat
npm install
npx wrangler login
npx wrangler kv namespace create SNAPSHOT
```

1. Paste KV `id` into `wrangler.toml` (replace `REPLACE_WITH_KV_NAMESPACE_ID`).
2. Set secrets: `npx wrangler secret put WRITE_TOKEN` and `READ_TOKEN`.
3. Deploy: `npx wrangler deploy`.
4. Note URL: `https://matrixtrade-bridge.<account>.workers.dev`

### Test POST

```powershell
curl.exe -X POST "https://WORKER_URL/snapshot" `
  -H "Authorization: Bearer WRITE_TOKEN" `
  -H "Content-Type: application/json" `
  --data-binary "@sample-snapshot.json"
```

Expected: `200` → `{"ok":true,"updatedAt":"..."}`

### Test GET

```bash
curl "https://WORKER_URL/snapshot?token=READ_TOKEN"
```

Expected: `200` → full snapshot JSON with H001.

Before first POST: `404` → `{"error":"No snapshot published yet"}`

---

## Implementation phases

| Phase | What | Status |
|-------|------|--------|
| 1 | Worker + KV + tokens (isolated) | Code ready — deploy & curl test |
| 2 | MatrixTrade script or **Sync to bridge** button | Not started |
| 3 | Optional: auto-sync after trade close | Not started |

**Checkpoint success:** iPhone opens GET URL → sees H001 AMZN JSON → ChatGPT interprets it without localhost.

---

## Risks

| Risk | Mitigation |
|------|------------|
| ChatGPT fails to fetch URL | Copy-paste fallback |
| Stale data | Manual sync after changes; `updatedAt` in payload |
| Token in URL leaked | Rotate READ_TOKEN; private repo for docs |
| Obsidian thesis not in snapshot | By design in v1; expand payload later if needed |
| Vercel cannot POST to Worker | Sync from local MatrixTrade only |

---

## Related docs

- [chatgpt-bridge.md](chatgpt-bridge.md) — roles, export, sync policy
- [export-context.md](../protocols/export-context.md) — current copy-paste format (legacy until bridge live)
- [mobile-connect.md](mobile-connect.md) — LAN/QR (secondary, not primary)

---

## For ChatGPT reading this repo

When assisting the user on MatrixTrade + ChatGPT handoff:

1. **Primary path going forward:** Cloudflare Worker URL with snapshot JSON — not LAN or QR.
2. **MatrixTrade app** publishes state; **you** analyze it when the user shares the GET URL or pasted JSON.
3. **Trade decisions** stay between user and ChatGPT — Cursor only builds infrastructure.
4. **Do not** propose Supabase, Telegram, D1, or local-network solutions unless the user explicitly asks.
