# ARGUS Architecture Review — Evidence Notes (extraction only)

**Extracted:** 2026-08-06  
**Status:** **Historical snapshot** — component lists predate Evidence Engine Phase A deletions.  
**Current runtime:** [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md) · pack `12`/`13` · regenerate lists via `argus-review/appendix-*.txt`.  
**Scope:** `/workspace` facts only — no invention, redesign, or recommendation.  
**Method:** directory listing, file headers/exports/imports, and quoted docs.  
**UNKNOWN** marks anything not verified in-repo.

---

## 1) SYSTEM MAP

### 1.1 Directory trees (depth 2–3)

#### `app/argus/` (UI + server actions)

| Path | Role (from names / structure) |
|------|-------------------------------|
| `app/argus/layout.tsx` | Root ARGUS layout (Geist font, metadata title `"ARGUS"`) |
| `app/argus/actions.ts` | `"use server"` — all ARGUS server actions (~73 `export async function`) |
| `app/argus/login/page.tsx` | Password login → default next `/argus/v2` |
| `app/argus/(app)/` | Legacy app shell (BottomNav, max-width layout) |
| `app/argus/(app)/page.tsx` | Redirects to `/argus/v2` |
| `app/argus/(app)/layout.tsx` | Session + `ArgusAddProvider` + BottomNav |
| `app/argus/(app)/journal/page.tsx` | Legacy journal route |
| `app/argus/(app)/inbox/`, `inbox/[id]/` | Legacy inbox |
| `app/argus/(app)/network/`, `network/[id]/` | Legacy network |
| `app/argus/(app)/projects/[id]/` | Legacy project |
| `app/argus/(app)/logs/[id]/` | Legacy log detail |
| `app/argus/(app)/search/page.tsx` | Search |
| `app/argus/(app)/new/page.tsx` | New capture |
| `app/argus/(app)/diagnostics/page.tsx` | Diagnostics |
| `app/argus/components/` | Shared UI (create/link, capture, inbox, forms) — 50 `.tsx` files |
| `app/argus/v2/` | Primary v2 shell |
| `app/argus/v2/layout.tsx` | Session + nav counts + `V2DesktopShell` |
| `app/argus/v2/page.tsx` | Home dashboard |
| `app/argus/v2/components/` | ~55 v2 UI components |
| `app/argus/v2/inbox/` | Inbox page + components |
| `app/argus/v2/deliver/` | Deliver / Export Center |
| `app/argus/v2/diagnostics/` | Diagnostics |
| `app/argus/v2/help/` | In-app help |
| `app/argus/v2/settings/security/` | Security settings |
| `app/argus/v2/browse/network/` | Network browse |
| `app/argus/v2/browse/organizations/` | Org browse |
| `app/argus/v2/browse/projects/` | Project browse |
| `app/argus/v2/browse/topics/` | Topics browse |
| `app/argus/v2/browse/events/` | Events browse |
| `app/argus/v2/network/[id]/` | Person detail |
| `app/argus/v2/organizations/[id]/` | Org detail |
| `app/argus/v2/projects/[id]/` | Project detail |
| `app/argus/v2/runbooks/[id]/` | Runbook detail |
| `app/argus/v2/network/components/` | Network panel / AI / dialogue |

#### `lib/argus/` (128 `.ts` files)

