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
Note tab         = composer (textarea + files) — always empty after Save
Save             = append Note (`Log`) linked to event — does **not** stamp Signals onto the Note
Signals tab      = edit Event binder Signals (`linkedTags`) only
Chronicle tab    = buildEntityEvidenceStream (notes, emails, files, photos) + Delete on Notes
```

### Rules

1. **Append by default** — Save creates a `Log` with `entityIds: [eventId]`, dated to the event anchor date. No overwrite of prior entries.
2. **Composer clears** — After Save, textarea resets; next write is a new chronicle line.
3. **Signals on event** — `entity.linkedTags` holds user-defined Signals (any label). They stay on the binder — **not** copied onto every Note (copying all signals inflated Patterns).
4. **No Register on event page** — Link email / inbox still adds evidence to Chronicle. Attachments arrive via Note composer, linked emails, or inbox flow.
5. **Migration** — Legacy text in `entity.notes` is converted once to the first chronicle Note; notes reduced to `Kind: Event` shell. Auto-stamped signal sets on Notes are repaired when the event is opened.
6. **Delete** — Chronicle Notes can be soft-deleted from the Event/Topic/Network chronicle UI (delete auth gate applies).

### Immutability

Prefer append for corrections (new Note). Soft-delete is available when a Note must be removed; destructive delete stays behind Argus delete gates.

---

## Storage

| Field | Role |
|-------|------|
| `Entity.notes` | `Kind: Event\n---` only (metadata shell) |
| `Entity.linkedTags` | User-defined Signals |
| `Log` (linked) | Each composer Save = one chronicle entry |
| Inbox (linked) | Email evidence in Chronicle |

---

## UI

- **Note** tab: composer + **Save** at top (Signals edited on Signals tab)
- **Chronicle**: chronological evidence stream + Delete on Notes
- **Metrics**: Notes / Emails / Photos (unique sources; attachments not double-counted in evidence totals)
- Footer **Register evidence** removed from event detail
- **Files** dropdown on Note tab: choose files or **Ctrl+V** paste; saved with chronicle entry
- Chronicle filter: All · Notes · Emails · Photos · Files
- Global **Register** sheet: same Files dropdown + paste (topics, orgs, projects via entity links)

---

## Attachments (events + Register)

- `V2AttachmentComposer` — collapsible file queue, multi-select, paste
- `attachFilesToLog` — reuses `saveAttachment` + `appendLogAttachment`
- File-only save allowed (body auto: `Attached: filename…`)

- `lib/argus/v2/event-chronicle.ts` — shell notes, migration helpers
- `appendEventChronicleEntryAction` — append log + tags
- `migrateLegacyEventRecordIfNeeded` — one-time notes → log
- `V2EventDetailPanel` — composer UX
