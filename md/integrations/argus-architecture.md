# ARGUS — Architecture (Accepted Decisions)

**Status:** Canonical — accepted constitution  
**Implementation:** v2 shell, inbox, network metrics, and Evidence Vault v1 are **in progress** against this document. New work must not violate these rules.

**Index:** [`md/argus/README.md`](../argus/README.md) · **AI rule:** [`ai-charter.md`](../argus/ai-charter.md)

This is the architecture constitution for ARGUS inside MatrixTrade. Trading and ARGUS share auth only — no shared business logic or data.

---

## Accepted design decisions

| Decision | Rule |
|----------|------|
| **Inbox** | First-class object. Raw capture buffer. Always preserves original content. |
| **Journal** | Single source of truth for facts. |
| **Network** | Always derived from Journal. Never owns data. |
| **Search** | Cross-cutting retrieval. Not part of the data pipeline. |
| **Event / Follow-up** | Derived concepts — not primary user-facing types. Classification inferred from metadata (dates), not chosen upfront. |
| **Inbox raw content** | Immutable. Never modified after receipt. |
| **AI** | Annotates only. Never replaces original content. See [`ai-charter.md`](../argus/ai-charter.md). |

---

## Information flow (canonical)

```text
Capture
   ↓
Inbox (optional — external/async input)
   ↓
Journal Entry (source of truth)
   ↔ Entity (references — may be deferred)
   ↓
Network (derived relationships + context)
   
Search ─── spans Inbox + Journal + Entity + Attachments (+ future annotations)
```

**Not a pipeline stage:** Search, Network, AI annotations.  
**Not downstream of Journal:** Entity is a reference dimension, not a processing step after Journal.

---

## Core objects (persisted)

| Object | Role | First-class? |
|--------|------|--------------|
| **InboxItem** | Unclassified raw input | Yes |
| **Journal Entry** (`Log` in code v3) | Canonical fact | Yes |
| **Entity** | Stable identity (person, company, project, other) | Yes |
| **Attachment** | Binary evidence | Yes |

| Derived (never primary store) | Role |
|---------------------------------|------|
| **Network view** | Relationship intelligence from Journal |
| **Search results** | Query across modules |
| **Event / Follow-up views** | Filtered projections of Journal metadata |
| **Relationship** | Pattern from shared Journal history |
| **Context** | Time-varying association of Entity to role/org/project |

---

## Entity

### Current state (v3)

Journal entries require at least one linked Entity at save time.

### Accepted direction (not implemented)

Do **not** remove the Entity requirement entirely.

Evaluate this workflow:

A Journal Entry may be saved **without an Entity** only if it is explicitly marked:

**Needs Classification**

| State | Meaning |
|-------|---------|
| **Classified** | Linked to one or more Entities |
| **Needs Classification** | Captured fact; entity assignment deferred |

This preserves capture-first while avoiding anonymous, untraceable memories.

Entity assignment may occur later via triage (Journal home, Search, or Inbox conversion).

**Document only.** Server rules and UI remain unchanged until explicitly scheduled.

---

## Event (open — do not redesign yet)

Event is **not** approved for redesign. Define purpose first.

### Open questions

1. **What is an Event?**  
   A dated occurrence? A calendar block? A meeting that happened or will happen?

2. **What differentiates Event from a Log?**  
   Today v3 uses `kind: "event"` and `date` as the occurrence date. A Log uses `date` as the record date. Is that distinction meaningful to the user — or only to the UI?

3. **Should Calendar become a future module?**  
   If Events are primarily forward-looking (meetings, deadlines), a Calendar module may be more honest than overloading Journal types.

### Interim rule

- Event remains in schema v3 as `Log.kind`.
- Do not add Event-specific UI or workflows until these questions are answered in this document.

---

## Follow-up (derived concept)

Follow-up is a Journal Entry with a **reminder date** (`followUpDate` in v3), not a separate object type.

Network surfaces follow-ups via `nextTouch` and upcoming lists — derived from Journal, not stored separately.

Do not ask users to choose “Follow-up” as a type at capture time. Infer from reminder date when present.

---

## Attachments (architecture prep — no implementation)

Attachment parent references are **mandatory before email ingestion**.

### Current gap (v3)

