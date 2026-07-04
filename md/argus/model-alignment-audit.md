# ARGUS Model Alignment Audit

**Date:** 2026-07-04  
**Scope:** Alignment-only audit — no code, no migration, no UI changes.  
**Canonical reference:** [`knowledge-model-v01.md`](knowledge-model-v01.md) · DDL draft: [`supabase/argus-v01-schema.sql`](../../supabase/argus-v01-schema.sql)

---

## Executive summary

The project runs **two models in parallel**:

| Layer | Current runtime | Target (v01) |
|-------|-----------------|--------------|
| Core data | JSON file (`ArgusData` v3) via `ARGUS_DATA_DIR` | Supabase Postgres graph schema |
| Inbox | Partial Supabase (`argus_inbox_items`, `argus_attachments`) | `argus_evidence` + junctions |
| UI/API | Generic `Entity` + `Log` + string `topics[]` | Typed tables + relationship junctions |

**Alignment status:** 🔴 **Not aligned.** The app still treats journal rows, inbox items, attachments, and reference subtypes as overlapping containers. v01 DDL exists as a draft but is **not applied** and **not wired** to any route.

**Blocking conflicts (must resolve before implementation):**

1. **Three evidence paths** — `Log`, `InboxItem`, `Attachment` duplicate the v01 Evidence center.
2. **Generic `Entity` blob** — person, company, project, and topic-as-notes share one table with polymorphic `entityIds[]`.
3. **`log.topics[]` overload** — same field holds Topic-like and Tag-like strings; UI labels them "Tags".
4. **`JournalKind`** — event and follow-up are domain concepts stored as log variants.
5. **Inbox convert loop** — creates a second record (`convertedLogId`) instead of relating once.
6. **Project relation arrays** — `linkedPersonIds` / `linkedTags` on project violate "projects relate to Evidence only".

---

## Disposition legend

| Mark | Meaning |
|------|---------|
| **Keep** | Becomes (or already is) a first-class v01 entity/table |
| **Evidence type** | Not a domain entity — maps to `argus_evidence.evidence_type` |
| **Tag** | Workflow/filter metadata via `argus_tags` + `argus_evidence_tags` |
| **Defer** | Keep in app temporarily; address in a later phase; not in v01 DDL critical path |
| **Remove** | Eliminated from target model (may exist during transition only) |

---

## 1. Inventory — domain & storage types

### 1.1 Core records (JSON store — `lib/argus/types.ts`)

| Current concept | Where used | Disposition | v01 target |
|-----------------|------------|-------------|------------|
| **`Log`** | UI: journal, activity edit, cards, home, network history · API: `createLog`, `updateLog`, `deleteLog`, search · DB: `ArgusData.logs[]` | **Evidence type** (row becomes Evidence; not a separate entity) | `argus_evidence` (`note` default; map source/kind) |
| **`InboxItem`** | UI: inbox list, triage, journal home · API: `createInboxItem`, `linkInboxToEntities`, `convertInboxToLog`, `archiveInboxItem` · DB: JSON + `argus_inbox_items` | **Evidence type** | `argus_evidence` (`evidence_type = email`, `intake_status`) |
| **`Attachment`** | UI: attachment field, inbox attachments, documents section · API: `saveAttachment`, files API · DB: JSON + `argus_attachments` | **Evidence type** | `argus_evidence` (`pdf`, `photo`, `file`, `document`, …) + `storage_key` |
| **`Entity`** (generic) | UI: network, project, pickers, search · API: `createEntity`, `updateEntity`, `deleteEntity` · DB: `ArgusData.entities[]` | **Remove** | Split → typed tables below |
| **`ArgusData`** | API: `readArgus` / `writeArgus` · DB: `journal.json` | **Remove** (Phase 7) | Supabase replaces JSON root |

### 1.2 Entity subtypes (today: `EntityType` + `ReferenceKind`)

