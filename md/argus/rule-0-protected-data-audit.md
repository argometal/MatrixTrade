# ARGUS Rule 0 — Protected Data Audit

**Date:** 2026-07-04  
**Scope:** Audit only — maps protected objects to storage, write paths, delete/reset paths, migration/seed paths, and safety controls. No code changes.  
**Repo state:** Post R0.1–R0.5 implementation (`writeArgusSafe`, Supabase journal store option, wipe gates, verify tool).  
**Canonical order (must never be deleted, reset, overwritten, or silently recreated):**

1. **Inbox**
2. **Evidence**
3. **Relationships**
4. **People**

---

## 1. Model mapping (code ↔ protected order)

| Protected object | Primary types in `lib/argus/types.ts` | What it is in ARGUS v3 |
|------------------|---------------------------------------|-------------------------|
| **Inbox** | `InboxItem`, inbox-scoped `Attachment` | Raw intake (email, API, manual, file) before or after triage |
| **Evidence** | `Log`, journal-scoped `Attachment` | Journal records (log / event / follow_up) and their file artifacts |
| **Relationships** | Fields on `Log`, `InboxItem`, `Entity` — not a separate table | Links between evidence, inbox, and references |
| **People** | `Entity` (`type: "person"`; also `company`, `project`, `other` in same array) | Network references; **People** in Rule 0 order maps to person/company/project `Entity` rows |

**Relationship fields (stored, not derived):**

| Field | On | Meaning |
|-------|-----|---------|
| `Log.entityIds` | Evidence → People/refs | Which references a journal entry is about |
| `InboxItem.linkedEntityIds` | Inbox → People/refs | Triage links before/after convert |
| `InboxItem.convertedLogId` | Inbox → Evidence | Which log was created from this inbox item |
| `Entity.linkedPersonIds` | Project → People | Project ↔ person/company links |
| `Entity.linkedTags` | Project → topics | Tag strings on projects (not entity–entity edges) |

**Derived (read-only, not persisted):** `EntityNetworkView.relatedEntityIds`, `EntityIntelligence.relatedEntityIds` — computed from shared `Log.entityIds` co-occurrence in `lib/argus/network-intelligence.ts`.

---

## 2. Where each protected object is stored

### 2.1 Storage toggles

| Env var | Values | Effect |
|---------|--------|--------|
| `ARGUS_DATA_DIR` | Path or unset | Root for filesystem journal + local files + backups |
| `ARGUS_INBOX_STORE` | unset / `supabase` | Inbox in journal JSON vs Supabase tables |
| `ARGUS_JOURNAL_STORE` | unset / `supabase` | Journal blob in filesystem vs `argus_journal` table |

Path resolution: `lib/argus/storage/paths.ts` → `{ARGUS_DATA_DIR or cwd/data/argus}/journal.json`, `files/`, `backups/`, `meta/`.

### 2.2 Inbox (priority 1)

| Mode | Metadata | Binaries |
|------|----------|----------|
| **Filesystem** (`ARGUS_INBOX_STORE` unset) | `ArgusData.inboxItems[]` inside `journal.json` | `{root}/files/{id}` or Supabase if parent is inbox and cloud inbox enabled |
| **Supabase** (`ARGUS_INBOX_STORE=supabase`) | `public.argus_inbox_items` (`supabase/argus-inbox.sql`) | `public.argus_attachments` + Storage bucket `argus-files` (`lib/argus/inbox-store/supabase.ts`) |

**Production typical:** inbox on Supabase; journal blob may still be filesystem or Supabase depending on `ARGUS_JOURNAL_STORE`.

### 2.3 Evidence (priority 2)

| Component | Metadata | Binaries |
|-----------|----------|----------|
| **Logs** | `ArgusData.logs[]` in journal store | — |
| **Journal attachments** | `ArgusData.attachments[]` ( `parentType: "journal"` ) | Filesystem `{root}/files/{id}` **or** Supabase Storage when `ARGUS_JOURNAL_STORE=supabase` (`lib/argus/journal-store/attachments.ts`) |

Journal store:

| Mode | Location |
|------|----------|
| Filesystem | `{ARGUS_DATA_DIR}/journal.json` |
| Supabase | `public.argus_journal` row `id='primary'`, column `data` (full v3 JSON blob) (`supabase/argus-journal.sql`) |

### 2.4 Relationships (priority 3)

Relationships are **embedded** in Inbox, Evidence, and People records — they move with whichever store holds the parent object:

