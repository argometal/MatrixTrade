# ARGUS — ChatGPT handoff

**Architecture review pack (`main` only — start here):** [`../argus-review/00-PUBLIC-STATUS.md`](../argus-review/00-PUBLIC-STATUS.md)  
**Evidence Engine mechanics:** [`../argus/evidence-engine-mechanics.md`](../argus/evidence-engine-mechanics.md)  
**Deprecated handoffs:** [`../argus/DEPRECATED-HANDOFFS.md`](../argus/DEPRECATED-HANDOFFS.md)

**Deprecated:** feature-branch / draft-PR / screenshot URL handoffs for architecture review.  
**Deprecated as live architecture:** `11-behavioral-evaluation-review.md` (historical inventory only).

**Read first:** [`evidence-engine-mechanics.md`](../argus/evidence-engine-mechanics.md) · [`ai-charter.md`](../argus/ai-charter.md) · [`argus-architecture.md`](argus-architecture.md) · [`argus-design-principles.md`](argus-design-principles.md)  
**Doc index:** [`README.md`](../argus/README.md) — reading order, runtime truth, mobile QA  
**Export / delivery:** [`export-delivery-handoff.md`](../argus/export-delivery-handoff.md)  
**Then:** [`CHATGPT.md`](../../CHATGPT.md) (repo root).

ARGUS is the private professional **Evidence Engine** inside MatrixTrade. Trading and ARGUS share only auth infrastructure — **do not mix business logic**.

**UX implementation follows** [`argus-architecture.md`](argus-architecture.md) and [`argus-design-principles.md`](argus-design-principles.md). See [`README.md`](../argus/README.md) for current routes and status.

---

## Core rule

| View | Role |
|------|------|
| **Evidence (journal / inbox)** | Source of truth — logs, events, follow-ups, attachments, inbox |
| **Network** | Derived retrieval — status vocabulary + linked evidence; never duplicate logs as scores |

Everything starts as **evidence**. Network only interprets linked entities.

---

## Evidence Engine (short)

| Question | Answer |
|----------|--------|
| Who needs attention? | Status: New / Active / Dormant / Lost / Archived |
| What keeps recurring? | Tag Patterns on evidence only |
| What needs triage? | Nav counts (inbox / follow-ups / classification) |
| Event Signals | Marks on event binder → Tags on chronicle Save → then Patterns |

Do **not** invent strength%, outcomeScore, org Trust/Future, or a Behavior Engine.

---

## Terminology

| Term | Meaning |
|------|---------|
| **Entity** | person / company / project / other |
| **Log** | Journal item — something that happened (kind: `log`) |
| **Event** | Case binder entity and/or dated occurrence |
| **Follow-up** | Entry with reminder date |
| **Relationship status** | Derived Network vocabulary — not a stored score |
| **Tag / Pattern** | Marks on evidence; Patterns = recurrence of Tags |
| **Signal (Event)** | Binder mark — not a Pattern until on evidence |
| **Alias (Topic)** | Match vocabulary — never a Pattern |
| **Attachment** | File stored under `data/argus/files/` |
| **InboxItem** | Unclassified input awaiting conversion |

---

## Primary URLs (v2)

| URL | Purpose |
|-----|---------|
| `/argus/login` | ARGUS login |
| `/argus/v2` | Home |
| `/argus/v2/inbox` | Inbox triage |
| `/argus/v2/browse/network` | People — status vocabulary |
| `/argus/v2/network/[id]` | Person contact |
| `/argus/v2/organizations/[id]` | Organization |
| `/argus/v2/browse/topics` · `/argus/v2/browse/events` | Topics / Events |
| `/argus/v2/deliver` | Export Center |
| `/argus/v2/help` | In-app help |

Legacy `/argus/journal`, `/argus/network` may redirect — prefer v2.

Trading stays at `/`, `/trades`, `/connect` — separate login at `/login`.

---

## Environment variables (`.env.local`)

```env
ARGUS_PASSWORD=...
# optional legacy alias:
# HEALTH_VAULT_PASSWORD=...
```

See [`argus-storage.md`](argus-storage.md) for `ARGUS_DATA_DIR` / Supabase.

---

## Hard rules for ChatGPT

1. Use **main** pack URLs only for architecture.  
2. Facts before opinions — every conclusion traceable to evidence.  
3. People are never reduced to scores.  
4. Human Apply always — never auto-write Argus data from chat.  
5. If a handoff contradicts code or `evidence-engine-mechanics.md`, **code + mechanics win**.
