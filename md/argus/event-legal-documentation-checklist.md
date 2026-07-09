# ARGUS — Event legal documentation checklist

**Status:** Product checklist — build in phases  
**Scope:** Events (dated occurrences), not Topics (timeless binders)  
**North star:** Chronological, defensible evidence — who was present, when, where, what was documented — for HR, management, and personal performance record.

---

## What Event is (vs Topic)

| | **Topic** | **Event** |
|---|-----------|-----------|
| Role | Theme / binder over time | Dated occurrence to document |
| Question | What subject ties evidence together? | What happened on this date? |
| Legal use | Secondary (classification) | **Primary** (chronology node) |

---

## Non-negotiables (user requirements)

- [ ] **Link email to event** — base legal evidence; preserved raw ingest
- [ ] **Chronological clarity** — one timeline: emails → notes → photos, sorted by date
- [ ] **Formal tone** — not informal chat; suitable for HR / manager review
- [ ] **Attendees as metrics only** — who was present, not workflow/RSVP
- [ ] **Photos / files** — visible in evidence chain (attachments)
- [ ] **Simple** — no calendar server, no copying Notion/Outlook feature-for-feature
- [ ] **Traceability** — every item links to source (inbox id, log id, file id)

---

## Phase 1 — Basic (implement first)

| # | Item | Done when |
|---|------|-----------|
| 1.1 | Event detail **Record** tab — white writing surface | User can read/write formal notes on the event |
| 1.2 | **Legal purpose** tag: HR · Performance · Incident · General | Purpose stored on event, visible in header |
| 1.3 | **Link email** action from event | Pick inbox email → links to event entity |
| 1.4 | **Chronicle** tab — merged timeline | Emails + journal entries + photo files, newest first |
| 1.5 | **Metrics** tab — attendees + link counts | Names/counts only; no social UI |
| 1.6 | Event date on all new notes from event | `eventDateFromLinkedEntities` behavior surfaced in UI |

---

## Phase 2 — Evidence strength

| # | Item | Done when |
|---|------|-----------|
| 2.1 | Unlink email from event (with confirm) | Correction without delete |
| 2.2 | Upload photo/file scoped to event (via journal or inbox attach) | File appears in chronicle |
| 2.3 | Export event chronicle (PDF/print) | Single printable dossier for HR |
| 2.4 | Private event / sensitive flag | Aligns with `argus-private` unlock |
| 2.5 | Chronicle shows **receivedAt** / **log.date** explicitly | ISO-visible for legal review |

---

## Phase 3 — Reconstruction (Argus-native)

| # | Item | Done when |
|---|------|-----------|
| 3.1 | Procedure / checklist tab on event | Runbook attach for inspections/meetings |
| 3.2 | AI summary: “what is documented?” — evidence-only | No fabrication; cites ids |
| 3.3 | Cross-event chronology for one Topic or Project | Matter-level timeline |
| 3.4 | Audit log of link/unlink actions | Who changed evidence chain |

---

## Explicitly out of scope

- Send/reply/forward email
- Calendar invites, RSVP, recurring events
- Task assignment, due dates, Kanban
- Informal comment threads
- Copying CRM activity feeds

---

## Data model (no schema change v1)

| Field | Storage |
|-------|---------|
| Event record + purpose | `Entity.notes` — `Kind: Event`, `Purpose: hr`, `---`, body |
| Email link | `InboxItem.linkedEntityIds` includes event id |
| Journal | `Log.entityIds` includes event id |
| Photos | `Attachment` on inbox or journal parent |
| Attendees | Derived from linked people + log co-links (read-only metrics) |

---

## Success criteria (HR / manager packet)

1. Open event → see **date**, **purpose**, **formal record**
2. Chronicle lists **emails** (with link to original) and **notes** in time order
3. **Photos** listed with file links
4. **Attendees** section shows who was linked — statistic, not chat
5. User can answer: *who · when · where · what was documented*

---

## Code map (Phase 1)

| Piece | Location |
|-------|----------|
| Record parse/build | `lib/argus/v2/event-record.ts` |
| Evidence timeline | `lib/argus/v2/event-loaders.ts` |
| Detail panel | `app/argus/v2/browse/events/components/V2EventDetailPanel.tsx` |
| Link email modal | `app/argus/v2/browse/events/components/V2EventLinkEmailModal.tsx` |
| Actions | `app/argus/actions.ts` — `updateEventRecordAction`, `linkInboxEmailToEventAction` |

---

*Last updated: 2026-07-09 — Phase 1 in progress*