| Path | Purpose (from comments/exports/names) | Key deps (imports) |
|------|----------------------------------------|--------------------|
| `types.ts` | v3 runtime types: `Entity`, `Log`, `InboxItem`, `Attachment`, `Runbook`, `ArgusData` | `./network-relationship-metrics` |
| `reference-types.ts` | `ReferenceKind` + Kind notes helpers | `./types` |
| `server-storage.ts` | Sole read/write façade for journal + files + inbox CRUD | `./data-safety`, `./storage`, `./migrate`, `./normalize`, `./inbox-store/*`, `./journal-store/*`, `./link-hierarchy`, … |
| `normalize.ts` | Normalize ArgusData / logs / inbox | `./types` |
| `migrate.ts` | `migrateToV3` | `./types`, `./normalize` |
| `labels.ts` | Display labels for enums | `./types`, `./network-intelligence` |
| `ux-copy.ts` | Product strings | (none) |
| `journal-helpers.ts` | Kind inference, pickers, tag buckets | `./types`, `./tag-limits` |
| `journal-behavior.ts` | Note↔log transitions | `./types` |
| `journal-event-origin.ts` | Event/topic entity helpers for register | `./types`, `./reference-types` |
| `register-infer.ts` | Register kind/date hints | `./journal-event-origin` |
| `create-flow-types.ts` | Create/link flow types | `./reference-types`, `@/app/argus/components/ReferencePickerModal` |
| `create-flow-helpers.ts` | Journal link rows / filter helpers | `./types`, `./reference-types` |
| `create-link-flow-state.ts` | Client hook for create+link | `react`, `next/navigation`, `@/app/argus/actions`, … |
| `link-hierarchy.ts` | Allowed link targets by source | `./types`, `./journal-helpers` |
| `link-modal-adapter.ts` | Map link modal → create flow | `@/app/argus/*` |
| `network.ts` | Derived network views from journal | `./types`, `./context` |
| `network-intelligence.ts` | Health / attention scores | `./types` |
| `network-relationship-metrics.ts` | Contact/my value keys | `./types`, `./network-intelligence` |
| `network-dialogue.ts` | Dialogue / playbook constants | (none) |
| `network-ai-*.ts` | AI block/brief/mechanics/snapshot | various + `@/lib/snapshot-*` |
| `apply-network-ai-block.ts` | Apply AI block payload to storage | `./journal-helpers`, `./normalize`, `./types` |
| `context.ts` | Co-mention context slices | `./types` |
| `home-helpers.ts` | Legacy home feed builders | `./types`, `./network-intelligence`, … |
| `entity-lifecycle.ts` | `lifecycleStatus` resolution | `./types` |
| `entity-evidence.ts` / `entity-private-evidence.ts` | Load / detect private evidence | `./server-storage`, `./network`, … |
| `project-evidence.ts` / `project-evidence-scope.ts` | Project evidence scope | `./link-hierarchy`, `./inbox-entity-links`, … |
| `inbox-entity-links.ts` / `inbox-enrich.ts` | Inbox↔entity + attachment enrichment | `./server-storage`, `./network` |
| `inbox-api-auth.ts` / `email-inbox.ts` / `email-view.ts` / `email-html.ts` | Inbox API auth + email parse/view | `next/server` or none |
| `private-access.ts` | Private record filters | `./types` |
| `delete-gate.ts` / `delete-link-check.ts` | Delete auth gates | `@/lib/auth/*`, `./types` |
| `attachment-log.ts` | Attach files to logs | `./server-storage` |
| `tag-limits.ts` | Tag picker/cloud/pattern constants | (none) |
| `build-info.ts` | Build SHA helpers | (none) |
| `argus-legacy-redirects.ts` | Legacy URL redirects | `next/server` |
| `use-overlay-lock.ts` | Overlay scroll lock hook | `react` |
| `runbook-helpers.ts` / `runbook-ai-bulk.ts` | Runbook template helpers | `./types` |
| `storage/` | Paths, bootstrap, quota | `fs`, `path`, Supabase admin (quota) |
| `storage/paths.ts` | Resolve `ARGUS_DATA_DIR` layout | `path` |
| `storage/bootstrap.ts` | Create dirs + one-time migrate | `./paths` |
| `storage/quota-report.ts` | Storage quota gauges | data-safety, inbox/journal config, Supabase |
| `journal-store/` | Cloud journal JSON blob | `@/lib/supabase/server` |
| `inbox-store/` | Cloud inbox + attachments | `@/lib/supabase/server`, `../v2/inbox-loaders` |
| `data-safety/` | Write gate, backup, policy, counts | `./storage`, journal/inbox config |
| `supabase-protection/` | Soft-delete counts, migrate gate, export | Supabase admin |
| `persistence/errors.ts` | Persistence error formatting | `./journal-behavior` |
| `health/status.ts` | Subsystem health report | data-safety, stores, journal-helpers |
| `export/` | Deliver/export collector + packages | types, vault, zip, pdfkit, archiver |
| `export/writers/zip-writer.ts` | ZIP via `archiver` | `archiver` |
| `export/packages/pdf-deliver.ts` | PDF via `pdfkit` | `pdfkit` |
| `v2/` | v2 loaders, browse utils, hierarchy, timelines | mostly `../types`, `../reference-types`, peer v2 modules |

#### `app/api/argus/`

