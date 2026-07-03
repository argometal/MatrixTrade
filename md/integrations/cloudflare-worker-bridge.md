# Cloudflare Worker bridge — plan & status

**Purpose:** Bridge between ChatGPT and MatrixTrade without LAN, QR, or DataTransfer.

**Worker URL:** `https://matrixtrade-bridge.argometal.workers.dev`  
**Status:** Deployed. MatrixTrade app **connected** (Sync, Inbox UI, Connect QR).

**Entry point for ChatGPT:** [`CHATGPT.md`](../../CHATGPT.md) (repo root)

**Cost:** $0 — Cloudflare Workers + KV free tier.

---

## Architecture

### Read path (ChatGPT analyzes state)

```text
User → ChatGPT → GET /snapshot?token= → Worker/KV → analysis → User
```

### Write path (proposals — inbox)

```text
User → ChatGPT → validated JSON → POST /inbox → Worker/KV (pending queue)
MatrixTrade (local) → GET /inbox, preview, Apply → data/trades.json + Obsidian
```

### Publish path (app)

```text
MatrixTrade (local) → POST /snapshot → Worker/KV → ChatGPT reads GET /snapshot · phone QR on /connect
```

### Why Worker + KV

- Public HTTPS URL from any device (iPhone, ChatGPT browsing)
- No local network dependency
- Zero cost at current scale
- Clear separation: Worker stores/transits; MatrixTrade owns truth
- Pattern reusable in other projects

### What we are NOT using (primary path)

LAN, localhost, QR, DataTransfer, D1, Supabase, Telegram, Gmail, Drive, paid services.

---

## Endpoints

| Method | Path | Auth | Behavior |
|--------|------|------|----------|
| POST | `/snapshot` | Bearer WRITE_TOKEN | Save experiment snapshot; sets `updatedAt` |
| GET | `/snapshot` | `?token=READ_TOKEN` | Return snapshot or 404 |
| POST | `/inbox` | Bearer WRITE_TOKEN | Queue JSON; adds `id`, `receivedAt`, `status: pending` |
| GET | `/inbox` | `?token=READ_TOKEN` | Return `{ count, items[] }` pending only |
| POST | `/inbox/{id}/ack` | Bearer WRITE_TOKEN | Set `status` to `applied` or `rejected` |

**KV keys:** `snapshot:latest`, `inbox:index`, `inbox:item:{id}`

**Inbox never writes trades.** MatrixTrade applies changes after human review.

---

## Validated checkpoint

| Test | Result |
|------|--------|
| POST `/snapshot` | 200 |
| GET `/snapshot` | 200, H001 AMZN present |
| POST `/inbox` | 201 |
| GET `/inbox` | 200, pending items |
| Wrangler auth | OK |
| Subdomain | `argometal.workers.dev` |

---

## Snapshot payload (minimum)

See [`bridge/sample-snapshot.json`](../../bridge/sample-snapshot.json).

H001 AMZN: entry 240, exit 225.9, stop 230, shares 8, result -112.8.

Obsidian note bodies excluded from v1 snapshot.

---

## Inbox payload (example)

See [`bridge/sample-inbox.json`](../../bridge/sample-inbox.json).

Stored shape:

```json
{
  "id": "uuid",
  "receivedAt": "ISO-8601",
  "status": "pending",
  "payload": { }
}
```

---

## Tokens

| Operation | Secret |
|-----------|--------|
| POST (snapshot, inbox) | WRITE_TOKEN — header `Authorization: Bearer …` |
| GET (snapshot, inbox) | READ_TOKEN — query `?token=…` |

Set via `wrangler secret put`. Local copy: `bridge/.dev.vars` (gitignored).

---

## Deploy

```bat
cd c:\Tools\MatrixTrade\bridge
deploy.bat
```

First-time subdomain: `register-subdomain.bat`

Code: [`bridge/src/index.ts`](../../bridge/src/index.ts)

---

## Phases

| Phase | Status |
|-------|--------|
| 1 Worker + snapshot | Done |
| 1b Worker + inbox endpoints | Done |
| 1c ChatGPT validates inbox in conversation | **Current** |
| 2 MatrixTrade Sync → snapshot | Not started |
| 3 MatrixTrade reads inbox, preview, apply | Not started |

---

## For ChatGPT reading this repo

1. Read [`CHATGPT.md`](../../CHATGPT.md) first every session.
2. Primary read: GET `/snapshot` — not LAN or QR.
3. Primary write (when user asks): POST `/inbox` with validated JSON — not direct trade writes.
4. MatrixTrade is source of truth; you analyze and propose.
5. Cursor builds infrastructure only.
6. Do not propose discarded alternatives unless user explicitly asks.

---

## Related

- [chatgpt-bridge.md](chatgpt-bridge.md)
- [export-context.md](../protocols/export-context.md) — legacy copy-paste
- [mobile-connect.md](mobile-connect.md) — LAN/QR secondary only