| Current concept | Where used | Disposition | v01 target |
|-----------------|------------|-------------|------------|
| **`EntityType = person`** | Labels, pickers, network, entity pages | **Keep** | `argus_people` |
| **`EntityType = company`** (UI: Organization) | Same | **Keep** | `argus_organizations` |
| **`EntityType = project`** | Home projects, project page, pickers | **Keep** | `argus_projects` (+ milestones) |
| **`EntityType = other`** | Catch-all bucket | **Remove** | Split by actual kind |
| **`ReferenceKind = topic`** (stored as `other` + `Kind: Topic` in notes) | `ReferenceCreateModal`, `reference-types.ts` | **Keep** | `argus_topics` |
| **`ReferenceKind = place`** | `ReferenceCreateModal` | **Defer** | Free-text on `argus_events.location` (v01.1) |
| **`ReferenceKind = document`** | `ReferenceCreateModal` | **Evidence type** | `argus_evidence` (`evidence_type = document`) |
| **`ReferenceKind = person`** | Reference create UI | **Keep** | `argus_people` (alias for EntityType person) |
| **`ReferenceKind = organization`** | Reference create UI | **Keep** | `argus_organizations` |
| **`ReferenceKind = project`** | Reference create UI | **Keep** | `argus_projects` |
| **`ReferenceKind = other`** | Reference create UI | **Remove** | No catch-all in v01 |

### 1.3 v01 first-class entities (DDL draft only — not in app yet)

| Concept | Where used | Disposition | Notes |
|---------|------------|-------------|-------|
| **`argus_evidence`** | `argus-v01-schema.sql`, docs | **Keep** | Center of graph |
| **`argus_projects`** | DDL, docs | **Keep** | Includes status, objective, owners, dates |
| **`argus_project_milestones`** | DDL, docs | **Keep** | No app equivalent today |
| **`argus_topics`** | DDL, docs | **Keep** | No first-class app UI yet |
| **`argus_events`** | DDL, docs | **Keep** | No first-class app UI yet |
| **`argus_people`** | DDL, docs | **Keep** | Replaces Entity person |
| **`argus_organizations`** | DDL, docs | **Keep** | Replaces Entity company |
| **`argus_tags`** | DDL, docs | **Keep** | No first-class app UI yet |
| **Junction tables** (7) | DDL, docs | **Keep** | Replace all `entityIds[]`, `topics[]`, arrays |
| **`argus_topic_tag_review_queue`** | DDL, docs | **Keep** | Migration support; not user-facing domain |

---

## 2. Inventory — enums, fields & derived concepts

### 2.1 Journal / log enums

| Current concept | Where used | Disposition | v01 target |
|-----------------|------------|-------------|------------|
| **`JournalKind = log`** | `types.ts`, labels, capture, edit | **Evidence type** | `evidence_type = note` |
| **`JournalKind = event`** | Capture (event date), labels "Update" | **Keep** (separate entity) | `argus_events` + `argus_evidence_events` |
| **`JournalKind = follow_up`** | Capture reminder, home follow-ups section | **Remove** (as kind) | `argus_evidence.follow_up_at` |
| **`LogSource`** | `manual`, `inbox`, `email`, `file` on Log | **Keep** (field) | `argus_evidence.source` |
| **`ClassificationStatus`** | `classified`, `needs_classification` | **Defer** | Workflow column or Tag; not in v01 ontology — decide at UI cutover |
| **`followUpDate`** on Log | Capture, edit, network intelligence | **Keep** (field) | `follow_up_at` on Evidence |
| **`eventDate`** (form field) | `JournalEntryForm`, `ActivityEditPanel` | **Remove** (as log field) | `argus_events.occurred_at` |
| **`CaptureIntent`** (`case`, `evidence`, `event`, `log`) | `MemoryComposer.tsx`, `ux-copy.ts` | **Defer** | UI capture workflow only; rename to avoid collision with v01 Evidence |

### 2.2 Inbox enums & fields

| Current concept | Where used | Disposition | v01 target |
|-----------------|------------|-------------|------------|
| **`InboxSource`** | types, labels, email API | **Keep** (field) | Maps to `evidence.source` |
| **`InboxStatus = pending`** | inbox UI, normalize, Supabase | **Keep** (field) | `intake_status = pending` |
| **`InboxStatus = linked`** | normalize auto-promotion | **Keep** (field) | `intake_status = linked` |
| **`InboxStatus = converted`** | convert-to-log flow | **Remove** | No duplicate Evidence row |
| **`InboxStatus = archived`** | archive action | **Keep** (field) | `intake_status = archived` |
| **`linkedEntityIds[]`** on InboxItem | triage, home inbox, Supabase array | **Remove** (array) | Junction tables by resolved entity type |
| **`convertedLogId`** | convert flow, Supabase | **Remove** | Single Evidence row |
| **`inboxItemId`** on Log | back-link after convert | **Remove** | Single Evidence row |
| **`rawEmail`, `subject`, `from`, `to`** | InboxItem, EmailViewer | **Keep** (fields) | Columns or JSON on `argus_evidence` for email type |

