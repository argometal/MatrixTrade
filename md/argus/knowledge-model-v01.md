# ARGUS Knowledge Model Refactor v01

**Status:** Canonical design brief — **schema locked** (2026-07-04). Phase 1 DDL draft for review.

**AI rule of construction:** [`ai-charter.md`](ai-charter.md) — facts before opinions; evidence before conclusions.

**Objective:** Refactor the current data model into a single, consistent knowledge architecture that behaves like a graph, not a folder hierarchy.

---

## Design principles

1. Every concept has exactly one responsibility.
2. Every piece of information exists only once.
3. Relationships create organization — not duplication.
4. Metadata never replaces domain objects.
5. The model must support future graph queries.

---

## Core ontology

| Entity | Responsibility | Never |
|--------|----------------|-------|
| **Evidence** | Stored artifact (note, email, file, photo, document, …); editable in v01 | Owns or duplicates domain objects |
| **Project** | Temporary work with objective and lifecycle | Owns Evidence |
| **Topic** | Permanent knowledge domain | Contains copies of Evidence |
| **Event** | Something that happened at a point in time | Stores note body (generates Evidence instead) |
| **Person** | A human | Be a tag or topic |
| **Organization** | A company, institution, team | Be a tag or topic |
| **Tag** | Lightweight workflow/filter metadata | Be knowledge or a category |

### Tags vs Topics

| | Topic | Tag |
|---|-------|-----|
| Lifespan | Permanent | Removable without changing meaning |
| Question answered | “What is this about?” | “How do I process this?” |
| Examples | Trading, SQL, Psychology | urgent, draft, review, waiting |

---

## Entity Relationship Diagram (ERD)

Agree on this schema before writing migration code.

```mermaid
erDiagram
  EVIDENCE {
    uuid id PK
    text evidence_type "note|email|pdf|photo|voice|file|…"
    text title
    text body
    timestamptz captured_at
    text source "manual|email|api|file|…"
    boolean private
    text storage_key "nullable — binary in object storage"
    text mime_type "nullable"
    timestamptz follow_up_at "nullable"
    timestamptz created_at
    timestamptz updated_at
  }

  TOPIC_TAG_REVIEW_QUEUE {
    uuid id PK
    text raw_string "from legacy log.topics[]"
    text status "pending|resolved_topic|resolved_tag|dismissed"
    uuid evidence_id FK "nullable during migration"
    text legacy_log_id "nullable during migration"
    uuid resolved_topic_id FK "nullable"
    uuid resolved_tag_id FK "nullable"
    timestamptz reviewed_at "nullable"
    timestamptz created_at
  }

  PROJECT {
    uuid id PK
    text name
    text objective
    text status "active|paused|completed|archived"
    date start_date
    date end_date "nullable"
    uuid owner_person_id FK "nullable"
    uuid owner_organization_id FK "nullable"
    timestamptz created_at
    timestamptz updated_at
  }

  PROJECT_MILESTONE {
    uuid id PK
    uuid project_id FK
    text title
    date target_date "nullable"
    text status
    int sort_order
  }

  TOPIC {
    uuid id PK
    text name UK
    text description "nullable"
    timestamptz created_at
  }

  EVENT {
    uuid id PK
    text name
    timestamptz occurred_at
    text location "nullable"
    interval duration "nullable"
    timestamptz created_at
  }

  PERSON {
    uuid id PK
    text name
    text alias "nullable"
    text notes "nullable"
    int strategic_value "1-5, nullable"
    uuid organization_id FK "nullable — primary affiliation"
    timestamptz created_at
    timestamptz updated_at
  }

  ORGANIZATION {
    uuid id PK
    text name
    text alias "nullable"
    text notes "nullable"
    int strategic_value "1-5, nullable"
    timestamptz created_at
    timestamptz updated_at
  }

  TAG {
    uuid id PK
    text name UK "canonical lowercase slug + display name"
    timestamptz created_at
  }

  EVIDENCE_PROJECTS {
    uuid evidence_id FK
    uuid project_id FK
  }

  EVIDENCE_TOPICS {
    uuid evidence_id FK
    uuid topic_id FK
  }

  EVIDENCE_EVENTS {
    uuid evidence_id FK
    uuid event_id FK
    text role "generated_from|related"
  }

  EVIDENCE_PEOPLE {
    uuid evidence_id FK
    uuid person_id FK
    text role "mentioned|author|participant"
  }

  EVIDENCE_ORGANIZATIONS {
    uuid evidence_id FK
    uuid organization_id FK
    text role "mentioned|subject"
  }

  EVIDENCE_TAGS {
    uuid evidence_id FK
    uuid tag_id FK
  }

  EVENT_PARTICIPANTS {
    uuid event_id FK
    uuid person_id FK
    text role "attendee|host|speaker"
  }

  EVIDENCE ||--o{ EVIDENCE_PROJECTS : "linked via"
  PROJECT ||--o{ EVIDENCE_PROJECTS : "linked via"

  EVIDENCE ||--o{ EVIDENCE_TOPICS : "classified under"
  TOPIC ||--o{ EVIDENCE_TOPICS : "includes"

  EVIDENCE ||--o{ EVIDENCE_EVENTS : "generated from"
  EVENT ||--o{ EVIDENCE_EVENTS : "produces"

  EVIDENCE ||--o{ EVIDENCE_PEOPLE : "mentions"
  PERSON ||--o{ EVIDENCE_PEOPLE : "appears in"

  EVIDENCE ||--o{ EVIDENCE_ORGANIZATIONS : "mentions"
  ORGANIZATION ||--o{ EVIDENCE_ORGANIZATIONS : "appears in"

  EVIDENCE ||--o{ EVIDENCE_TAGS : "filtered by"
  TAG ||--o{ EVIDENCE_TAGS : "applied to"

  EVENT ||--o{ EVENT_PARTICIPANTS : "has"
  PERSON ||--o{ EVENT_PARTICIPANTS : "attends"

  PERSON }o--|| ORGANIZATION : "may belong to"
  PROJECT }o--o| PERSON : "owned by"
  PROJECT }o--o| ORGANIZATION : "owned by"
  PROJECT ||--o{ PROJECT_MILESTONE : "has"
```

