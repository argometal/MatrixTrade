# Timeline vs Chronicle (Argus v2)

**Status:** Canonical UX vocabulary (2026-08-07)  
**Related:** [`timeline-vision.md`](timeline-vision.md) · [`event-chronicle-v2.md`](event-chronicle-v2.md) · [`vocabulary-policy.md`](vocabulary-policy.md) · [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md)

---

## Homologated ontology (all levels)

| Level | Reading mode | User label for narrative evidence | Storage |
|-------|--------------|-----------------------------------|---------|
| **Organization** | **Timeline** | **Notes** | `Log` rows linked to org |
| **Project** | **Timeline** | **Notes** | `Log` rows in project scope |
| **Person (Network)** | **Chronicle** | **Notes** | `Log` rows linked to person |
| **Topic** | **Chronicle** (deep) + optional Timeline scan | **Notes** | `Log` / inbox linked to topic |
| **Event** | **Chronicle** + Note composer | **Notes** | Chronicle `Log` rows linked to event |

**Event** is a **binder entity** (case / meeting / incident). It is **not** a Journal type.  
Narrative evidence on an event is a **Note** (`Log`) in the Event **Chronicle**.

```text
Entity binders:  Organization · Project · Person · Topic · Event
Evidence rows:   Note (Log) · Email (InboxItem) · Attachments
Reading modes:   Timeline (glance) · Chronicle (full story)
```

---

## Two reading modes

| Mode | User question | UI | Delivery analog |
|------|---------------|-----|-----------------|
| **Timeline** | What happened, in order, at a glance? | Compact cards, truncated body, type badges | **Quick** PDF |
| **Chronicle** | I need the full story for analysis | Detailed rows, links to source, delete on Notes | **Full** dossier |

**Timeline** is the default on **organizations** and **projects**.

**Chronicle** is the deep view on **topics**, **events**, and **network people**.

---

## Storage vs labels

- Persisted evidence still uses `Log` rows; stream kind may remain `journal` in code.
- **Do not** expose “Journal”, “Log”, or “Records” as primary user labels.
- User-facing label for narrative entries: **Notes**.

Evidence item types in filters: **Email · Notes · Files · Photos**.

---

## Event Signals vs Note Tags

| | Event Signals | Note Tags |
|--|---------------|-----------|
| Stored on | Event entity `linkedTags` | `Log.topics` |
| Purpose | Binder vocabulary | Marks on that evidence row |
| Patterns | **No** — until on a Note | **Yes** — Tags on evidence |

**Bug fixed (2026-08-07):** chronicle Save no longer copies all Event Signals onto every Note (that multiplied Pattern counts).

---

## Deprecation (UI/copy only)

| Deprecated label | Use instead |
|------------------|-------------|
| Records (counts/filters) | Notes |
| Journal / Log / journals (user-facing) | Notes |
| Chronicle tab on org/project | Timeline |
| “Append-only forever” without delete | Soft-delete Note from Chronicle when allowed |

Internal code may keep `journal` as a stream kind until a later refactor.

---

## Click-through (required)

Timeline and Chronicle rows are **not decorative**. Every entry must open the source object:

| Kind | Destination |
|------|-------------|
| Email | `/argus/v2/inbox?selected={inboxId}` |
| Note (journal/log) | `/argus/logs/{logId}` |
| Attachment | `/api/argus/files/{attachmentId}` (inline for photos) |

Builders set `href` on timeline/evidence rows. Chronicle Notes may offer **Delete** (soft-delete via `deleteLogAction`).