### 2.3 Tags, topics & project relations

| Current concept | Where used | Disposition | v01 target |
|-----------------|------------|-------------|------------|
| **`Log.topics[]`** (strings) | Capture, edit, tag picker, search, tag buckets | **Defer** → queue | `argus_topic_tag_review_queue` → human → Topic or Tag junction |
| **`Entity.linkedTags[]`** on project | `ProjectEditForm`, `updateProjectAction` | **Remove** | Tags on Evidence only (`argus_evidence_tags`) |
| **`Entity.linkedPersonIds[]`** on project | `ProjectEditForm`, project page | **Remove** | `project.owner_person_id` + `argus_evidence_people` |
| **`TagBuckets`** (derived from log.topics) | `TagPickerModal`, journal helpers | **Defer** | Rebuild from `argus_tags` after cutover |
| **UI label "Tags"** for topics field | `ux-copy.ts` | **Defer** | UX rename when Topic/Tag split lands |

### 2.4 Person / organization metadata

| Current concept | Where used | Disposition | v01 target |
|-----------------|------------|-------------|------------|
| **`StrategicValue`** (1–5) | Entity, network intelligence, edit forms | **Keep** (field) | `strategic_value` on people & organizations |
| **`alias`, `notes`** | Entity edit, network pages | **Keep** (fields) | Same on people & organizations |
| **`RelationshipHealth`** | `network-intelligence.ts`, network UI | **Defer** | Derived metric — not a stored entity |
| **`EntityIntelligence`** | Network home, entity detail | **Defer** | Derived view over Evidence + junctions |
| **`EntityNetworkView` / `EntityContextSlice`** | `network.ts`, `context.ts` | **Defer** | Recompute from graph queries |

### 2.5 Project fields (current vs v01)

| Current field | Where used | Disposition | v01 target |
|---------------|------------|-------------|------------|
| **`name`** | Project page (editable) | **Keep** | `argus_projects.name` |
| **`startDate`, `endDate`** | Project page | **Keep** | `argus_projects.start_date`, `end_date` |
| **`notes`** on project Entity | Entity edit (network redirect) | **Defer** | `objective` or description field |
| **`objective`** | — | **Keep** | `argus_projects.objective` (not in UI yet) |
| **`status`** (archive) | — | **Keep** | `argus_projects.status` (not in UI yet) |
| **`owner`** | — | **Keep** | `owner_person_id` / `owner_organization_id` (not in UI yet) |
| **`milestones`** | — | **Keep** | `argus_project_milestones` (not in app yet) |

### 2.6 Attachment / file concepts

| Current concept | Where used | Disposition | v01 target |
|-----------------|------------|-------------|------------|
| **`AttachmentParentType`** (`inbox`, `journal`) | types, normalize, saveAttachment | **Remove** | Evidence row owns binary |
| **`attachmentIds[]`** on Log/InboxItem | storage, convert copies IDs | **Remove** (array) | One Evidence row per file |
| **Home section "Documents"** | `JournalHome`, journal page | **Defer** | View filter: Evidence types with `storage_key` |
| **`evidenceCount`** (derived) | network intelligence | **Defer** | Count Evidence with attachments linked to person |

### 2.7 UI navigation & workflow (not domain entities)

| Current concept | Where used | Disposition | Notes |
|-----------------|------------|-------------|-------|
| **`HomeSectionId`** | activity, followUps, inbox, projects, network, documents | **Defer** | Navigation shells; map to graph views later |
| **`FAVORITES_KEY`** (localStorage) | ReferencePickerModal, PinnedEntities | **Defer** | Client preference, not ontology |
| **`ArgusDeleteForm` / testing clears** | delete actions | **Defer** | Unchanged until storage cutover |
| **Route aliases** `/argus/entries`, `/argus/contacts` | middleware | **Remove** | Already deprecated |

### 2.8 Legacy & migration-only

| Current concept | Where used | Disposition |
|-----------------|------------|-------------|
| **`LegacyContact`, `LegacyEntry`, `LegacyEvidence`** | `migrate.ts` | **Remove** after v3 stable |
| **`contacts`, `entries`, `evidence` (v2 arrays)** | `migrate.ts` | **Remove** |
| **`ArgusData.version = 3`** | normalize, storage | **Remove** with JSON store |

---

## 3. Inventory — API routes