| Route file | Imports (key) |
|------------|---------------|
| `inbox/route.ts` | `server-storage`, `types` — token `ARGUS_INBOX_TOKEN` |
| `email-inbox/route.ts` | `email-inbox`, `inbox-api-auth`, `server-storage` |
| `files/[id]/route.ts` | auth cookies, `server-storage`, `email-view` |
| `export/route.ts` | collect + vault/pdf/json packages, `server-storage` |
| `export/preview/route.ts` | `export/preview`, `server-storage` |
| `deliver/quick/route.ts` | quick-package HTML/MD |
| `deliver/dossier/route.ts` | dossier packages (header truncated in extract; file exists) |
| `deliver/share/route.ts` | `deliver-shares`, dossier HTML |

#### Supabase SQL (`supabase/`)

| File | Header purpose |
|------|----------------|
| `argus-inbox.sql` | `argus_inbox_items` + `argus_attachments`; bucket `argus-files` |
| `argus-inbox-private.sql` | add `private` column |
| `argus-inbox-triage.sql` | `follow_up_date`, `topics[]` |
| `argus-journal.sql` | `argus_journal` jsonb v3 blob |
| `argus-protection.sql` | soft delete, RLS, hard-delete blocks |
| `argus-setup.sql` | all-in-one inbox → journal → protection |
| `argus-storage-quota.sql` | `argus_db_bytes()` RPC |
| `argus-v01-schema.sql` | **DRAFT FOR REVIEW ONLY** — v01 domain tables |
| `dev/argus-destructive-local-only.sql` | local/dev hard-delete reminder |

#### Related (outside primary trees)

| Path | Note |
|------|------|
| `md/argus/` | ARGUS docs index + model/QA |
| `md/integrations/argus-*.md` | Architecture constitution, storage, email, design principles |
| `middleware.ts` | Auth + legacy redirects via `argusLegacyRedirectUrl` |
| `app/components/ArgusMark.tsx`, `ArgusCornerEntry.tsx` | Shared brand/entry |
| `argus-email-bridge/` | Separate email worker package |
| `tools/*argus*` | Validate/verify/backup/deploy scripts |
| `lib/argusforge/`, `app/forge/` | ArgusForge (separate product surface; not inventoried as ARGUS core) |

### 1.2 Major modules (grouped)

1. **Persistence façade:** `server-storage.ts` + `storage/*` + `journal-store/*` + `inbox-store/*` + `data-safety/*`  
2. **Domain types:** `types.ts`, `reference-types.ts`, `normalize.ts`, `migrate.ts`  
3. **Server actions UI bridge:** `app/argus/actions.ts`  
4. **Create / link:** `create-flow-*`, `link-hierarchy`, `link-modal-adapter`, `app/argus/components/ArgusCreate*`  
5. **v2 presentation loaders:** `lib/argus/v2/*` + `app/argus/v2/**`  
6. **Network intelligence:** `network.ts`, `network-intelligence.ts`, `network-relationship-metrics.ts`, `network-ai-*`  
7. **Deliver/export:** `lib/argus/export/**` + `app/api/argus/{export,deliver}/**` + `app/argus/v2/deliver/**`  
8. **Protection / health:** `supabase-protection/*`, `delete-gate*`, `health/status.ts`  
9. **Runbooks:** types in `types.ts`; helpers + many actions; UI under `v2/runbooks` and runbook components  

### 1.3 `app/argus/components/` inventory (file → primary export)

ActivityEditPanel, AddContextFlow, AddRegisterCaptureButtons, ArgusAddLauncher, ArgusAddProvider, ArgusAppHeader, ArgusCreateItemDrawer, ArgusCreateLinkMobile, ArgusCreateLinkWindow, ArgusDeleteForm, ArgusInboxStatusRow, ArgusLinkModal, ArgusStatusAlert, ArgusStatusPanel, ArgusUnifiedLinkPanel, AttachmentField, BottomNav, CaptureFab, CaptureSheet, Cards, ClassifyLogForm, CompactRows, create-link-shared, EmailViewer, EntityCreateForm, EntityCreateLauncher, EntityEditForm, EntityEvidenceSection, EntityPicker, EvidenceEmailCard, HomeDetailHeader, HomeExpandableCard, HomeInboxCard, HomeNetworkCard, HomeProjectCard, HomeSectionNav, InboxAttachmentList, InboxTriagePanel, JournalEntryForm, JournalHome, JournalKindActions, MemoryComposer, MemoryStreamRow, NetworkEntityCard, NetworkRelationshipMetricsDisplay, NetworkRelationshipMetricsFields, PinnedEntities, PrivateLockMenu, PrivatePanel, ProjectEditForm, ReferenceCreateModal, ReferenceLinkPanel, ReferencePickerModal, StorageWarningBanner, TagPickerModal, ui.

