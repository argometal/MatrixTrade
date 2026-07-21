# Timeline vs Chronicle (Argus v2)

**Status:** Canonical UX vocabulary  
**Related:** [`timeline-vision.md`](timeline-vision.md) · [`event-chronicle-v2.md`](event-chronicle-v2.md) · [`vocabulary-policy.md`](vocabulary-policy.md)

---

## Two reading modes

| Mode | User question | UI | Delivery analog |
|------|---------------|-----|-----------------|
| **Timeline** | What happened, in order, at a glance? | Compact cards, truncated body, type badges | **Quick** PDF |
| **Chronicle** | I need the full story for analysis | Detailed rows, links to source (inbox, notes, attachments) | **Full** dossier |

**Timeline** is the default on **organizations** and **projects** (activity rail + Timeline tab).

**Chronicle** is the deep view on **topics** and **events** (full evidence stream, filters, composer on events).

---

## Storage vs labels

- Persisted evidence still uses `Log` rows and `kind: "journal"` in the evidence stream API.
- **Do not** expose “Journal”, “Log”, or “Records” as primary user labels.
- User-facing label for narrative entries: **Notes** (append-only on events; linked notes on topics).

Evidence item types in filters: **Email · Notes · Files · Photos** (files and photos are email/journal attachments).

---

## Deprecation (UI/copy only)

| Deprecated label | Use instead |
|------------------|-------------|
| Records (counts/filters) | Notes |
| Journal / Log (user-facing) | Notes |
| Chronicle tab on org/project | Timeline |

Internal code may keep `journal` as a stream kind until a later refactor.
