# Scoped AI access (temporal links)

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
If conflict or ambiguity exists, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
Verify the result.


**Status:** Phase B MVP (2026-07-10).  
**Purpose:** Let any external AI read one Stock Profile and propose inbox blocks — without building a full AI app or exposing the whole fleet.

---

## Production status / blocked

| Field | Value |
|-------|-------|
| **Priority** | **HIGH** |
| **Status** | **ON HOLD / PENDIENTE** — resume ~early August 2026 |
| **Backlog entry** | [building-backlog.md](building-backlog.md) § Scoped AI Grant API |
| **Root cause** | Grant **persistence** on Vercel (Supabase `scoped_ai_grants`) — not API routing/auth |
| **Feature freeze** | Frozen until `stock-case-cloud.sql` confirmed + end-to-end GET verified; still wanted |

**Blocked because:** durable grant storage + manual Supabase/Vercel ops + user-attention testing. No active coding until user break (~3 weeks).

**When resuming:** follow the checklist in [building-backlog.md](building-backlog.md) — SQL → env → seed → create grant (`contextUrl`) → `curl GET /api/matrix/scout/GRANT-xxx`.

---

## Model

```text
Stock Profile page → Create AI access link (24h TTL)
  → human shares /scout-access/{grantId} or context URL
  → AI fetches GET /api/matrix/scout/{grantId}
  → AI returns ONE block (evidence-add | file-update | scout-assessment | decision-update)
  → AI POSTs to /api/matrix/scout/{grantId}/inbox
  → human Apply in /inbox
```

Grant id format: `GRANT-{24-byte-hex}`. Optional `planId` binds one scout episode (still one stock).

### Bootstrap grants (new stock case)

```text
/stock-theses/new → Create AI access link (bootstrap, 24h)
  → GET /api/matrix/scout/{grantId}  (boot package + mechanics)
  → AI discusses setup → stock-case-create block
  → POST /api/matrix/scout/{grantId}/inbox
  → human Apply in /inbox
```

Bootstrap grants (`kind: bootstrap`) accept **only** `stock-case-create`. On Apply:
- Profile created
- `historicalAnalysis[]` → Evidence rows (migration source)
- optional `initialScout` → PLAN-xxx

Public read (no grant): `GET /api/matrix/stock-case/boot`

---

## Allowed proposal types

| Type | Scoped to grant profile |
|------|-------------------------|
| `evidence-add` | Yes — `stockProfileId` + `ticker` must match grant |
| `file-update` | Yes — `id` must match grant `stockProfileId` |
| `scout-assessment` | Yes — `stockFileId` + `ticker` must match grant |
| `decision-update` | Yes — `planId` must match grant `planId` if set; plan must belong to grant profile |

**Forbidden:** `trade-proposal`, `trade-close`, `trade-review`, `trade-update`, `analysis`, playbook changes, other tickers.

---

## Storage

| File | Contents |
|------|----------|
| `data/scoped-ai-grants.json` | Active grants (id, profile, ticker, scopes, expiresAt) |
| `data/market-evidence.json` | Evidence stream (Layer A) |

Grants are validated on every API call. Expired grants return HTTP 401.

---

## Code map

| Piece | Location |
|-------|----------|
| Grant CRUD | `lib/scoped-ai-grants.ts`, `lib/scoped-ai-grants-store.ts` |
| Scoped context loader | `lib/load-scoped-scout-context.ts` |
| Context API | `app/api/matrix/scout/[grantId]/route.ts` |
| Inbox API | `app/api/matrix/scout/[grantId]/inbox/route.ts` |
| Human page | `app/scout-access/[grantId]/page.tsx` |
| Create link action | `createScopedAiGrantAction`, `createBootstrapAiGrantAction` in `app/actions.ts` |
| Boot package | `lib/stock-case-boot.ts`, `GET /api/matrix/stock-case/boot` |

Reuses `lib/ai-context.ts`, `lib/bridge.ts`, and `lib/apply-trading-inbox.ts` — no parallel pipeline.

---

## Security notes

- Grant id is the capability token (unguessable hex).
- No session cookie required for scout APIs (public routes).
- Proposals still require human Apply — never auto-applied.
- Default TTL: 24 hours (`SCOPED_AI_DEFAULT_TTL_HOURS`).

---

## Related

- [stock-profile-design.md](stock-profile-design.md) — evidence + synthesis layers
- [ai-engineering.md](ai-engineering.md) — unified AI block fleet
- [scout-execution-model.md](scout-execution-model.md) — scout vs trade
