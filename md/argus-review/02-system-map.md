# 02 — System map

**Scope:** Inventory of Argus as present in the repository.  
**Omissions policy:** If a file exists under the listed trees, it appears in the path lists. Purpose is taken from names, headers, exports, or docs — otherwise `UNKNOWN`.

**Counts (2026-08-06):**

| Tree | Files (`.ts` / `.tsx` or route files) |
|------|----------------------------------------|
| `app/argus/` | 172 |
| `lib/argus/` | 128 |
| `app/api/argus/` | 8 |

---

## Directories

### `app/argus/`

| Path | Purpose |
|------|---------|
| `app/argus/` | Argus UI root; `layout.tsx` metadata title `"ARGUS"`; `actions.ts` server actions |
| `app/argus/login/` | Password login; default next `/argus/v2` |
| `app/argus/(app)/` | Legacy app shell (BottomNav, max-width) |
| `app/argus/(app)/journal/` | Legacy journal |
| `app/argus/(app)/inbox/` | Legacy inbox |
| `app/argus/(app)/network/` | Legacy network |
| `app/argus/(app)/projects/` | Legacy projects |
| `app/argus/(app)/logs/` | Legacy log detail |
| `app/argus/(app)/search/` | Search |
| `app/argus/(app)/new/` | New capture |
| `app/argus/(app)/diagnostics/` | Diagnostics |
| `app/argus/components/` | Shared UI (create/link, capture, inbox, forms) |
| `app/argus/v2/` | Primary v2 shell |
| `app/argus/v2/components/` | v2 shared UI components |
| `app/argus/v2/inbox/` | Inbox browse + detail |
| `app/argus/v2/deliver/` | Deliver / Export Center |
| `app/argus/v2/diagnostics/` | Diagnostics |
| `app/argus/v2/help/` | In-app help |
| `app/argus/v2/settings/security/` | Security settings |
| `app/argus/v2/browse/network/` | Network browse |
| `app/argus/v2/browse/organizations/` | Organization browse |
| `app/argus/v2/browse/projects/` | Project browse |
| `app/argus/v2/browse/topics/` | Topics browse |
| `app/argus/v2/browse/events/` | Events browse |
| `app/argus/v2/network/[id]/` | Person detail |
| `app/argus/v2/organizations/[id]/` | Organization detail |
| `app/argus/v2/projects/[id]/` | Project detail |
| `app/argus/v2/runbooks/[id]/` | Runbook detail |

### `lib/argus/`

| Path | Purpose |
|------|---------|
| `lib/argus/` | Domain library root |
| `lib/argus/v2/` | v2 loaders, browse utils, hierarchy, timelines, patterns |
| `lib/argus/export/` | Deliver/export collector + packages |
| `lib/argus/export/packages/` | Package builders (vault, quick, dossier, pdf, json) |
| `lib/argus/export/writers/` | ZIP writer (`archiver`) |
| `lib/argus/storage/` | Paths, bootstrap, quota |
| `lib/argus/journal-store/` | Cloud journal JSON blob |
| `lib/argus/inbox-store/` | Cloud inbox + attachments |
| `lib/argus/data-safety/` | Write gate, backup, policy, counts |
| `lib/argus/supabase-protection/` | Soft-delete, migrate gate, export helpers |
| `lib/argus/persistence/` | Persistence error formatting |
| `lib/argus/health/` | Subsystem health report |

### `app/api/argus/`

| Path | Purpose |
|------|---------|
| `app/api/argus/inbox/` | Token inbox create API |
| `app/api/argus/email-inbox/` | Email intake API |
| `app/api/argus/files/[id]/` | Attachment file download |
| `app/api/argus/export/` | Evidence Vault / export POST |
| `app/api/argus/export/preview/` | Export preview |
| `app/api/argus/deliver/quick/` | Quick package |
| `app/api/argus/deliver/dossier/` | Dossier deliver |
| `app/api/argus/deliver/share/` | Share deliver |

### Supabase SQL (Argus-named)

