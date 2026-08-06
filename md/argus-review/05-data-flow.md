# 05 — Data flow

**Constraint:** Current data flow only. No redesign.

---

## Inputs

| Input | Path evidence |
|-------|----------------|
| Manual / create+link | UI → `saveUnifiedCreateFlowAction` / `createLogAction` / `createEntityAction` in `app/argus/actions.ts` → `server-storage` `createLog` / `createEntity` |
| Journal register | `(app)/journal`, CaptureSheet/MemoryComposer, `createLogAction` |
| Inbox API | `POST /api/argus/inbox` — Bearer / `X-Argus-Inbox-Token` vs `ARGUS_INBOX_TOKEN` → `createInboxItem` |
| Email intake | `POST /api/argus/email-inbox` → `parseEmailInboxPayload` + `createInboxItem` / `saveAttachment`; worker under `argus-email-bridge/` |
| Inbox triage / link | v2 inbox UI → `linkInboxAction`, `setInboxLinksAction`, `updateInboxTriageAction`, `convertInboxAction`, … |
| Attachments | `saveAttachment` / `appendLogAttachment` / `appendInboxAttachment`; files at `{ARGUS_DATA_DIR}/files/{id}` or Supabase `argus-files` |
| Event chronicle | `appendEventChronicleEntryAction` → may `createLog` with `entityIds: [eventId]` and `topics` from Signals |
| Topic aliases / Event signals | `updateTopicAliasesAction` / `updateEventSignalsAction` → `updateEntity({ linkedTags })` |
| Network AI apply | `apply-network-ai-block.ts` + related actions |
| Runbooks | create/update/copy/progress actions in `actions.ts` |

---

## Persistent storage

| Store | Evidence |
|-------|----------|
| Local JSON | `journal.json` under `ARGUS_DATA_DIR` (`md/integrations/argus-storage.md`); default `{repo}/data/argus` if unset |
| Layout | `journal.json`, `files/`, `meta/storage.json`, reserved `email-cache/`, `annotations/`, `backups/` |
| ArgusData v3 shape | `entities`, `logs`, `inboxItems`, `attachments`, `runbooks`, `runbookProgress?`, `version: 3` (`lib/argus/types.ts`) |
| Cloud journal | Table `argus_journal` jsonb (`supabase/argus-journal.sql`); `journal-store/supabase.ts` |
| Cloud inbox | `argus_inbox_items`, `argus_attachments` (`supabase/argus-inbox.sql`); `inbox-store/supabase.ts` |
| Config switches | `isCloudJournalStore()` / `isCloudInboxStore()` in respective `config.ts` |
| Write safety | `data-safety/write-gate.ts` `writeArgusSafe`; policy blocks ephemeral Vercel without cloud (`data-safety/policy.ts`) |
| Soft delete | `deletedAt` on entities/logs/inbox/attachments; `supabase/argus-protection.sql`; `supabase-protection/*` |
| v01 schema | Draft only — not application read path (`supabase/argus-v01-schema.sql` header; `model-alignment-audit.md`) |

**Whether production has which SQL applied:** UNKNOWN from repository alone.

---

## Memory / process state

| Kind | Evidence |
|------|----------|
| React client state | Component `useState` / hooks in `app/argus/**` |
| URL search params | Browse selection (`selected`, tabs, filters) e.g. events/topics shells |
| Cookies | `argus-auth`, private unlock, delete unlock / delete-auth unlock (`lib/auth/cookies.ts`) |
| Guest lock policy | `lib/auth/guest-workstation-lock.ts`, Supabase `guest-lock-policy` SQL |
| Overlay lock | `lib/argus/use-overlay-lock.ts` |
| Create/link flow state | `lib/argus/create-link-flow-state.ts` |
| Browse view prefs | `lib/argus/v2/browse-view-prefs.ts`, `entity-view-prefs.ts`, card order |
| Recent entities | `lib/argus/v2/recent-entities.ts` |

**In-memory cache of ArgusData across requests:** UNKNOWN (serverless; each `readArgus()` is the documented access path).

---

## Outputs

| Output | Path evidence |
|--------|----------------|
| Quick / Activity Summary | `/api/argus/deliver/quick` → `quick-package.ts` / `quick-package-html.ts`; UI `V2QuickDeliverModal`, Deliver shell |
| Evidence Vault ZIP | `POST /api/argus/export` package `evidence_vault` → `packages/vault.ts` + `writers/zip-writer.ts`; contents `manifest.json`, `evidence.json`, `timeline.json`, `files/*` |
| Export preview | `POST /api/argus/export/preview` → `export/preview.ts` |
| PDF deliver | `export/packages/pdf-deliver.ts` (`pdfkit`) |
| Evidence dossier / portable archive | `packages/evidence-dossier*.ts`; API `deliver/dossier` |
| Share | `deliver/share/route.ts` + `export/deliver-shares.ts` |
| JSON snapshot | `packages/json-snapshot.ts` |
| File download | `GET /api/argus/files/[id]` |
| Org Export JSON button | `V2ExportJsonButton` (UI) |

**Collector:** `collectVaultEvidence` (`export/collect-evidence.ts`) + scope via `resolve-scope.ts`.  
**Scopes:** `person` \| `project` \| `organization` \| `topic` \| `event` (`md/argus/README.md`).

---

## Events (domain / system)

| Event kind | Meaning in repo |
|------------|-----------------|
| `Log.kind === "event"` | Journal kind enum value (`types.ts`) |
| Entity with `Kind: Event` in notes | Creatable reference kind / browse “Events” (`reference-types.ts`, `v2/browse/events`) |
| Soft-delete / lifecycle | `deletedAt`, `lifecycleStatus` active\|completed\|archived |
| Inbox status transitions | `pending` → `linked` → `converted` \| `archived` |
| Revalidation | `revalidatePath` / `revalidateArgus` after actions |

**Domain event bus / message queue:** UNKNOWN (not present in Argus trees).

---

## Conversion loop (v3)

Inbox → Journal: `convertInboxToLog` / `convertInboxAction` sets `convertedLogId` / `inboxItemId` (types + model-alignment C1).  
Architecture/storage notes attachment parent move on convert (`md/integrations/argus-storage.md`).

---

## Evidence scope for metrics (current)

| Surface | Scope rule (code/docs) |
|---------|------------------------|
| Topic Patterns / topic loaders | Evidence with topic id in history/inbox links (`topic-loaders.ts` → `buildTagPatternsForScope`) |
| Event Patterns | Event-scoped evidence (`event-loaders.ts`) |
| Tag patterns builder | Counts only `log.topics` / `inbox.topics` in passed arrays — not entity `linkedTags` (`tag-patterns.ts`) |
| Intelligence topic evidence volume | `countEvidenceForTopicIncludingEvents` in `intelligence-viz.ts` (partial rollup of linked events for volume) |
| Intelligence Patterns for topic | Still topic-id-filtered logs/inbox (`intelligence-viz.ts`) |

---

## Flow diagram (as implemented)

```text
External email / API ──► InboxItem (+ Attachments)
                              │
Manual capture ───────────────┼──► Log (Journal) ↔ Entity links
                              │         │
                              ▼         ▼
                         convert     Network views (derived)
                              │
                              ▼
                    Deliver / Export packages
                              │
                              ▼
              files on disk OR Supabase storage
```
