# 07 — Ontology

**Constraint:** Current ontology only. No normalization. Terminology preserved exactly as in sources.

Two documented models coexist (README “Runtime truth”): **v3 runtime** and **v01 target**.

---

## Vocabulary (canonical policy)

From `md/argus/vocabulary-policy.md` (**Status:** Canonical (2026-07-21)):

| Term | Where | Role |
|------|--------|------|
| **Topic** | Entity (`Kind: topic`) | Evidence binder |
| **Tag** | Evidence only (`inbox.topics[]`, `log.topics[]`) | User marks on items; Patterns / filters / Deliver |
| **Alias** | Topic entity (`linkedTags` storage) | Synonyms for matching inbox/search — not Patterns |
| **Signal** | Event entity (`linkedTags` storage) | User-defined event markers; copied to evidence on chronicle save → Patterns |

Nav badge counts are **not** Signals (`vocabulary-policy.md`).

UI: one chip-list editor; copy is Aliases (Topics) or Signals (Events).

---

## Timeline vs Chronicle terminology

From `md/argus/timeline-chronicle-model.md` (**Status:** Canonical UX vocabulary) — see that file for exact definitions. Related: `timeline-vision.md`, `event-chronicle-v2.md`.

---

## v3 runtime entities (`lib/argus/types.ts`)

### Enums / unions

| Name | Values |
|------|--------|
| `EntityType` | `"person" \| "company" \| "project" \| "other"` |
| `JournalKind` | `"log" \| "event" \| "follow_up"` |
| `LogSource` | `"manual" \| "inbox" \| "email" \| "file"` |
| `InboxSource` | `"manual" \| "api" \| "email" \| "file"` |
| `InboxStatus` | `"pending" \| "linked" \| "converted" \| "archived"` |
| `ClassificationStatus` | `"classified" \| "needs_classification"` |
| `AttachmentParentType` | `"inbox" \| "journal"` |
| `EntityLifecycleStatus` | `"active" \| "completed" \| "archived"` |
| `StrategicValue` | `1 \| 2 \| 3 \| 4 \| 5` |
| `RunbookItemType` | `"item" \| "section" \| "sep"` |

### Persisted records

| Record | Key fields (non-exhaustive) |
|--------|-----------------------------|
| `Entity` | `id`, `type`, `name`, `alias?`, `notes`, `strategicValue`, `contactValue?`, `myValue?`, `startDate?`, `endDate?`, `linkedPersonIds?`, `linkedTopicIds?`, `linkedEventIds?`, `linkedEntityIds?`, `linkedTags?`, `lifecycleStatus?`, `createdAt`, `updatedAt`, `deletedAt?` |
| `Log` | `id`, `kind`, `date`, `title`, `body`, `entityIds[]`, `classificationStatus`, `private`, `source`, `attachmentIds[]`, `inboxItemId?`, `followUpDate?`, `topics[]`, timestamps, `deletedAt?` |
| `InboxItem` | `id`, `receivedAt`, `source`, `rawText`, `rawEmail?`, `subject?`, `from?`, `to?`, `attachmentIds[]`, `linkedEntityIds?`, `private?`, `status`, `followUpDate?`, `topics?`, `convertedLogId?`, `createdAt` |
| `Attachment` | `id`, `fileName`, `mimeType`, `createdAt`, `parentType`, `parentId`, `deletedAt?` |
| `Runbook` | id, title, items, timestamps (see `types.ts`) |
| `RunbookProgress` | progress per (runbook × entity) |
| `ArgusData` | `entities`, `logs`, `inboxItems`, `attachments`, `runbooks`, `runbookProgress?`, `version: 3` |

### Derived (not primary store)

| Type | Role |
|------|------|
| `EntityNetworkView` | Relationship view derived from journal |
| `EntityContextSlice` | Time-varying co-mention context |

---

## Reference kinds (`lib/argus/reference-types.ts`)

| Set | Values |
|-----|--------|
| Creatable `ReferenceKind` | `"person" \| "organization" \| "project" \| "topic" \| "event"` |
| Legacy display | `"place" \| "document" \| "other"` |

Mappings:

- Organization → `EntityType` `"company"`
- Topic / Event → `EntityType` `"other"` + `Kind:` prefix in `notes`
- `buildReferenceNotes`, `referenceKindFromNotes`, `entityTypeToReferenceKind`

---

## Relationships (v3 as stored)

| Relationship | Storage |
|--------------|---------|
| Log ↔ Entity | `Log.entityIds[]` |
| Log ↔ Attachment | `Log.attachmentIds[]` + `Attachment.parentType/parentId` |
| Inbox ↔ Entity | `InboxItem.linkedEntityIds[]` |
| Inbox ↔ Attachment | `InboxItem.attachmentIds[]` + Attachment parent |
| Inbox → Log (convert) | `InboxItem.convertedLogId`, `Log.inboxItemId` |
| Entity ↔ Entity (outbound) | `Entity.linkedEntityIds[]` |
| Project ↔ People | `Entity.linkedPersonIds[]` (on project) |
| Project ↔ Topics | `Entity.linkedTopicIds[]` |
| Project ↔ Events | `Entity.linkedEventIds[]` |
| Project/Topic/Event tags field | `Entity.linkedTags[]` (Aliases on topics; Signals on events; also documented on projects) |
| Runbook ↔ Entity progress | `RunbookProgress` |

**Bidirectional mirror of `linkedEntityIds`:** not automatic (actions write source entity only) — see link actions behavior.

**Relationship as first-class persisted object:** not in v3 `ArgusData` (constitution: derived).

---

## v01 target ontology (`md/argus/knowledge-model-v01.md`)

**Status:** Canonical design brief — schema locked (2026-07-04). Phase 1 DDL draft for review.

Core types named in that document: Evidence, Project, Topic, Event, Person, Organization, Tag — with stated Never rules in that file.

Junctions (no arrays) named there: EVIDENCE_PROJECTS, EVIDENCE_TOPICS, EVIDENCE_EVENTS, EVIDENCE_PEOPLE, EVIDENCE_ORGANIZATIONS, EVIDENCE_TAGS, EVENT_PARTICIPANTS.

**Application read path uses v01 tables:** No — DDL draft; model-alignment: not applied / not wired.

---

## Labels / product strings (samples)

From `lib/argus/ux-copy.ts`:

- `ARGUS_PRODUCT_NAME = "ARGUS"`
- `ARGUS_TAGLINE = "Work Tracker"`
- `ARGUS_SUBTITLE = "Track items, documents, and follow-ups."`
- `TOPIC_ALIASES.*` — Aliases copy
- `EVENT_SIGNALS.*` — Signals copy

From `lib/argus/labels.ts`: `ENTITY_TYPE_LABELS`, `JOURNAL_KIND_LABELS`, inbox labels, etc.

---

## Constitution vs UI terminology conflict (Event)

| Source | Statement |
|--------|-----------|
| `argus-architecture.md` | Event / Follow-up are derived concepts; open questions; not approved for redesign |
| `reference-types.ts` + Events browse | Event is a creatable first-class reference kind with dedicated UI |
| `how-argus-works.md` | Lists Event among entity types |

Both retained without resolution in this pack.