Attachments store `id`, `fileName`, `mimeType`, `createdAt`. Parent linkage exists only as ID arrays on InboxItem or Journal Entry — not on the Attachment record itself.

### Target model (documented, not built)

```text
Attachment
  id
  fileName
  mimeType
  createdAt
  parentType: "inbox" | "journal" | (future: "annotation")
  parentId: string
```

### Rules

- An attachment belongs to exactly one parent at ingest time.
- When Inbox converts to Journal, decide explicitly: **move reference** vs **copy reference** — document choice before building.
- Email ingestion must not create orphan files in `data/argus/files/`.

---

## Entity vs Relationship

ARGUS manages **relationships**, not just entities.

| Concept | Definition |
|---------|------------|
| **Entity** | A stable node: a person, company, project, or other identifiable subject. |
| **Relationship** | The connection **you** have with an Entity — inferred from Journal history. |

Relationships are **derived**, not stored as standalone records.

### What Network computes (derived)

- Last interaction date
- Next touch / open reminders
- Topics discussed
- Co-entities appearing in the same Journal entries (implicit links)
- Evidence pointers (Journal entries, attachments)

### What Entity stores (canonical identity)

- `id`, `type`, `name`, `notes`
- Timestamps

Do not duplicate Journal facts on the Entity record. Relationship strength, history, and narrative live in Journal — Network reads them.

---

## Context (time-varying)

Entities stay stable. **Context** changes over time.

Context is how an Entity relates to organizations, roles, projects, or situations **at a point in time** — extracted from Journal facts, not stored as a fixed field on Entity.

### Example

```text
Mike (Entity — person, stable)
   ↓
2026 — Journal entries link Mike + SLB → context: Mike at SLB
   ↓
2028 — Journal entries link Mike + Exxon → context: Mike at Exxon
```

Mike the Entity does not change identity. What changes is **context**, as revealed by new Journal entries.

### Architectural rule

- Do not hard-code “employer” or “company” on a Person Entity as the source of truth.
- Context emerges from which Entities co-occur in Journal entries and when.
- Future enhancement: explicit Context snapshots as derived or annotated layers — not implemented now.

---

## Module map

| Module | Owns data? | Purpose |
|--------|------------|---------|
| **Inbox** | Yes (raw) | Capture first. Unclassified input. |
| **Journal** | Yes (facts) | Source of truth. Immutable history. |
| **Network** | No | Relationship dashboard from Journal. |
| **Search** | No | Global retrieval. |

Future candidates (not approved): **Calendar** (if Event purpose demands it), **Annotations** (AI overlay).

---

## Future scalability (architecture-only checklist)

| Capability | Ready? | Prerequisite |
|------------|--------|--------------|
| Inbox processing | Partial | Needs Classification workflow documented above |
| Email ingestion | Blocked | Attachment parent refs + raw preservation rules |
| Persistent storage (Vercel) | Not ready | Storage v4 decision — separate from this doc |
| AI summaries | Partial | Annotation layer spec; never rewrite rule |
| MatrixTrade bridge | OK | Keep separate; use Inbox API or export |

---

## What must NOT change

- Four modules: Inbox, Journal, Network, Search
- Journal as single source of truth
- Network derived read-only
- Inbox raw content immutable
- Auth separation from Trading
- Local-first v1 — set **`ARGUS_DATA_DIR`** outside repo ([`argus-storage.md`](argus-storage.md))

---

## What must change before more UX work

| Item | Type |
|------|------|
| Complete this document + design principles | Documentation |
| Resolve Event open questions | Documentation |
| Specify Attachment parent model | Documentation |
| Specify Needs Classification workflow | Documentation |
| Implement any of the above | **Wait** |

---

## Related documents

| Document | Role |
|----------|------|
| [`argus-storage.md`](argus-storage.md) | Persistent storage — `ARGUS_DATA_DIR`, backup, migration |
| [`argus-design-principles.md`](argus-design-principles.md) | Constitution — 10 principles |
| [`argus-chatgpt-handoff.md`](argus-chatgpt-handoff.md) | ChatGPT operational handoff |
| [`vercel-argus-production-handoff.md`](vercel-argus-production-handoff.md) | Production deployment gap |
| [`CHATGPT.md`](../../CHATGPT.md) | Repo entry point |