| Path | Purpose (from file headers) |
|------|------------------------------|
| `supabase/argus-inbox.sql` | `argus_inbox_items` + `argus_attachments`; bucket `argus-files` |
| `supabase/argus-inbox-private.sql` | `private` column |
| `supabase/argus-inbox-triage.sql` | `follow_up_date`, `topics[]` |
| `supabase/argus-journal.sql` | `argus_journal` jsonb v3 blob |
| `supabase/argus-protection.sql` | soft delete, RLS, hard-delete blocks |
| `supabase/argus-setup.sql` | all-in-one setup |
| `supabase/argus-storage-quota.sql` | `argus_db_bytes()` RPC |
| `supabase/argus-v01-schema.sql` | **DRAFT FOR REVIEW ONLY** — v01 domain tables |

### Related (outside primary trees)

| Path | Note |
|------|------|
| `md/argus/` | Argus MD library |
| `md/integrations/argus-*.md` | Constitution, storage, email, design principles |
| `middleware.ts` | Auth + legacy redirects via `argusLegacyRedirectUrl` |
| `lib/auth/` | Session, passwords, TOTP, cookies, guest lock |
| `argus-email-bridge/` | Separate email worker package |
| `tools/*argus*` | Validate/verify/backup/deploy scripts |
| `lib/argusforge/`, `app/forge/` | ArgusForge — separate product surface; not inventoried as Argus core |

---

## Major modules

1. **Persistence façade:** `lib/argus/server-storage.ts` + `storage/*` + `journal-store/*` + `inbox-store/*` + `data-safety/*`
2. **Domain types:** `types.ts`, `reference-types.ts`, `normalize.ts`, `migrate.ts`
3. **Server actions UI bridge:** `app/argus/actions.ts` (73 `export async function`)
4. **Create / link:** `create-flow-*`, `link-hierarchy`, `link-modal-adapter`, `app/argus/components/ArgusCreate*`
5. **v2 presentation loaders:** `lib/argus/v2/*` + `app/argus/v2/**`
6. **Network intelligence:** `network.ts`, `network-intelligence.ts`, `network-relationship-metrics.ts`, `network-ai-*`
7. **Deliver/export:** `lib/argus/export/**` + `app/api/argus/{export,deliver}/**` + `app/argus/v2/deliver/**`
8. **Protection / health:** `supabase-protection/*`, `delete-gate*`, `health/status.ts`
9. **Runbooks:** types in `types.ts`; helpers + actions; UI under `v2/runbooks` and runbook components

---

## Major files (library root)

| Path | Purpose | Dependencies (imports) |
|------|---------|------------------------|
| `lib/argus/types.ts` | v3 runtime types: `Entity`, `Log`, `InboxItem`, `Attachment`, `Runbook`, `ArgusData` | `./network-relationship-metrics` |
| `lib/argus/reference-types.ts` | `ReferenceKind` + Kind notes helpers | `./types` |
| `lib/argus/server-storage.ts` | Sole read/write façade | `./data-safety`, `./storage`, `./migrate`, `./normalize`, inbox/journal stores, `./link-hierarchy`, … |
| `lib/argus/normalize.ts` | Normalize ArgusData / logs / inbox | `./types` |
| `lib/argus/migrate.ts` | `migrateToV3` | `./types`, `./normalize` |
| `lib/argus/labels.ts` | Display labels for enums | `./types`, `./network-intelligence` |
| `lib/argus/ux-copy.ts` | Product strings | (none) |
| `lib/argus/journal-helpers.ts` | Kind inference, pickers, tag buckets | `./types`, `./tag-limits` |
| `lib/argus/journal-behavior.ts` | Note↔log transitions | `./types` |
| `lib/argus/link-hierarchy.ts` | Allowed link targets by source | `./types`, `./journal-helpers` |
| `lib/argus/network.ts` | Derived network views from journal | `./types`, `./context` |
| `lib/argus/network-intelligence.ts` | Health / attention scores | `./types` |
| `lib/argus/delete-gate.ts` | Delete auth gates | `@/lib/auth/*`, `./types` |
| `lib/argus/tag-limits.ts` | Tag picker/cloud/pattern constants | (none) |
| `app/argus/actions.ts` | All Argus server actions | `@/lib/argus/*`, `@/lib/auth/*` |