### 1.4 `app/argus/v2/components/` (names)

BrowseBoardColumnHeader, RunbookAiBulkPanel, V2AttachmentComposer, V2BrowseStatusFilter, V2BuildBadge, V2CreateEntityButton, V2DayPicker, V2DesktopShell, V2DetailCompactHeader, V2EntityChronicleRail/Section, V2EntityLifecycleActions, V2EntityLinksTab, V2EntityNeighborhoodPanel, V2EntityRunbooksTab, V2EntityTable, V2EntityTimelineSection, V2EntityViewer, V2ExportJsonButton, V2HomeClient, V2HomeIntelligencePanel, V2HomeMainShell, V2HomePulse, V2IntelligenceFocusBanner, V2IntelligenceLens, V2KnowledgeGraph, V2KnowledgeTreemap, V2MobileMenuProvider, V2MobileUnlockedManageBar, V2OpenCaptureButton, V2OrgShell/Tabs/Timeline, V2PageIdBadge, V2PortfolioBubbleMatrix, V2PrivateEvidenceGate, V2ProjectActions/RunbooksPanel/RunbooksTab/ScopeToggle/Shell/Tabs, V2QuickDeliverModal, V2RecordRecentEntity, V2RelationshipChart, V2RightPanel, V2RunbookCreateStrip, V2RunbookWorkPanel, V2Sidebar/Recent, V2StorageGaugePanel, V2TabBar, V2TagCloud, V2TagPatternBadges, V2Timeline, V2TopBar/AddMenu, V2VocabularyListEditor, v2-ui.

---

## 2) ARCHITECTURE

### 2.1 From docs (quoted / paraphrased with citation)

**Product identity** — Evidence Organization System; loop `Receive → Organize → Correlate → Retrieve → Deliver` (`md/argus/README.md:17–29`).

**Alternate loop wording** — `Receive → Register → Link → Retrieve → Deliver` (`md/argus/how-argus-works.md:10–12`).

**Constitution modules** (`md/integrations/argus-architecture.md:208–216`):

| Module | Owns data? | Purpose |
|--------|------------|---------|
| Inbox | Yes (raw) | Capture first |
| Journal | Yes (facts) | Source of truth |
| Network | No | Derived from Journal |
| Search | No | Global retrieval |

Accepted rules (`argus-architecture.md:14–22`): Inbox first-class + immutable raw; Journal single source of truth; Network derived; Search cross-cutting; Event/Follow-up derived; AI annotates only.

**Runtime vs target** (`md/argus/README.md:82–95`):

| Layer | Today (v3) | Target (v01) |
|-------|------------|--------------|
| Storage | `ArgusData` in `journal.json` and/or Supabase | Unified `argus_evidence` + junctions |
| Journal | `Log` kinds | Evidence rows |
| Email | `InboxItem` statuses | Evidence + links |
| Entities | Polymorphic `Entity` | Typed Person/Org/Project/Topic/Event |
| Code entry | `types.ts`, `server-storage.ts` | `supabase/argus-v01-schema.sql` (draft) |

**Lens rules (documented as implemented)** (`README.md:98–107`) → code `lib/argus/v2/hierarchy.ts`.

**Storage architecture** (`md/integrations/argus-storage.md:74–86`): all disk I/O via `storage/paths.ts`, `storage/bootstrap.ts`, `server-storage.ts`; UI must not import paths.

**v2 hierarchy header** (`lib/argus/v2/hierarchy.ts:1–7`): mirrors `design-matrix-stage.md`; Org forever/direct; Project bounded + via contacts; Person direct.

### 2.2 From code structure (layers)

```text
UI: app/argus/(app)|v2 + components
  → server actions: app/argus/actions.ts
  → API routes: app/api/argus/*
      → lib/argus/server-storage.ts
          → local JSON (ARGUS_DATA_DIR) OR journal-store Supabase
          → inbox-store Supabase (when cloud)
          → data-safety write gate
      → lib/argus/export/* (deliver)
      → lib/argus/v2/* (view models)
```

