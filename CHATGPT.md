# MatrixTrade — context for ChatGPT

Read this file first when assisting on MatrixTrade.

**Repo:** `github.com/argometal/MatrixTrade`  
**Full doc library:** [`md/README.md`](md/README.md)

---

## Current objective

| | |
|---|---|
| **Objective** | Worker + KV isolated |
| **Phase** | Phase 1 — **done** (deploy validated) |
| **Next action** | Pass GET URL to ChatGPT; then Phase 2 Sync button |
| **Stop condition** | ChatGPT can successfully consume the snapshot URL ✓ |

---

## Active plan: ChatGPT handoff (Cloudflare Worker)

**Canonical document:** [`md/integrations/cloudflare-worker-bridge.md`](md/integrations/cloudflare-worker-bridge.md)

**Worker code:** [`bridge/`](bridge/) (Cloudflare Worker + KV — not connected to app yet)

### Goal

MatrixTrade publishes a JSON snapshot to a Cloudflare Worker. ChatGPT reads it from a URL — no LAN, no QR, no DataTransfer, $0 cost.

### Architecture

```text
MatrixTrade (local)  --POST /snapshot-->  Cloudflare Worker + KV
ChatGPT / iPhone     --GET  /snapshot?token=-->  same Worker
```

### Endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/snapshot` | `Authorization: Bearer WRITE_TOKEN` |
| GET | `/snapshot?token=READ_TOKEN` | query param |

KV key: `snapshot:latest`

### Snapshot payload (minimum)

JSON with: `updatedAt`, `rules`, `experiment` (P/L, budget, wins/losses), `trades[]` (id, ticker, status, entry, exit, stop, shares, result, lessons).

Example trade: **H001 AMZN** — entry 240, exit 225.9, 8 shares, result -112.8.

Obsidian note bodies are **not** in v1 snapshot.

### Status (phases)

| Phase | Status |
|-------|--------|
| 1. Worker + KV isolated | **Done** — `https://matrixtrade-bridge.argometal.workers.dev` |
| 2. MatrixTrade Sync button | Not started |
| 3. Auto-sync on trade close | Not started |

### What NOT to propose

LAN, localhost, QR as primary, DataTransfer, D1, Supabase, Telegram, Gmail, Drive, paid services — unless user explicitly asks.

### Roles

| Component | Role |
|-----------|------|
| MatrixTrade | UI, dashboard, metrics, publish snapshot |
| Obsidian | Thesis, psychology, lessons (local vault) |
| GitHub | Versioning, this documentation |
| ChatGPT | Analysis and decisions — not infrastructure |
| Cursor | Builder only |
| Vercel | Read-only dashboard from git (optional) |

---

## App checkpoint (done)

- Trades in `data/trades.json` (H001 AMZN committed)
- Local: `start.bat` → http://localhost:3000
- Vercel: read-only deploy from main branch

---

## Key files

| Path | Contents |
|------|----------|
| [`md/integrations/cloudflare-worker-bridge.md`](md/integrations/cloudflare-worker-bridge.md) | Full bridge plan, deploy, curls, risks |
| [`md/integrations/chatgpt-bridge.md`](md/integrations/chatgpt-bridge.md) | ChatGPT roles and sync policy |
| [`bridge/src/index.ts`](bridge/src/index.ts) | Worker implementation |
| [`data/trades.json`](data/trades.json) | Structured trades (H001) |
| [`data/rules.json`](data/rules.json) | Cycle limits, Obsidian paths |