### Relationship rules (from brief)

| From | Relationship | To |
|------|--------------|-----|
| Evidence | may reference | Project, Topic, Event, Person, Organization, Tag |
| Project | relates to | Evidence (junction only) |
| Topic | relates to | Evidence (junction only) |
| Event | generates | Evidence |
| Person | participates in | Event |
| Organization | contains | Person |

**No arrays on Evidence or domain tables for relationships.** All many-to-many via junction tables.

---

## UI invariant

The same Evidence row appears in every view through joins — never copied:

- Project → Matrix → `evidence_projects`
- Topic → Trading → `evidence_topics`
- Person → John → `evidence_people`
- Event → Weekly Review → `evidence_events`
- Tag → urgent → `evidence_tags`

### Project page (v01 initial cutover)

Shows **only** Evidence directly linked via `argus_evidence_projects`. Smart filters (people, tags, date range) are deferred.

---

## Current model → target mapping

Today (`lib/argus/types.ts`, JSON + partial Supabase inbox):

| Current | Target | Migration note |
|---------|--------|----------------|
| `Log` | `evidence` where `evidence_type = note` (or mapped type) | Body/title/date/source migrate; `kind` split out |
| `InboxItem` | `evidence` where `evidence_type = email` | Stop parallel inbox→log conversion path; inbox becomes Evidence |
| `Attachment` | `evidence` row or `evidence.storage_key` | Binary stays in object storage; parent polymorphism removed |
| `Entity` type `project` | `projects` | Add objective, status, owner FKs; drop `linkedPersonIds` / `linkedTags` from project |
| `Entity` type `person` | `people` | `strategicValue`, alias, notes migrate |
| `Entity` type `company` | `organizations` | Same |
| `Entity` type `other` + `Kind: Topic` in notes | `topics` | Promote from notes hack to first-class table |
| `Log.topics[]` strings | **Manual review queue** | One queue row per string; human resolves to Topic or Tag |
| `Log.kind = event` | `events` + `evidence_events` | Event is domain object; meeting notes are Evidence |
| `Log.kind = follow_up` | `evidence.follow_up_at` | Not a domain entity — datetime on Evidence |
| `project.linkedPersonIds` | Remove from project | Use `evidence_people` + optional `project.owner_person_id` |
| `project.linkedTags` | Remove from project | Tags attach to Evidence only |
| `log.entityIds[]` polymorphic | Junction tables by type | Resolve each ID to person/org/project at migration time |
| `reference-types.ts` place | **Deferred** | Optional free-text on `events.location` only |
| `reference-types.ts` document | `evidence` where `evidence_type = document` | Not a separate domain table |

---

## Overlap conflicts to resolve (before migration)