---

## `lib/argus/v2/` major files

| Path | Purpose |
|------|---------|
| `hierarchy.ts` | Lens rules (org/project/person/topic/event evidence scope) |
| `topic-loaders.ts` / `topic-browse-utils.ts` / `topic-signals.ts` | Topic browse/detail |
| `event-loaders.ts` / `event-browse-utils.ts` / `event-chronicle.ts` / `event-record.ts` | Event browse/detail/chronicle |
| `tag-patterns.ts` | Pattern counting from evidence tags |
| `intelligence-viz.ts` | Home/intelligence visualizations |
| `inbox-loaders.ts` | Inbox view models |
| `network-browse-utils.ts` / `network-contact-loaders.ts` | Network browse/contact |
| `organization-browse-utils.ts` / `project-browse-utils.ts` | Org/project browse |
| `loaders.ts` | Shared loaders |
| `timeline-builders.ts` / `evidence-stream.ts` | Timeline / evidence streams |
| `nav-items.ts` | Sidebar nav + signals badges |
| `delete-gate-props.ts` | Delete gate props for UI |

---

## `app/argus/components/` file names

ActivityEditPanel, AddContextFlow, AddRegisterCaptureButtons, ArgusAddLauncher, ArgusAddProvider, ArgusAppHeader, ArgusCreateItemDrawer, ArgusCreateLinkMobile, ArgusCreateLinkWindow, ArgusDeleteForm, ArgusInboxStatusRow, ArgusLinkModal, ArgusStatusAlert, ArgusStatusPanel, ArgusUnifiedLinkPanel, AttachmentField, BottomNav, CaptureFab, CaptureSheet, Cards, ClassifyLogForm, CompactRows, create-link-shared, EmailViewer, EntityCreateForm, EntityCreateLauncher, EntityEditForm, EntityEvidenceSection, EntityPicker, EvidenceEmailCard, HomeDetailHeader, HomeExpandableCard, HomeInboxCard, HomeNetworkCard, HomeProjectCard, HomeSectionNav, InboxAttachmentList, InboxTriagePanel, JournalEntryForm, JournalHome, JournalKindTokens, MemoryComposer, MemoryStreamRow, NetworkEntityCard, NetworkRelationshipMetricsDisplay, NetworkRelationshipMetricsFields, PinnedEntities, PrivateLockMenu, PrivatePanel, ProjectEditForm, ReferenceCreateModal, ReferenceLinkPanel, ReferencePickerModal, StorageWarningBanner, TagPickerModal, ui.

---

## `app/argus/v2/components/` file names

BrowseBoardColumnHeader, RunbookAiBulkPanel, V2AttachmentComposer, V2BrowseStatusFilter, V2BuildBadge, V2CreateEntityButton, V2DayPicker, V2DesktopShell, V2DetailCompactHeader, V2EntityChronicleRail/Section, V2EntityLifecycleActions, V2EntityLinksTab, V2EntityNeighborhoodPanel, V2EntityRunbooksTab, V2EntityTable, V2EntityTimelineSection, V2EntityViewer, V2ExportJsonButton, V2HomeClient, V2HomeIntelligencePanel, V2HomeMainShell, V2HomePulse, V2IntelligenceFocusBanner, V2IntelligenceLens, V2KnowledgeGraph, V2KnowledgeTreemap, V2MobileMenuProvider, V2MobileUnlockedManageBar, V2OpenCaptureButton, V2OrgShell/Tabs/Timeline, V2PageIdBadge, V2PortfolioBubbleMatrix, V2PrivateEvidenceGate, V2ProjectActions/RunbooksPanel/RunbooksTab/ScopeToggle/Shell/Tabs, V2QuickDeliverModal, V2RecordRecentEntity, V2RelationshipChart, V2RightPanel, V2RunbookCreateStrip, V2RunbookWorkPanel, V2Sidebar/Recent, V2StorageGaugePanel, V2TabBar, V2TagCloud, V2TagPatternBadges, V2Timeline, V2TopBar/AddMenu, V2VocabularyListEditor, v2-ui.