Auth: `requireArgusSession`, cookies `argus-auth` / private / delete — via `@/lib/auth/*` and `middleware.ts`.

### 2.3 Doc ↔ code / doc ↔ doc disagreements (factual only)

| Topic | Doc A | Doc/code B |
|-------|-------|------------|
| **Event** | Architecture: Event = `Log.kind`; “Do not add Event-specific UI” until open questions answered (`argus-architecture.md:94–112`) | `how-argus-works.md:30` lists Event as entity type; `reference-types.ts:3–4` creatable `event`; code has `app/argus/v2/browse/events/**` and `lib/argus/v2/event-*` |
| **Product loop verbs** | README: Organize/Correlate (`README.md:17–18`) | how-argus-works: Register/Link (`how-argus-works.md:10–12`) |
| **Deliver maturity** | README known weakness #4: “Deliver layer only partially built” (`README.md:196`) | `export-delivery-handoff.md:7`: “Deliver **v1 shipped**”; catalog marks several packages `available: true` (`deliver-catalog.ts:12–87`) |
| **Place creatable** | model-alignment M5: “Still creatable in UI” (`model-alignment-audit.md:246`) | `reference-types.ts:22–24`: place is legacy display-only, not in `REFERENCE_KINDS` |
| **Attachment parent** | Architecture “Current gap”: parent only as ID arrays, not on Attachment (`argus-architecture.md:130–133`) | `types.ts:66–75`: `Attachment` has `parentType` + `parentId` |
| **Person detail v2** | Same file: “Person v2 shell **Implemented**” (`v2-checklist-solutions.md:73`) and “Person detail v2 **Deferred** — Phase 2” (`v2-checklist-solutions.md:105`) | Code route exists: `app/argus/v2/network/[id]/page.tsx` |
| **v01 wiring** | model-alignment: v01 DDL “not applied” and “not wired” (`model-alignment-audit.md:20`) | File `supabase/argus-v01-schema.sql` exists as draft header confirms review-only |

---

## 3) DATA FLOW

### 3.1 Inputs

| Input | Path evidence |
|-------|----------------|
| **Manual / create+link** | UI components → `saveUnifiedCreateFlowAction` / `createLogAction` / `createEntityAction` in `app/argus/actions.ts` → `server-storage` `createLog` / `createEntity` |
| **Journal register** | `(app)/journal`, CaptureSheet/MemoryComposer, actions `createLogAction` |
| **Inbox API** | `POST /api/argus/inbox` (`app/api/argus/inbox/route.ts`) — Bearer/`X-Argus-Inbox-Token` vs `ARGUS_INBOX_TOKEN` → `createInboxItem` |
| **Email intake** | `POST /api/argus/email-inbox` → `parseEmailInboxPayload` + `createInboxItem` / `saveAttachment`; bridge under `argus-email-bridge/` |
| **Inbox triage / link** | v2 inbox UI → `linkInboxAction`, `setInboxLinksAction`, `updateInboxTriageAction`, `convertInboxAction`, … |
| **Attachments** | `saveAttachment` / `appendLogAttachment` / `appendInboxAttachment`; files at `{ARGUS_DATA_DIR}/files/{id}` or Supabase `argus-files` |

### 3.2 Storage

| Store | Evidence |
|-------|----------|
| **Local JSON** | `journal.json` under `ARGUS_DATA_DIR` (`argus-storage.md:49–68`); default `{repo}/data/argus` if unset |
| **Layout** | `journal.json`, `files/`, `meta/storage.json`, reserved `email-cache/`, `annotations/`, `backups/` (`argus-storage.md:49–58`) |
| **ArgusData v3 shape** | `entities`, `logs`, `inboxItems`, `attachments`, `runbooks`, `runbookProgress?`, `version: 3` (`types.ts:174–183`) |
| **Cloud journal** | Table `argus_journal` jsonb (`supabase/argus-journal.sql`); `journal-store/supabase.ts` `readJournalFromSupabase` / `writeJournalToSupabase` |
| **Cloud inbox** | `argus_inbox_items`, `argus_attachments` (`argus-inbox.sql`); `inbox-store/supabase.ts` |
| **Config switches** | `isCloudJournalStore()` / `isCloudInboxStore()` in respective `config.ts` |
| **Write safety** | `data-safety/write-gate.ts` `writeArgusSafe`; blocked on ephemeral Vercel without cloud (`data-safety/policy.ts`) |
| **v01 schema** | Draft only — not application read path (`argus-v01-schema.sql` header; `model-alignment-audit.md:20`) |