### 1. Topics stored three ways today

- `log.topics[]` (strings)
- `Entity` type `other` with `Kind: Topic` in notes
- Project `linkedTags[]` (misnamed — treated as tags but used like topic filters)

**Decision:** Topics become `topics` table only. Legacy strings enter the review queue first. Project page (initial) uses `evidence_projects` direct links only.

### 2. Events vs journal `kind`

`Log.kind = event` mixes chronology (Event) with content (Evidence).

**Decision:** Event row holds when/where/who; notes/photos from that meeting are Evidence linked via `evidence_events`.

### 3. Tags vs Topics on the same field

`log.topics` holds both "Trading" (Topic) and potentially "urgent" (Tag).

**Decision (locked):** Manual review queue only. Each legacy `log.topics[]` string becomes a row in `argus_topic_tag_review_queue`. No automatic Topic/Tag split.

### 4. Inbox vs Evidence

Inbox is a staging area today; converted items duplicate into Log.

**Decision:** Email intake creates Evidence directly (`evidence_type = email`). Status (`pending`, `archived`) becomes Tag or a non-domain `intake_status` column on Evidence — not a separate entity.

### 5. Generic `Entity` table

Single table with `type` enum and notes-encoded subtypes violates principle 1.

**Decision:** Drop generic Entity in v01. Each domain type gets its own table.

---

## Storage recommendation

| Layer | Technology | Scope |
|-------|------------|-------|
| Relational core | Supabase Postgres | All entities + junction tables |
| Binaries | Supabase Storage (`argus-files`) | Evidence payloads |
| Dev fallback | JSON file | Read-only during transition; deprecate |

Replace `text[]` arrays in `argus_inbox_items` (`linked_entity_ids`, `attachment_ids`) with junction tables in the v01 schema.

---

## Success criteria (from brief)

- [ ] Every note exists exactly once (`evidence` table).
- [ ] Projects never own notes (junction only).
- [ ] Topics never duplicate notes (junction only).
- [ ] Events organize chronology (separate from Evidence body).
- [ ] Tags only filter (on Evidence; removable).
- [ ] All navigation through relationships.
- [ ] Semantic search can be added without schema redesign.

---

## Schema lock decisions (2026-07-04)

| # | Decision |
|---|----------|
| 1 | Evidence **body is editable** in v01. Use `created_at` + `updated_at`. Defer append-only revision model. |
| 2 | Follow-ups use **`follow_up_at`** on Evidence. Not a Tag. |
| 3 | **Place deferred.** Document = Evidence type (`evidence_type = document`). |
| 4 | Legacy `log.topics[]` → **manual review queue** (`argus_topic_tag_review_queue`). No auto-classify. |
| 5 | Project page (initial): **direct `evidence_projects` links only.** Smart filters later. |

**Out of scope for Phase 1:** UI, migration scripts, product behavior changes, smart filters, AI/OCR/automation.

**Phase 1 deliverable:** `supabase/argus-v01-schema.sql` (DDL draft for review only).

---

## Migration phases

| Phase | Scope | Status |
|-------|-------|--------|
| **0 — Schema agreement** | ERD + lock decisions | ✅ Done |
| **1 — Postgres DDL** | Create tables + junctions; no app change | 🔄 Draft for review |
| **2 — Evidence unification** | Merge Log + InboxItem → Evidence; dual-write | Pending |
| **3 — Entity split** | Migrate Entity blob → typed tables | Pending |
| **4 — Topic/Tag review** | Enqueue `log.topics[]`; human resolves queue | Pending |
| **5 — Event extraction** | Promote `kind=event` logs to Event rows | Pending |
| **6 — UI cutover** | Views query joins; project page = direct links only | Pending |
| **7 — Deprecate JSON** | Remove `ARGUS_DATA_DIR` local store | Pending |

---

## Deferred (not blocking v01 DDL)

- **Private Evidence:** `private boolean` column on Evidence (not a Tag).
- **Topic merge policy:** Canonical name rules at review time, not in DDL.
- **Append-only revisions:** `supersedes_evidence_id` — post-v01.
- **Place entity:** v01.1+.

---

## References

- Current types: `lib/argus/types.ts`
- Current reference hack: `lib/argus/reference-types.ts`
- Inbox (partial cloud, pre-v01): `supabase/argus-inbox.sql`
- **v01 DDL draft:** `supabase/argus-v01-schema.sql`
- Phase 1 gate (pre-refactor checklist): `md/argus/phase-1-gate.md`
