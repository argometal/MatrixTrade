# Scoped AI access (temporal links)

**Status:** Phase B MVP (2026-07-10).  
**Purpose:** Let any external AI read one Stock Profile and propose inbox blocks — without building a full AI app or exposing the whole fleet.

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
| Create link action | `createScopedAiGrantAction` in `app/actions.ts` |

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