### 3.3 Outputs

| Output | Path evidence |
|--------|----------------|
| **Quick / Activity Summary** | `GET/POST /api/argus/deliver/quick` → `quick-package.ts` / `quick-package-html.ts`; UI `V2QuickDeliverModal`, `V2DeliverShell` (`deliver-formats-plan.md:37–45`) |
| **Evidence Vault ZIP** | `POST /api/argus/export` package `evidence_vault` → `packages/vault.ts` + `writers/zip-writer.ts`; contents `manifest.json`, `evidence.json`, `timeline.json`, `files/*` (`README.md:221–240`) |
| **Export preview** | `POST /api/argus/export/preview` → `export/preview.ts` |
| **PDF deliver** | `export/packages/pdf-deliver.ts` (pdfkit); catalog `pdf_deliver` `available: true` |
| **Evidence dossier / portable archive** | `packages/evidence-dossier*.ts`; API `deliver/dossier` |
| **Share** | `deliver/share/route.ts` + `export/deliver-shares.ts` |
| **JSON snapshot** | `packages/json-snapshot.ts`; catalog `json_snapshot` available |
| **File download** | `GET /api/argus/files/[id]` |

**Collector shared path:** `collectVaultEvidence` (`export/collect-evidence.ts`) + scope via `resolve-scope.ts`; scopes `person|project|organization|topic|event` (`README.md:236`).

### 3.4 Conversion loop (v3)

Inbox → Journal: `convertInboxToLog` / `convertInboxAction` sets `convertedLogId` / `inboxItemId` (types + model-alignment C1). Architecture notes attachment parent move on convert (`argus-storage.md:96`).

---

## 4) ONTOLOGY

### 4.1 Vocabulary policy (exact)

From `md/argus/vocabulary-policy.md:5–14`:

| Term | Where | Role |
|------|--------|------|
| **Topic** | Entity (`Kind: topic`) | Evidence binder |
| **Tag** | Evidence only (`inbox.topics[]`, `log.topics[]`) | User marks; Patterns / filters / Deliver |
| **Alias** | Topic entity (`linkedTags` storage) | Synonyms for matching — not Patterns |
| **Signal** | Event entity (`linkedTags` storage) | Event markers; copied to evidence on chronicle save → Patterns |

Nav badge counts are **not** Signals (`vocabulary-policy.md:12`).

### 4.2 v3 runtime (`lib/argus/types.ts`)

**Enums / unions:**

- `EntityType`: `"person" | "company" | "project" | "other"` (`types.ts:8`)
- `JournalKind`: `"log" | "event" | "follow_up"` (`types.ts:10`)
- `LogSource`: `"manual" | "inbox" | "email" | "file"` (`types.ts:12`)
- `InboxSource`: `"manual" | "api" | "email" | "file"` (`types.ts:14`)
- `InboxStatus`: `"pending" | "linked" | "converted" | "archived"` (`types.ts:16`)
- `ClassificationStatus`: `"classified" | "needs_classification"` (`types.ts:18`)
- `AttachmentParentType`: `"inbox" | "journal"` (`types.ts:20`)
- `EntityLifecycleStatus`: `"active" | "completed" | "archived"` (`types.ts:25`)
- `StrategicValue`: `1|2|3|4|5` (`types.ts:22`)

**Persisted records:** `Entity`, `Attachment`, `Log`, `InboxItem`, `Runbook`, `RunbookProgress`, root `ArgusData` (`types.ts:29–183`).

**Entity relation fields (arrays on Entity):** `linkedPersonIds`, `linkedTopicIds`, `linkedEventIds`, `linkedEntityIds`, `linkedTags`, `startDate`/`endDate` (`types.ts:45–57`).

**Derived (not primary store in architecture):** `EntityNetworkView`, `EntityContextSlice` (`types.ts:190–207`).

### 4.3 Reference kinds (`lib/argus/reference-types.ts`)

- Creatable: `"person" | "organization" | "project" | "topic" | "event"` (`reference-types.ts:3–12`)
- Legacy display: `"place" | "document" | "other"` (`reference-types.ts:22–24`)
- Topic/Event persist as `EntityType other` + `Kind:` prefix in notes (`reference-types.ts:79–86`)
- Organization maps to `EntityType company` (`reference-types.ts:55–59`)