| Relationship data | Stored in |
|-------------------|-----------|
| `Log.entityIds`, `Log.inboxItemId` | Journal blob (`logs[]`) |
| `InboxItem.linkedEntityIds`, `convertedLogId` | Supabase inbox **or** `journal.json` `inboxItems[]` |
| `Entity.linkedPersonIds`, `linkedTags` | Journal blob (`entities[]`) |

No separate relationship table exists in v3 or in deployed SQL.

### 2.5 People (priority 4)

| Data | Location |
|------|----------|
| All `Entity` rows (person, company, project, other) | Journal blob `ArgusData.entities[]` only |
| Never in Supabase inbox tables | Inbox tables only reference entity IDs by string |

---

## 3. Write paths (every mutation entry point)

### 3.1 Inbox

| Path | Module | Operation | Safety gate |
|------|--------|-----------|-------------|
| `createInboxItem()` | `server-storage.ts` → cloud or JSON | Insert inbox row | **No** `writeArgusSafe` on Supabase path; JSON path uses `writeArgusSafe` |
| `linkInboxToEntities()` | same | Update `linked_entity_ids`, status | same |
| `archiveInboxItem()` | same | Status → `archived` | same |
| `appendInboxAttachment()` | same | Append attachment id to inbox | same |
| `saveAttachment(..., "inbox", ...)` | same | Upload binary + metadata | Supabase direct insert; JSON also writes journal |
| `convertInboxToLog()` | `server-storage.ts` | Creates log, updates inbox status | **Always reads/writes journal JSON inbox slice** — does not update Supabase inbox when cloud inbox enabled (desync risk) |
| `POST /api/argus/email-inbox` | `app/api/argus/email-inbox/route.ts` | Email intake | Calls `createInboxItem` + attachments |
| `POST /api/argus/inbox` | `app/api/argus/inbox/route.ts` | Generic intake | Calls `createInboxItem` |
| `linkInboxAction`, `archiveInboxAction`, `convertInboxAction` | `app/argus/actions.ts` | UI server actions | Delegate to above |
| `tools/verify-argus-inbox-schema.ts` | tools | Live POST to production email API | Creates real inbox row (no safety protocol) |
| `tools/test-email-inbox.ts`, `simulate-email-worker-intake.ts` | tools | Test POSTs | Creates inbox rows |

### 3.2 Evidence

| Path | Module | Operation | Safety gate |
|------|--------|-----------|-------------|
| `createLog()` | `server-storage.ts` | Append log | `writeArgusSafe` (blocked on Vercel without cloud journal) |
| `updateLog()` | same | Edit log fields incl. `entityIds` | same |
| `classifyLog()` | same | Set `entityIds`, classification | same |
| `appendLogAttachment()` | same | Link attachment id to log | same |
| `saveAttachment(..., "journal", ...)` | same | Binary + metadata | Journal gate + optional Supabase Storage upload |
| `createLogAction`, `updateLogAction`, `classifyLogAction` | `app/argus/actions.ts` | UI | Delegate; `createLogAction` catches `ArgusWriteBlockedError` |
| `convertInboxToLog()` | `server-storage.ts` | Inbox → log + attachment parent reassignment | Journal `writeArgusSafe` only |
| `tools/validate-argus-capture.ts` | tools | `createLog()` test note | Uses journal write gate |
| `tools/verify-argus-data-safety.ts --write-test` | tools | Probe entity + log | Uses journal write gate |

### 3.3 Relationships

Relationships change only as side effects of other writes — no dedicated API:

| Path | What relationship fields change |
|------|----------------------------------|
| `createLog` / `updateLog` / `classifyLog` | `Log.entityIds` |
| `linkInboxToEntities` | `InboxItem.linkedEntityIds`, status |
| `convertInboxToLog` | Merges inbox links into log; sets `convertedLogId`; reassigns attachment parents |
| `updateEntity` / `updateProjectAction` | `linkedPersonIds`, `linkedTags` |
| `createEntity` (via `resolveEntityIds` in actions) | New entity; may immediately link via log/inbox |
| `deleteEntity` | **Strips** id from all `log.entityIds` and `inbox.linkedEntityIds` |
| `deleteLog` | Clears `convertedLogId` on linked inbox items; reverts status |
| `migrateToV3` / `normalizeArgusData` | Recomputes inbox status from links; backfills attachment parents |

All journal-side relationship mutations go through `writeArgus()` → `writeArgusSafe` except Supabase inbox updates (inbox links only).