---

## API routes — key dependencies

| Route file | Key imports |
|------------|-------------|
| `app/api/argus/inbox/route.ts` | `server-storage`, `types` — token `ARGUS_INBOX_TOKEN` |
| `app/api/argus/email-inbox/route.ts` | `email-inbox`, `inbox-api-auth`, `server-storage` |
| `app/api/argus/files/[id]/route.ts` | auth cookies, `server-storage`, `email-view` |
| `app/api/argus/export/route.ts` | collect + vault/pdf/json packages, `server-storage` |
| `app/api/argus/export/preview/route.ts` | `export/preview`, `server-storage` |
| `app/api/argus/deliver/quick/route.ts` | quick-package HTML/MD |
| `app/api/argus/deliver/dossier/route.ts` | dossier packages |
| `app/api/argus/deliver/share/route.ts` | `deliver-shares`, dossier HTML |

---

## Complete path lists

### `app/api/argus/` (complete)

```text
app/api/argus/deliver/dossier/route.ts
app/api/argus/deliver/quick/route.ts
app/api/argus/deliver/share/route.ts
app/api/argus/email-inbox/route.ts
app/api/argus/export/preview/route.ts
app/api/argus/export/route.ts
app/api/argus/files/[id]/route.ts
app/api/argus/inbox/route.ts
```

### `lib/argus/` top-level `.ts` files (complete)

```text
lib/argus/apply-network-ai-block.ts
lib/argus/argus-legacy-redirects.ts
lib/argus/attachment-log.ts
lib/argus/build-info.ts
lib/argus/context.ts
lib/argus/create-flow-helpers.ts
lib/argus/create-flow-types.ts
lib/argus/create-link-flow-state.ts
lib/argus/delete-gate.ts
lib/argus/delete-link-check.ts
lib/argus/email-html.ts
lib/argus/email-inbox.ts
lib/argus/email-view.ts
lib/argus/entity-evidence.ts
lib/argus/entity-lifecycle.ts
lib/argus/entity-private-evidence.ts
lib/argus/home-helpers.ts
lib/argus/inbox-api-auth.ts
lib/argus/inbox-enrich.ts
lib/argus/inbox-entity-links.ts
lib/argus/journal-behavior.ts
lib/argus/journal-event-origin.ts
lib/argus/journal-helpers.ts
lib/argus/labels.ts
lib/argus/link-hierarchy.ts
lib/argus/link-modal-adapter.ts
lib/argus/migrate.ts
lib/argus/network-ai-block.ts
lib/argus/network-ai-brief.ts
lib/argus/network-ai-mechanics.ts
lib/argus/network-ai-snapshot.ts
lib/argus/network-dialogue.ts
lib/argus/network-intelligence.ts
lib/argus/network-relationship-metrics.ts
lib/argus/network.ts
lib/argus/normalize.ts
lib/argus/private-access.ts
lib/argus/project-evidence-scope.ts
lib/argus/project-evidence.ts
lib/argus/reference-types.ts
lib/argus/register-infer.ts
lib/argus/runbook-ai-bulk.ts
lib/argus/runbook-helpers.ts
lib/argus/server-storage.ts
lib/argus/tag-limits.ts
lib/argus/types.ts
lib/argus/use-overlay-lock.ts
lib/argus/ux-copy.ts
```

### Full trees

Complete sorted path lists (no omissions for source files):

- [`appendix-app-argus-files.txt`](appendix-app-argus-files.txt) — 172 paths
- [`appendix-lib-argus-files.txt`](appendix-lib-argus-files.txt) — 128 paths

Counts verified: 172 + 128 + 8 = 308.

---

## Server actions inventory (`app/argus/actions.ts`)

73 exports named `export async function`. Complete list:

- [`appendix-actions-exports.txt`](appendix-actions-exports.txt)