### 4.4 v01 target (`md/argus/knowledge-model-v01.md`)

**Core ontology table** (`knowledge-model-v01.md:24–32`): Evidence, Project, Topic, Event, Person, Organization, Tag — each with stated Never rules.

**Tags vs Topics** (`knowledge-model-v01.md:34–40`): Topic = permanent “what about”; Tag = removable workflow.

**Junctions (no arrays):** EVIDENCE_PROJECTS, EVIDENCE_TOPICS, EVIDENCE_EVENTS, EVIDENCE_PEOPLE, EVIDENCE_ORGANIZATIONS, EVIDENCE_TAGS, EVENT_PARTICIPANTS (`knowledge-model-v01.md:142–179`).

**Mapping current → target** (`knowledge-model-v01.md:241–259`): Log→evidence note; InboxItem→evidence email; Attachment→evidence+storage_key; Entity subtypes→typed tables; `log.topics[]`→review queue; `kind=event`→events+junction; `kind=follow_up`→`follow_up_at`; place deferred; document→evidence type.

**Deferred (v01)** (`knowledge-model-v01.md:354–359`): Private Evidence column, Topic merge policy, append-only revisions, Place entity v01.1+.

### 4.5 Labels / UI terminology samples

`labels.ts` exports `ENTITY_TYPE_LABELS`, `JOURNAL_KIND_LABELS`, `INBOX_*`, etc.  
`ux-copy.ts`: `ARGUS_PRODUCT_NAME = "ARGUS"`, `ARGUS_TAGLINE = "Work Tracker"`, `ARGUS_SUBTITLE = "Track items, documents, and follow-ups."` (`ux-copy.ts` exports list).

**No normalization applied in this inventory** — terms left as documented/coded.

---

## 5) OPEN ITEMS (sourced only)

### 5.1 README Known weaknesses (`md/argus/README.md:187–199`)

1. Docs split across `md/argus/` and `md/integrations/`  
2. v3 runtime vs v01 target confuses readers  
3. Checklist lags code (person v2, export, inbox Process)  
4. Deliver layer only partially built — Export Center UI + Vault API; other packages + history deferred  
5. Inbox follow-up does not feed person Attention metrics  
6. Legacy routes still exist  
7. Production data on Vercel needs Supabase  

### 5.2 Model alignment audit — blocking conflicts (`model-alignment-audit.md:22–29`, `213–226`)

C1 Dual Evidence (inbox convert duplicates)  
C2 Polymorphic `entityIds[]`  
C3 `log.topics[]` Topic≠Tag overload  
C4 JournalKind event/follow_up  
C5 Generic Entity + notes Kind hack  
C6 Project `linkedTags` / `linkedPersonIds`  
C7 Supabase split brain (inbox Postgres / journal JSON)  

**Status line:** “Not aligned”; v01 DDL draft not applied/not wired (`model-alignment-audit.md:20`).

**Step 9 deferred backlog** (`model-alignment-audit.md:324–330`): smart project filters; Topic/Event/Tag product pages; Place entity; semantic search; ClassificationStatus policy.

### 5.3 `v2-checklist-solutions.md` deferred

| Item | Citation |
|------|----------|
| Profile avatar | Deferred — static until user profile model (`:30`) |
| Person detail v2 | Deferred — Phase 2 (`:105`) *[also marked Implemented at `:73`]* |
| Replace `/argus/journal` | Deferred — by design (`:106`) |
| Next deferred work list | Person `/argus/v2/people/[id]`; Reminders/Follow Ups routes; search palette; Profile; full filter panels (`:122–128`) |
| Partial: Reminders nav → `/argus/journal` (`:25`); Network Filters button (`:53`) |

### 5.4 TODO / FIXME in argus code

**Scan result:** `TODO` / `FIXME` under `app/argus`, `lib/argus`, `app/api/argus` — **no matches** (2026-08-06 ripgrep).  

Sample non-TODO markers found: “not yet linked” help copy; “Legacy notes hack” comment in `entity-lifecycle.ts`; `@deprecated` on `deleteInboxItem` hard delete (`inbox-store/supabase.ts`).

### 5.5 PARTIALLY IMPLEMENTED markers

**Exact string `PARTIALLY IMPLEMENTED`:** **not found** in `md/`, `app/argus`, `lib/argus`.