### 3.4 People

| Path | Module | Operation | Safety gate |
|------|--------|-----------|-------------|
| `createEntity()` | `server-storage.ts` | Insert entity | `writeArgusSafe` |
| `updateEntity()` | same | Patch name, notes, alias, strategicValue, project fields | same |
| `createEntity` via `resolveEntityIds()` | `app/argus/actions.ts` | Inline create from capture/inbox/link forms | same |
| Reference create modals | UI → server actions | Client collects name/type; server creates entity | same |

People are **only** in the journal blob; no Supabase people table.

---

## 4. Delete / reset paths

### 4.1 Full reset (all protected objects)

| Path | Destroys | Supabase inbox? | Gate |
|------|----------|-----------------|------|
| `clearAllArgusData()` | Journal → `emptyArgus()`; deletes all files in `{root}/files/` | **No** — cloud inbox untouched | `isDestructiveAllowed()` — blocked on Vercel/prod unless `ARGUS_ALLOW_DESTRUCTIVE=1` |
| `clearAllArgusDataAction()` | Same | Same | Redirect if not allowed; UI hidden unless `isTestingUiEnabled()` |

**Rule 0 gap:** Clear-all claims to wipe ARGUS but leaves Supabase inbox + attachments; journal `inboxItems` array emptied while cloud inbox remains → split-brain.

### 4.2 Per-object deletes

| Path | Inbox | Evidence | Relationships | People |
|------|-------|----------|---------------|--------|
| `deleteInboxItem()` / `deleteInboxAction` | Row + inbox attachment files (Supabase or JSON) | — | Removes inbox-side links | — |
| `deleteLog()` / `deleteLogAction` | Unlinks `convertedLogId`; may revert inbox status | Log + journal attachment files | **Removes log** (and its `entityIds` edges) | — |
| `deleteEntity()` / `deleteEntityAction` | Strips id from `linkedEntityIds` | Strips id from all `log.entityIds` | **Mutates** all edges referencing entity | **Deletes** entity row |
| `removeAttachmentFile()` / `deleteAttachmentsForIds()` | Called from log/inbox delete | Binary delete | — | — |
| `cloudInbox.deleteInboxItem()` | Supabase row + storage objects | — | — | — |

**UI gate:** `ArgusDeleteForm` → browser `confirm()` only. Per-record deletes remain available in production.

**Intent flag:** Journal deletes use `writeArgus(..., "destructive")` so count-drop rollback does not block intentional deletes.

### 4.3 Non-delete mutations that can destroy relationship data

| Path | Effect on relationships |
|------|-------------------------|
| `updateLog` with new `entityIds` | **Overwrites** prior entity links for that log |
| `updateEntity` with new `linkedPersonIds` | **Replaces** project–people links |
| `deleteEntity` | **Removes** all inbound/outbound links to that id |

---

## 5. Migration / seed / bootstrap paths

### 5.1 Schema SQL (operator-run, not app auto-run)

| File | Creates | Touches protected data? |
|------|---------|-------------------------|
| `supabase/argus-inbox.sql` | `argus_inbox_items`, `argus_attachments`, bucket | Empty tables only |
| `supabase/argus-journal.sql` | `argus_journal` with default empty v3 JSON | Default row only |
| `supabase/argus-v01-schema.sql` | Draft ontology | **Not wired to app** — no runtime effect |

### 5.2 App migration / bootstrap (can overwrite or empty)

| Path | Module | Behavior | Protected objects affected |
|------|--------|----------|----------------------------|
| `migrateToV3()` | `lib/argus/migrate.ts` | v2 contacts/entries/evidence → v3 entities/logs/attachments | People, Evidence, Relationships (on read) |
| `readRawJournal()` — missing `journal.json` | `server-storage.ts` | Returns **`emptyArgus()`** silently | All four appear empty |
| `readRawJournal()` — legacy `vault.json` | same | Reads legacy → **`writeArgus(migrated, "bootstrap")`** | Full journal rewrite |
| `readRawJournal()` — cloud journal + local file fallback | same | One-time local → cloud bootstrap write | Full journal |
| `copyLegacyRepoData()` | `storage/bootstrap.ts` | Copies repo `data/argus/journal.json` → external dir if target empty | One-time copy |
| `ensureArgusStorageReady()` | same | Creates dirs; may run copy | No data mutation by itself |
| `normalizeArgusData()` | `lib/argus/normalize.ts` | Normalizes on every Supabase read | May change inbox status inference; backfill attachment parents |
| `writeJournalToSupabase()` | `journal-store/supabase.ts` | Full blob upsert | Entire journal document replace |

