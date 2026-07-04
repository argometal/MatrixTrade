# AI Trading Session — handoff (AI-1 + AI-2)

**Status:** Implemented in repo · **Deploy:** push + Vercel redeploy · **DB:** run `supabase/ai-sessions.sql`

MatrixTrade now supports **AI trading assistance** via temporary session tokens. External AI can **read** experiment context and **submit proposals to Inbox only**. All mutations still flow **Inbox → human Apply → Supabase**. AI never receives Supabase or bridge tokens.

---

## Architecture

```
AI Workspace → New AI Trading Session → Bearer token + QR (/api/ai/connect?t=…)
  → GET /api/ai/*     (read: trades, stats, snapshot)
  → POST /api/ai/proposals  → Worker inbox or local inbox
       → /inbox UI → Apply → lib/apply-trading-inbox.ts → Supabase
```

| Layer | Role |
|-------|------|
| **AI session token** | Scoped, TTL, revocable — `mtai_…` prefix |
| **`/api/ai/*`** | Read/write API gated by session (not bridge tokens) |
| **Inbox** | Only write path from AI; no auto-apply |
| **Apply** | Unchanged — human approval required |
| **Worker Sync** | Unchanged — Quick Connect snapshot path still available |
| **ARGUS** | Untouched |

---

## What was added

| Item | Path |
|------|------|
| DB schema | `supabase/ai-sessions.sql` |
| Session CRUD | `lib/ai-session.ts`, `lib/ai-session-types.ts`, `lib/ai-session-crypto.ts` |
| Session store | `lib/ai-session-store/json.ts`, `…/supabase.ts` |
| API auth | `lib/ai-auth.ts` |
| Inbox submit | `lib/ai-inbox-submit.ts` (server-side `BRIDGE_WRITE_TOKEN` or local fallback) |
| Read API | `GET /api/ai/snapshot`, `/trades`, `/trades/[id]`, `/stats` |
| Connect manifest | `GET /api/ai/connect?t=…` |
| Proposals | `POST /api/ai/proposals` |
| UI | `app/components/ai-workspace/AiSessionPanel.tsx` on `/ai-workspace` |
| Server actions | `createAiSessionAction`, `revokeAiSessionAction` in `app/actions.ts` |

### Session scopes (default)

- `read:trades`, `read:stats`, `read:playbook`
- `create:proposal`, `create:review-proposal`

### Proposal types (validated via existing `lib/bridge.ts`)

- `trade-proposal`, `trade-close`, `trade-review`, `analysis`
- **Not implemented:** `journal_entry`, `playbook_update`

### Secrets — never exposed to AI

- `SUPABASE_SERVICE_ROLE_KEY`
- `BRIDGE_WRITE_TOKEN`
- `BRIDGE_READ_TOKEN`

---

## Deploy checklist

### 1. Supabase — create `ai_sessions` table

In Supabase → **SQL Editor**, run:

```
supabase/ai-sessions.sql
```

Required when `TRADES_STORE=supabase` or when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set (session store follows same rule as trades).

### 2. Vercel env (unchanged from cloud-first)

| Variable | Notes |
|----------|-------|
| `TRADES_STORE=supabase` | Reads via `lib/storage.ts` |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Session persistence in prod |
| `BRIDGE_WORKER_URL`, `BRIDGE_WRITE_TOKEN` | Proposals → Worker inbox (preferred) |
| `NEXT_PUBLIC_APP_URL` | Recommended | Production domain for AI session QR (e.g. `https://matrix-trade-theta.vercel.app`). If unset, uses `VERCEL_PROJECT_PRODUCTION_URL` — **never** preview deployment URLs |

If bridge is not configured, proposals fall back to **local inbox** (`data/trading-inbox.json`) — fine for dev, not ideal on Vercel serverless.

### 3. Push + redeploy

After merge to `main`, Vercel production should pick up `/api/ai/*` and the AI Workspace panel.

---

## How to use (human)

1. Log in → **AI Workspace** (`/ai-workspace`).
2. Section **AI Trading Session** → **New AI Trading Session** (set TTL + optional label).
3. Copy **Bearer token** or scan **QR** (opens connect manifest).
4. In your AI tool: `Authorization: Bearer mtai_…` on all `/api/ai/*` calls.
5. Submit proposals with `POST /api/ai/proposals` — response is `status: pending`.
6. Review in **Inbox** → **Apply** as usual.
7. **Revoke** session from AI Workspace when done.

**Legacy path still available:** Quick Connect (Worker snapshot URL + `BRIDGE_READ_TOKEN`) below the session panel — unchanged.

---

## API quick reference

### Auth

```
Authorization: Bearer <session_token>
# or
X-Matrixtrade-Ai-Token: <session_token>
```

Connect (QR): `GET /api/ai/connect?t=<session_token>` → manifest + instructions.

### Read

| Endpoint | Scope |
|----------|-------|
| `GET /api/ai/snapshot` | read:trades, read:stats, read:playbook |
| `GET /api/ai/trades` | read:trades (`?status=open\|closed` optional) |
| `GET /api/ai/trades/{id}` | read:trades |
| `GET /api/ai/stats` | read:stats |

### Write (Inbox only)

```http
POST /api/ai/proposals
Content-Type: application/json
Authorization: Bearer mtai_…

{
  "type": "trade-review",
  "proposal": { … }
}
```

Uses existing inbox payload shape (`type` + `proposal`). Response includes `inboxItemId`, `status: "pending"`, and explicit message that Apply is required.

---

## Smoke test (after deploy)

```bash
# 1. Create session in UI → copy token
TOKEN="mtai_…"
BASE="https://matrix-trade-theta.vercel.app"

# 2. Connect manifest
curl -s "$BASE/api/ai/connect?t=$TOKEN" | jq .

# 3. Read snapshot
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/ai/snapshot" | jq .ok

# 4. Post analysis proposal (example)
curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"type":"analysis","proposal":{"summary":"Smoke test"}}' \
  "$BASE/api/ai/proposals" | jq .

# 5. Confirm item appears in /inbox — do NOT auto-apply in smoke test unless intended
```

---

## Local dev

- Sessions stored in `data/ai-sessions.json` when Supabase is not configured.
- `TRADES_STORE=json` works for reads; proposals use local inbox if Worker not configured.

---

## Not in scope (this PR)

- UI rewrite (only AI Trading Session panel added)
- Apply logic changes
- Worker Sync changes
- Direct Supabase writes from AI
- ARGUS
- `journal_entry` / `playbook_update` proposal types

---

## Related docs

- [`supabase-cloud-first.md`](supabase-cloud-first.md) — trades/playbooks on Supabase
- [`cloudflare-worker-bridge.md`](cloudflare-worker-bridge.md) — legacy Worker snapshot + inbox
- [`ai-workspace-deeplinks.md`](ai-workspace-deeplinks.md) — assistant deep links (research)

---

## Open questions / watch

1. **Production inbox on Vercel** — confirm Worker inbox is configured so proposals persist (not ephemeral local FS).
2. **`ai_sessions` table** — confirm SQL ran in Supabase prod.
3. **E2E with real AI tool** — one full cycle: session → read → propose → Inbox → Apply → Supabase row update.
4. **UX** — two connect paths (AI Trading Session vs Quick Connect); may consolidate later.
5. **QR base URL** — must use production domain (`NEXT_PUBLIC_APP_URL` or `VERCEL_PROJECT_PRODUCTION_URL`). Preview deployment URLs (`…-projects.vercel.app`) redirect to Vercel login when Deployment Protection is on.

**Last updated:** 2026-07-03