| Route | Concepts touched | Aligned? | Notes |
|-------|------------------|----------|-------|
| **`POST /api/argus/email-inbox`** | InboxItem, Attachment, InboxSource=email | ❌ | Creates inbox row, not Evidence |
| **`POST /api/argus/inbox`** | InboxItem (manual/api) | ❌ | Same |
| **`GET /api/argus/files/[id]`** | Attachment by id | ❌ | Parent polymorphism; becomes Evidence download |
| **`app/argus/actions.ts`** | All server actions | ❌ | Entire surface speaks v3 model |

---

## 4. Inventory — database (Supabase)

| Table / object | Current role | Disposition | v01 replacement |
|----------------|--------------|-------------|-----------------|
| **`argus_inbox_items`** | Email/intake rows + `linked_entity_ids[]` | **Remove** | `argus_evidence` + junctions |
| **`argus_attachments`** | Binary metadata + `parent_type`/`parent_id` | **Remove** | Evidence rows + `storage_key` |
| **`argus-files` bucket** | Binary storage | **Keep** | Same bucket; referenced by Evidence |
| **`argus_*` v01 tables (17)** | DDL draft only | **Keep** | Apply after review — not in production DB yet |
| **JSON `journal.json`** | Full v3 store on Vercel/dev | **Remove** (Phase 7) | Supabase becomes source of truth |

---

## 5. Inventory — documentation

| Document | Alignment | Notes |
|----------|-----------|-------|
| **`knowledge-model-v01.md`** | ✅ Canonical | Schema locked 2026-07-04 |
| **`argus-v01-schema.sql`** | ✅ Canonical DDL draft | Review-only; not applied |
| **`phase-1-gate.md`** | ❌ Pre-refactor | Checklist assumes v3 model; many items conflict with v01 (topic timeline, entity-as-container) |
| **`email-intake-e2e.md`** | ⚠️ Partial | Describes InboxItem path; must be rewritten for Evidence intake at cutover |

---

## 6. Conflicts with canonical model

### 6.1 Critical (blocks v01)

| # | Conflict | Current behavior | Canonical rule violated |
|---|----------|------------------|-------------------------|
| C1 | **Dual Evidence** | Inbox convert creates Log + keeps InboxItem | Evidence exists once |
| C2 | **Polymorphic `entityIds[]`** | One array links person, project, org on same log | One responsibility per junction |
| C3 | **`log.topics[]`** | Topics and tags share one string array | Topic ≠ Tag |
| C4 | **`JournalKind`** | Event/follow-up are log variants | Event is entity; follow-up is `follow_up_at` |
| C5 | **Generic `Entity`** | Topic encoded in notes (`Kind: Topic`) | Metadata must not replace domain objects |
| C6 | **Project `linkedTags` / `linkedPersonIds`** | Arrays on project row | Projects relate to Evidence via junction only |
| C7 | **Supabase split brain** | Inbox in Postgres; journal in JSON | Single relational core |

### 6.2 High (breaks views after cutover)

| # | Conflict | Impact |
|---|----------|--------|
| H1 | **No Topic/Tag tables in app** | All topic navigation derives from log strings |
| H2 | **No Event entity** | Meetings live inside log body + kind |
| H3 | **`CaptureIntent.evidence`** | Name collision with v01 Evidence |
| H4 | **Documents = logs with attachments** | Not an Evidence type distinction |
| H5 | **Network page for projects** | Redirect exists; project still partially modeled as Entity |
| H6 | **`phase-1-gate.md` priorities** | Topic timeline / search assume pre-v01 containers |

### 6.3 Medium (defer safely)

| # | Conflict | Impact |
|---|----------|--------|
| M1 | **`ClassificationStatus`** | Workflow concept not in v01 ontology |
| M2 | **`RelationshipHealth`** | Derived; OK if computed, not stored |
| M3 | **Entity name not editable** | UX gap; v01 tables support rename |
| M4 | **No project archive status** | v01 has `status`; UI uses delete only |
| M5 | **Place reference kind** | Still creatable in UI; deferred in v01 |

---

## 7. Gap matrix — canonical entity vs app support