Bootstrap/migration writes use intent `"bootstrap"` — **exempt from count-drop rollback** in `isUnexpectedDrop()`.

### 5.3 Seed scripts

| Script | ARGUS impact |
|--------|--------------|
| `tools/seed-supabase.ts` | Trades/playbooks only — **does not touch ARGUS** |
| No ARGUS seed script | — |

### 5.4 Test / operator tools that write user-visible data

| Script | Writes |
|--------|--------|
| `tools/verify-argus-inbox-schema.ts` | Production inbox via POST |
| `tools/test-email-inbox.ts`, `simulate-email-worker-intake.ts` | Inbox rows |
| `tools/validate-argus-capture.ts` | Test log (Evidence) |
| `tools/verify-argus-data-safety.ts --write-test` | Probe entity + log |

---

## 6. Backups, count checks, rollback — by store

### 6.1 Journal store (`writeArgusSafe`)

**Module:** `lib/argus/data-safety/write-gate.ts`, `backup.ts`, `counts.ts`

| Step | Implemented? | Scope |
|------|--------------|-------|
| Backup before write | Yes | Snapshot prior `journal.json` or prior Supabase blob JSON → `{root}/backups/journal-{timestamp}.json` (rotate 20) |
| Validate backup exists | Yes | `assertBackupExists` when backup path non-empty |
| Count before/after | Yes | `entities`, `logs`, `inboxItems`, `attachments` **inside journal blob only** |
| Rollback on unexpected drop | Yes | Filesystem restore or `restoreJournalToSupabase`; throws `ArgusDataSafetyError` |
| Block writes on ephemeral prod | Yes | `isJournalWriteBlocked()` on Vercel without `ARGUS_JOURNAL_STORE=supabase` |

**Exemptions:** intent `destructive` or `bootstrap` skip unexpected-drop detection.

**Gaps vs protected order:**

- Does **not** count or backup **Supabase inbox rows** when `ARGUS_INBOX_STORE=supabase`.
- Journal blob `inboxItems` count may be **0** while cloud inbox has data — count check gives false confidence.
- Attachment **binary** deletes (log/inbox delete) are not backed up before unlink.
- Cloud write failure rollback for journal restores blob only; Storage objects may be orphaned.

### 6.2 Supabase inbox store

| Control | Status |
|---------|--------|
| Backup before insert/update/delete | **None** in app |
| Count verification | **None** |
| Rollback | **None** — direct Supabase mutations |
| Supabase platform backup | Operator responsibility (PITR, etc.) |

### 6.3 Attachment binaries

| Location | Backup before delete? |
|----------|----------------------|
| Local `files/` | No |
| Supabase `argus-files` | No app-level backup; `remove()` on delete |

---

## 7. Survival by event (protected order)

| Event | Inbox | Evidence | Relationships | People |
|-------|-------|----------|---------------|--------|
| **Repo update** (git pull) | Safe if external `ARGUS_DATA_DIR` or Supabase | Same | Stored in journal/inbox | Same |
| **Deploy (Vercel)** | Safe if `ARGUS_INBOX_STORE=supabase` | Safe only if `ARGUS_JOURNAL_STORE=supabase`; else **blocked or lost** | In journal blob — same as Evidence/People | Same |
| **Schema change (SQL)** | Manual DDL; app does not auto-migrate v01 | Journal table DDL separate | Embedded in blob | Same |
| **Seed** | No ARGUS seed | No ARGUS seed | — | — |
| **Migration (`migrateToV3`, vault boot)** | Inbox not in v2 legacy | Transforms evidence → logs | Rebuilt from legacy links | contacts → entities |
| **Refactor / CRUD** | Cloud inbox: unguarded writes | Journal: gated | Updated with parent writes | Journal: gated |
| **Failed write** | No inbox rollback | Journal rollback if count drop (non-destructive intent) | Restored with journal rollback | Same |
| **App restart** | Reloads from Supabase or disk | Reloads from journal store | Reloads with parent records | Same |
| **Silent empty store** | Cloud inbox unaffected; JSON mode returns empty inbox | `emptyArgus()` if no journal file | Lost with empty journal | Lost with empty journal |

---

## 8. Split-brain and coherence risks

