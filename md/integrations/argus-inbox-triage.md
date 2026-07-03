# ARGUS Inbox Triage — P1

**Status:** Implemented (local storage)  
**Scope:** Inbox linking and conversion only — no UI redesign, no Worker changes, no Supabase migration.

---

## Problem

Email intake delivered messages to Inbox, but items stayed isolated. There was no structured way to link an email to a **Reference** (project, topic, person, etc.) before turning it into a useful journal record.

---

## Reference model

**Reference** is the generic grouping object in ARGUS UI. It maps to persisted **Entity** rows (no schema migration):

| Reference type (UI) | Stored as |
|---------------------|-----------|
| Person | `Entity.type = person` |
| Organization | `Entity.type = company` |
| Project | `Entity.type = project` |
| Topic | `Entity.type = other` + `Kind: Topic` in notes |
| Document | `Entity.type = other` + `Kind: Document` in notes |
| Other | `Entity.type = other` |

Examples (not special types — just references):

| Reference name | Type |
|----------------|------|
| Handover Suriname 2026 | Project |
| 2026 Performance Review | Topic |
| G11 Promotion Evidence | Project |
| Manager Alignment | Topic |

---

## Inbox statuses

| Status | Meaning |
|--------|---------|
| **Pending** | Received, not linked |
| **Linked** | Linked to one or more references |
| **Converted** | Journal record created (`convertedLogId`) |
| **Archived** | Dismissed; raw content preserved |

Original email fields are **never deleted** on convert: `rawText`, `rawEmail`, attachments remain on the InboxItem.

---

## User flow

```text
Email → Inbox (pending)
    ↓
Review item detail
    ↓
┌───────────────────────────────────────┐
│ Link to reference    (existing Entity) │
│ Create reference     (Project/Topic/…) │
│ Convert to record    (Journal + links) │
│ Archive                               │
└───────────────────────────────────────┘
    ↓
Linked (optional) → Converted (optional)
```

### Link only

- Adds IDs to `InboxItem.linkedEntityIds`
- Sets status → **linked**
- Preserves raw email and attachments
- Does not create a journal entry

### Convert to record

- Opens the same capture sheet used for inbox conversion
- Pre-fills title/body from email
- Pre-selects already-linked references
- Creates a **Log** with `inboxItemId` provenance
- Moves attachment parent to journal
- Sets status → **converted**

### Archive

- Sets status → **archived**
- Content remains readable

---

## Data fields (InboxItem)

| Field | Role |
|-------|------|
| `subject`, `from`, `to`, `receivedAt`, `rawText` | Email metadata |
| `rawEmail` | Full preserved payload |
| `attachmentIds` | Linked files |
| `linkedEntityIds` | References linked to this inbox item |
| `convertedLogId` | Journal entry if converted |
| `status` | `pending` \| `linked` \| `converted` \| `archived` |

---

## Code map

| Area | Path |
|------|------|
| Types | `lib/argus/types.ts` |
| Reference kinds | `lib/argus/reference-types.ts` |
| Storage | `lib/argus/server-storage.ts` — `linkInboxToEntities`, `convertInboxToLog` |
| Actions | `app/argus/actions.ts` — `linkInboxAction`, `convertInboxAction`, `archiveInboxAction` |
| Inbox list | `app/argus/(app)/inbox/page.tsx` |
| Inbox detail + triage | `app/argus/(app)/inbox/[id]/page.tsx`, `InboxTriagePanel.tsx` |
| Copy | `lib/argus/ux-copy.ts` — `INBOX.*` |

---

## Email intake (unchanged)

Worker → `POST /api/argus/email-inbox` → `createInboxItem` still creates **pending** items. Triage happens in the UI after delivery.

See also: [`argus-email-routing-final.md`](argus-email-routing-final.md), [`argus-email-inbox.md`](argus-email-inbox.md).

---

## Next (out of scope for P1)

- Cloud-first storage (Supabase + R2) — [`argus-cloud-first-audit.md`](argus-cloud-first-audit.md)
- Worker / Email Routing changes
- UI redesign
