# Event Chronicle v2

**Status:** Shipped (2026-07-11)  
**Related:** [`timeline-vision.md`](timeline-vision.md) · [`register-capture-redesign.md`](register-capture-redesign.md) · [`evidence-organization-vision.md`](evidence-organization-vision.md)

---

## Problem (v1)

Events mixed two paradigms:

| Piece | Behavior | User expectation |
|-------|----------|------------------|
| **Record tab** | Single editable blob in `entity.notes` | Append-only chronicle entry |
| **Register** | Second modal to create a journal log | Same as Record — redundant |
| **Chronicle** | Read-only linked evidence stream | Unified timeline including notes |

Result: text stayed in Record after save, Register opened another window, Chronicle showed emails but not the user's narrative.

---

## Model (v2)

```
Event entity     = anchor (name, date, linkedTags, shell notes only)
Record tab       = composer (tags + textarea) — always empty after Save
Save             = append journal log linked to event + update linkedTags
Chronicle tab    = buildEntityEvidenceStream (notes, emails, files, photos)
```

### Rules

1. **Append-only** — Save creates a `Log` with `entityIds: [eventId]`, dated to the event anchor date. No overwrite of prior entries.
2. **Composer clears** — After Save, textarea resets; next write is a new chronicle line.
3. **Tags on event** — `entity.linkedTags` holds signal tags (GAP, CONCERN, …). Copied into each appended log's `topics` for pattern detection.
4. **No Register on event page** — Link email / inbox still adds evidence to Chronicle. Attachments arrive via linked emails or inbox flow.
5. **Migration** — Legacy text in `entity.notes` is converted once to the first chronicle log; notes reduced to `Kind: Event` shell.

### Immutability

Chronicle entries are not edited or deleted from the event UI. Corrections are new append entries (audit trail). Destructive delete remains behind existing Argus delete gates elsewhere — not promoted on the event surface.

---

## Storage

| Field | Role |
|-------|------|
| `Entity.notes` | `Kind: Event\n---` only (metadata shell) |
| `Entity.linkedTags` | User-defined signal tags |
| `Log` (linked) | Each composer Save = one chronicle entry |
| Inbox (linked) | Email evidence in Chronicle |

---

## UI

- **Note** tab (was Record): tags + **Save** at top, composer below
- **Chronicle**: chronological evidence stream
- **Metrics**: unchanged counts
- Footer **Register evidence** removed from event detail

---

## Code

- `lib/argus/v2/event-chronicle.ts` — shell notes, migration helpers
- `appendEventChronicleEntryAction` — append log + tags
- `migrateLegacyEventRecordIfNeeded` — one-time notes → log
- `V2EventDetailPanel` — composer UX
