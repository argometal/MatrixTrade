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
Event entity     = anchor (name, date, shell notes only)
Note tab         = composer (textarea + files) — always empty after Save
Save             = append Note (`Log`) linked to event — does **not** stamp Trackers onto the Note
Trackers         = journal `signalTags` (Home → Tags · Flag a Tag) — not on the Event binder
Chronicle tab    = buildEntityEvidenceStream (notes, emails, files, photos) + Delete on Notes
```

### Rules

1. **Append by default** — Save creates a `Log` with `entityIds: [eventId]`, dated to the event anchor date. No overwrite of prior entries.
2. **Composer clears** — After Save, textarea resets; next write is a new chronicle line.
3. **Trackers** — Flag a Tag on the journal (`ArgusData.signalTags`). Visibly marked (⚑) across Patterns / universe / neighborhoods — **not** copied onto every Note. Event Tags tab: click a Tag chip to Flag / Disable Tracker (chip stays for re-Flag; never deletes Note Tags).
4. **No Register on event page** — Link email / inbox still adds evidence to Chronicle. Attachments arrive via Note composer, linked emails, or inbox flow.
5. **Migration** — Legacy text in `entity.notes` is converted once to the first chronicle Note; notes reduced to `Kind: Event` shell. Former Event binder Signals migrate into `signalTags` (Trackers).
6. **Delete** — Chronicle Notes can be soft-deleted from the Event/Topic/Network chronicle UI (delete auth gate applies).

### Immutability

Prefer append for corrections (new Note). Soft-delete is available when a Note must be removed; destructive delete stays behind Argus delete gates.

---

## Storage

| Field | Role |
|-------|------|
| `Entity.notes` | `Kind: Event\n---` only (metadata shell) |
| `ArgusData.signalTags` | Trackers (Flag a Tag; migrated from legacy Event Signals) |
| `Log` (linked) | Each composer Save = one chronicle entry |
| Inbox (linked) | Email evidence in Chronicle |

---

## UI

- **Note** tab: composer + **Save** at top (Trackers: click Tags on Event Tags tab, or Home → Tags)
- **Tags** tab: evidence Tags + click-to-Flag Tracker (no separate Match-tags / Focus list editor)
- **Chronicle**: chronological evidence stream + Delete on Notes; note body is shown in-list (no link to the legacy phone `/argus/logs` editor)
- **Metrics**: Notes / Emails / Photos (unique sources; attachments not double-counted in evidence totals)
- Footer **Register evidence** removed from event detail
- **Files** dropdown on Note tab: choose files or **Ctrl+V** paste; saved with chronicle entry
- Chronicle filter: All · Notes · Emails · Photos · Files
- Global **Register** sheet: same Files dropdown + paste (topics, orgs, projects via entity links)

### Deprecated (do not remount)

- Phone-width `/argus/logs/[id]` + `ActivityEditPanel` for Event Chronicle note edit — Inbox-converted journals only
- Unused composers removed: `JournalEntryForm`, `MemoryComposer`, `CaptureFab`, `V2OpenCaptureButton`, `AddRegisterCaptureButtons`

---

## Attachments (events + Register)

- `V2AttachmentComposer` — collapsible file queue, multi-select, paste
- `attachFilesToLog` — reuses `saveAttachment` + `appendLogAttachment`
- File-only save allowed (body auto: `Attached: filename…`)

- `lib/argus/v2/event-chronicle.ts` — shell notes, migration helpers
- `appendEventChronicleEntryAction` — append log + tags
- `migrateLegacyEventRecordIfNeeded` — one-time notes → log
- `V2EventDetailPanel` — composer UX