| v01 entity | DDL draft | App CRUD | App views | Junction CRUD |
|------------|-----------|----------|-----------|---------------|
| Evidence | ✅ | ❌ (Log/Inbox/Attachment) | Partial | ❌ |
| Project | ✅ | ⚠️ (as Entity) | ⚠️ (project page) | ❌ |
| Topic | ✅ | ❌ (strings + notes hack) | ❌ | ❌ |
| Event | ✅ | ❌ (JournalKind) | ❌ | ❌ |
| Person | ✅ | ⚠️ (as Entity) | ⚠️ (network) | ❌ |
| Organization | ✅ | ⚠️ (as Entity company) | ⚠️ (network) | ❌ |
| Tag | ✅ | ❌ (topics strings) | ❌ | ❌ |
| Review queue | ✅ | ❌ | ❌ | — |

---

## 8. Smallest safe implementation sequence

**Constraint:** No product behavior change until each step is explicitly approved. Phase 1 gate checklist is **frozen** during schema alignment — do not chase MOP items that assume the old model.

### Step 0 — Alignment (this document) ✅

Audit complete. No code.

### Step 1 — Postgres DDL apply (schema only)

- Review and approve `supabase/argus-v01-schema.sql`.
- Apply to Supabase SQL editor.
- **Do not** point app reads/writes at new tables.
- **Do not** drop `argus_inbox_items` yet.
- Verify: tables exist, constraints hold, bucket present.

### Step 2 — Read-only repository adapter (no UI)

- Add a thin data access layer that can **read** v01 tables alongside existing JSON.
- No writes. No route changes.
- Verify: adapter unit tests or script confirms empty joins.

### Step 3 — Dual-write shadow (Evidence only)

- On existing `createLog` / email intake / attachment save, **also** insert into `argus_evidence` + junctions (feature flag).
- App still reads JSON as source of truth.
- Verify: row counts match; no user-visible change.

### Step 4 — Entity split migration (one-time script)

- Migrate `Entity` rows → `argus_people`, `argus_organizations`, `argus_projects`.
- Map `entityIds[]` → typed junction rows.
- **Do not** migrate `log.topics[]` automatically.
- Verify: ID mapping table; spot-check network + project pages still on JSON.

### Step 5 — Topic/Tag review queue (manual)

- Enqueue every distinct `log.topics[]` string into `argus_topic_tag_review_queue`.
- Build minimal internal review UI or admin script (not product UI redesign).
- Human resolves each row → Topic or Tag junction.
- **No auto-classify** (locked decision).

### Step 6 — Event extraction

- Promote `JournalKind = event` logs → `argus_events` + link meeting notes as Evidence.
- Map `follow_up` / `followUpDate` → `follow_up_at` on Evidence; remove kind.

### Step 7 — Read cutover (flagged)

- Flip read path: UI loads from Supabase graph, JSON as fallback.
- Project page: **direct `evidence_projects` links only** (no smart filters).
- Verify: refresh persistence, project page, inbox/email intake end-to-end.

### Step 8 — Write cutover + deprecate JSON

- All writes go to Supabase only.
- Remove JSON store and `argus_inbox_items` / `argus_attachments`.
- Update `phase-1-gate.md` and `email-intake-e2e.md` for v01 paths.

### Step 9 — Deferred backlog (post-alignment)

- Smart project filters (people, tags, date range).
- Topic / Event / Tag product pages and timelines.
- Place entity (v01.1).
- Semantic search.
- `ClassificationStatus` replacement policy.

---

## 9. Explicit non-actions (until Step 7 cutover)

| Do not | Reason |
|--------|--------|
| Redesign UI | Out of scope |
| Auto-split topics → tags | Locked: manual queue only |
| Add smart project filters | Deferred to Step 9 |
| Implement Topic timeline / unified search | Assumes old model; rebuild on graph |
| Chase `phase-1-gate.md` topic timeline item | Conflicts with v01 sequencing |
| Drop JSON or inbox tables early | Breaks production |
| Add AI / OCR / automation | Out of scope |

---

## 10. Recommended doc updates (next non-code pass)

1. **`phase-1-gate.md`** — Mark as **v3 MOP (legacy)**; add pointer to v01 phases.
2. **`email-intake-e2e.md`** — Add "future state" section: intake → Evidence, not InboxItem.
3. **`.cursor/rules/`** — Add rule: implementation must reference `knowledge-model-v01.md`; no new Entity types without audit update.

---

## 11. Sign-off checklist (before Step 1 apply)

- [ ] ERD / DDL reviewed against this audit
- [ ] All **Remove** items have a migration owner step
- [ ] All **Defer** items are listed in Step 9 backlog
- [ ] No open auto-classify paths
- [ ] Production can continue on v3 while Steps 1–3 run with zero UX change

**Stop here.** No implementation until this audit is approved.