**Near-equivalents documented:**

| Marker | Location |
|--------|----------|
| “Deliver layer only partially built” | `README.md:196` |
| Status label **In progress** | `README.md:41` |
| Architecture: “v2 shell, inbox, network metrics, and Evidence Vault v1 are **in progress**” | `argus-architecture.md:4` |
| Checklist `[~]` Partial | `v2-design-checklist.md` / solutions |
| model-alignment gap matrix “Partial” views | `model-alignment-audit.md:254` |
| Architecture scalability “Partial” / “Blocked” / “Not ready” | `argus-architecture.md:223–229` |
| knowledge-model Phase 1 DDL “Draft for review”; phases 2–7 Pending | `knowledge-model-v01.md:339–350` |

### 5.6 Architecture open Event questions (not resolved in that doc)

`argus-architecture.md:98–107` — What is an Event? Differentiator vs Log? Calendar module?

---

## 6) DEPENDENCIES

### 6.1 `package.json` deps detectably used by ARGUS

| Package | Detected import site |
|---------|----------------------|
| `next` | layouts, pages, API routes, `argus-legacy-redirects`, hooks |
| `react` / `react-dom` | components + `create-link-flow-state`, overlay hooks |
| `@supabase/supabase-js` | via `@/lib/supabase/server` `createSupabaseAdmin` in inbox/journal stores, protection, quota, health |
| `archiver` | `lib/argus/export/writers/zip-writer.ts` |
| `pdfkit` | `lib/argus/export/packages/pdf-deliver.ts` |

| Package in package.json | ARGUS import detected? |
|-------------------------|------------------------|
| `qrcode` | **No** under `lib/argus`, `app/argus`, `app/api/argus` |
| `@xyflow/react` | **No** in ARGUS trees (Forge likely) |
| `d3-force-3d`, `three`, `react-force-graph-3d`, `three-spritetext` | **No** in ARGUS trees (Forge/3D) |

Node built-ins used: `fs`, `path`, `crypto`, `stream`.

### 6.2 Internal import patterns

- **Canonical data access:** UI/API → `server-storage` (doc: never paths directly — `argus-storage.md:84`).  
- **v2 view models:** pages → `lib/argus/v2/*` → `types` / `network` / `hierarchy` / `server-storage` (loaders often pure; pages call `readArgus`).  
- **Auth:** `@/lib/auth/*` from actions, layouts, API.  
- **Lib → App reverse imports (type/runtime coupling):**  
  - `create-flow-types.ts` → `@/app/argus/components/ReferencePickerModal`  
  - `create-link-flow-state.ts` → `@/app/argus/actions`  
  - `link-modal-adapter.ts` → actions + ReferencePickerModal  
  - `v2/network-contact-loaders.ts` → ReferencePickerModal  

### 6.3 Circular risks mentioned in docs

**None found.** Ripgrep for `circular` / `import cycle` / `dependency cycle` under `md/` — no ARGUS hits.

**Observable coupling risk (code fact, not doc):** `lib/argus` importing `@/app/argus/*` creates a reverse dependency from library layer to UI layer (not labeled circular in docs; whether a true cycle exists at build time: **UNKNOWN** without bundler cycle report).

### 6.4 Cross-cutting related packages / tools

- `argus-email-bridge/` — separate Node worker (own `package.json`)  
- `tools/validate-argus-*.ts`, `verify-argus-*.ts`, `backup-argus-supabase.ts`, email setup scripts  

---

## Appendix A — Current routes table (from README)

Cited `md/argus/README.md:110–123`: Home `/argus/v2`, Inbox, Deliver, browse network/orgs/projects/topics/events, person `/argus/v2/network/[id]`, export API, legacy journal/network.

## Appendix B — Evidence Vault request shape

Cited `README.md:223–234`: `POST /api/argus/export` with `package: "evidence_vault"`, `scopeType`, `scopeId`, `includePrivate`.

## Appendix C — Extraction limits

- Full line-by-line purpose of every v2 component body: not expanded beyond export names.  
- Whether production Supabase has which SQL applied: **UNKNOWN** from repo alone.  
- Runtime env (`ARGUS_DATA_DIR`, cloud flags) on this machine: **UNKNOWN** / not required for inventory.  
- Exact body of every server action: listed by name only (73 exports in `actions.ts`).

---

*End of evidence notes. No recommendations.*
