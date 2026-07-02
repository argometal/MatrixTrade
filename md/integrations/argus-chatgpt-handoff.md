# ARGUS — ChatGPT handoff

**Read first:** [`argus-architecture.md`](argus-architecture.md) · [`argus-design-principles.md`](argus-design-principles.md)  
**Then:** [`CHATGPT.md`](../../CHATGPT.md) (repo root).

ARGUS is the private professional journal inside MatrixTrade. Trading and ARGUS share only auth infrastructure — **do not mix business logic**.

**UX implementation is frozen** until architecture documents are complete.

---

## Core rule

| View | Role |
|------|------|
| **Journal** | Source of truth — all logs, events, follow-ups, attachments, inbox conversions |
| **Network** | Read-only relationship view derived from Journal — never duplicate logs |

Everything starts in **Journal**. Network only interprets linked entities.

---

## Terminology

| Term | Meaning |
|------|---------|
| **Entity** | person / company / project / other |
| **Log** | Journal item — something that happened (kind: `log`) |
| **Event** | Derived view — dated occurrence; purpose under review (see architecture doc) |
| **Follow-up** | Derived view — entry with reminder date; not a user-facing type at capture |
| **Relationship** | Derived from Journal history — not a stored object |
| **Context** | Time-varying association (e.g. person + company at a point in time) — derived from Journal |
| **Attachment** | File stored under `data/argus/files/` |
| **InboxItem** | Unclassified input awaiting conversion |

---

## Local URLs

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/argus/login` | ARGUS login |
| `/argus/journal` | Journal home (+ New, recent logs/events/follow-ups) |
| `/argus/network` | Entity relationships (last interaction, next touch, topics) |
| `/argus/inbox` | Pending inbox items |
| `/argus/search` | Search entities + journal |
| `/argus/new` | New journal entry |

Trading stays at `/`, `/trades`, `/connect` — separate login at `/login`.

---

## Environment variables (`.env.local`)

```env
ARGUS_PASSWORD=...
ARGUS_PRIVATE_PIN=...          # optional — private journal items
ARGUS_INBOX_TOKEN=...          # POST /api/argus/inbox only
```

Legacy names still work: `HEALTH_VAULT_PASSWORD`, `HEALTH_VAULT_SECRET`.

---

## Data storage

Set **`ARGUS_DATA_DIR`** in `.env.local` to keep all user data outside the repository.  
Full layout, migration, backup: [`argus-storage.md`](argus-storage.md)

| Path | In git? |
|------|---------|
| `{ARGUS_DATA_DIR}/journal.json` | **No** — never commit user data |
| `{ARGUS_DATA_DIR}/files/` | **No** |

Default when `ARGUS_DATA_DIR` unset: `{repo}/data/argus/` (legacy, gitignored).

Schema version **3**: `entities`, `logs`, `inboxItems`, `attachments`.

Auto-migrates from old Health Vault / entries-contacts format on first read.

---

## Inbox API (write-only)

**Endpoint:** `POST /api/argus/inbox`  
**Auth:** `Authorization: Bearer ARGUS_INBOX_TOKEN` or header `X-Argus-Inbox-Token`  
**Response only:** `{ "ok": true, "inboxItemId": "..." }`  
**No read/list/update/delete** on this endpoint.

### JSON body

```json
{
  "text": "Met with Jane about project Alpha.",
  "subject": "Optional subject",
  "from": "jane@example.com",
  "to": "me@example.com",
  "rawEmail": "Full raw RFC822 or pasted email — preserved unchanged",
  "source": "api"
}
```

`source`: `manual` | `api` | `email` | `file` (auto-inferred if omitted).

Requires `text` **or** `rawEmail`.

### curl example (local)

```bash
curl.exe -X POST "http://localhost:3000/api/argus/inbox" ^
  -H "Authorization: Bearer YOUR_ARGUS_INBOX_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"text\":\"Quick note from phone\",\"source\":\"api\"}"
```

### User workflow after POST

1. Open `/argus/inbox` — item appears as **pending**
2. Open item — raw email preserved in collapsible block
3. Assign one or more **entities** (or create new)
4. Convert to **log / event / follow-up**
5. Original InboxItem stays with `status: converted` — not deleted

---

## Journal entry rules

**Current (v3 code):** Every log must link to at least one entity.

**Accepted direction (not implemented):** Entries without entities may exist only as **Needs Classification**. See [`argus-architecture.md`](argus-architecture.md).

- Inbox items may be unlinked until conversion
- `rawEmail` is never overwritten during conversion
- Private items hidden until `ARGUS_PRIVATE_PIN` unlocked on Journal home

---

## Network view (for ChatGPT analysis)

When user asks about relationships, read from Journal via Network concepts:

- **Relationship** — derived pattern of interaction, not a contact record
- **Last interaction** — latest log date per entity
- **Next touch** — nearest reminder date on journal entries
- **Topics** — tags on journal entries, aggregated per entity
- **Context** — co-occurring entities over time (e.g. Mike + SLB in 2026, Mike + Exxon in 2028)
- Person ↔ company links emerge through **shared logs**, not hard-coded employer fields

Do **not** implement cadence/Fibonacci engine yet.

---

## Code map

| Path | Contents |
|------|----------|
| `app/argus/` | UI + server actions |
| `lib/argus/types.ts` | Entity, Log, InboxItem models |
| `lib/argus/server-storage.ts` | Disk I/O + legacy `data/health-vault/` migration |
| `lib/argus/storage/` | `ARGUS_DATA_DIR`, paths, boot migration |
| `lib/argus/network.ts` | Network view (read-only) |
| `app/api/argus/inbox/route.ts` | Write-only inbox receiver |
| `lib/auth/require-session.ts` | Server-side session guards (trading layout) |

---

## What ChatGPT should NOT do

- Do not write trades or modify `data/trades.json` without user approval
- Do not merge ARGUS into trading UI
- Do not summarize or replace `rawEmail` on inbox items
- Do not assume ARGUS data exists on Vercel (local disk only)
- Do not add AI, dashboards, or Oil & Gas terminology

---

## Cloudflare Worker bridge (Trading — separate)

Trading ChatGPT bridge remains at `https://matrixtrade-bridge.argometal.workers.dev`  
See [`cloudflare-worker-bridge.md`](cloudflare-worker-bridge.md) for `/snapshot` and `/inbox` (trading proposals — **not** ARGUS inbox).

ARGUS inbox is **local app API** (`POST /api/argus/inbox`), not the Cloudflare Worker.