```text
Production (typical today):
  Inbox     → Supabase (argus_inbox_items)     ✅ durable
  Evidence  → journal.json on Vercel FS        ❌ OR Supabase if ARGUS_JOURNAL_STORE set
  People    → same journal blob                 ❌ OR ✅ with cloud journal
  Relationships → split across Supabase inbox rows + journal blob
```

| Risk | Detail |
|------|--------|
| **Dual inbox** | Cloud inbox active but `journal.inboxItems` in blob often empty — journal count check ignores real inbox volume |
| **`convertInboxToLog`** | Uses `readArgus()` inbox slice only — **fails or no-ops** against cloud-only inbox items |
| **`clearAllArgusData`** | Wipes journal + local files; **does not** delete Supabase inbox |
| **`deleteEntity`** | Allowed in prod; destroys People and mutates Relationships without typed confirmation |
| **Attachment parent handoff** | Convert reassigns inbox attachments to journal in blob metadata; cloud inbox attachment rows unchanged |

---

## 9. Rule 0 verdict by protected object

| # | Object | Durable store available? | Write gate? | Delete/reset gated? | Rule 0 protected? |
|---|--------|--------------------------|-------------|---------------------|-------------------|
| 1 | **Inbox** | Yes (Supabase) | **No** app gate | Per-delete confirm only; no backup | **Partial** — survives deploy if cloud; writes unguarded |
| 2 | **Evidence** | Yes (if `ARGUS_JOURNAL_STORE=supabase`) | Yes (`writeArgusSafe`) | Per-delete confirm; clear-all gated | **Conditional** — proven only with cloud journal + operator DDL |
| 3 | **Relationships** | Same as parent records | Journal links gated; inbox links not | Deleted indirectly via entity/log/inbox delete | **Partial** — no integrity checks on edge counts |
| 4 | **People** | Same as journal | Yes | `deleteEntity` exposed in prod | **Conditional** — same as Evidence |

**Overall:** Rule 0 **Protected Data Order is not fully proven** in production until:

1. `ARGUS_JOURNAL_STORE=supabase` is set and `supabase/argus-journal.sql` applied.
2. Inbox write path gets equivalent safety or explicit acceptance that Supabase platform backup is sufficient.
3. Split-brain paths (`convertInboxToLog`, `clearAll`, count scope) are resolved or documented as operator constraints.

---

## 10. Inventory summary tables

### 10.1 Write path count

| Store | Gated writes | Ungated writes |
|-------|--------------|----------------|
| Journal blob | ~15 `writeArgus` call sites via `writeArgusSafe` | — |
| Supabase inbox | 0 | create, link, archive, append attachment, delete, save attachment |
| Supabase journal blob | Via `writeArgusSafe` cloud branch | — |
| Attachment Storage | Upload/remove direct | remove on delete |

### 10.2 Delete / reset path count

| Severity | Paths |
|----------|-------|
| Total wipe | `clearAllArgusData` (+ action) |
| Object delete | `deleteInboxItem`, `deleteLog`, `deleteEntity` (+ actions) |
| Binary delete | `removeAttachmentFile`, `cloudInbox` storage remove, `removeJournalAttachmentBytes` |
| Relationship strip | `deleteEntity`, `updateLog`, `deleteLog` (inbox unlink) |

### 10.3 Migration / seed path count

| Type | Count | Auto-run on boot? |
|------|-------|-------------------|
| SQL DDL files | 2 ARGUS (+ 1 draft v01) | No — operator |
| App migrations | `migrateToV3`, legacy vault boot, legacy dir copy | Yes on first read / boot |
| Seeds | 0 for ARGUS | — |

---

## 11. References

| Code / doc | Relevance |
|------------|-----------|
| `lib/argus/server-storage.ts` | All CRUD orchestration |
| `lib/argus/inbox-store/supabase.ts` | Cloud inbox I/O |
| `lib/argus/journal-store/supabase.ts` | Cloud journal blob |
| `lib/argus/data-safety/*` | Rule 0 write gate |
| `lib/argus/migrate.ts` | v2 → v3 migration |
| `lib/argus/storage/bootstrap.ts` | Boot copy + dirs |
| `app/argus/actions.ts` | UI server actions |
| `app/api/argus/email-inbox/route.ts`, `inbox/route.ts` | Intake APIs |
| `tools/verify-argus-data-safety.ts` | Journal proof smoke test |
| `md/argus/p0-data-safety-audit.md` | Prior storage audit + Rule 0 checklist |

**Audit complete.** No code changes in this pass.
