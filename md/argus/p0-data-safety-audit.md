# ARGUS P0 — Data Safety Audit

**Date:** 2026-07-04  
**Scope:** Audit only — no schema changes, no feature work, no migration, no code in this pass.  
**Problem statement:** User data is lost after repo updates / deploys.

---

## Executive summary

ARGUS data is **not safe on production (Vercel)** today. Journal data (entities, logs, most attachments) is stored on the **serverless filesystem**, which is **ephemeral per deploy**. Inbox email may persist in **Supabase** when `ARGUS_INBOX_STORE=supabase`, but the rest of ARGUS does not — creating a **split-brain** store where emails survive while notes and people disappear.

Additionally:

- **No backup runs before writes** (despite a reserved `backups/` directory).
- **Destructive controls are exposed in the UI** (`Clear all ARGUS data`, per-record deletes) with only a browser `confirm()` gate.
- **Silent empty store:** missing `journal.json` bootstraps as empty v3 data with no user warning.
- **`getStorageDiagnostics()` exists but is not shown** anywhere in the UI.

**Root cause of “lost after deploy”:** Production reads/writes `{cwd}/data/argus/journal.json` (non-persistent on Vercel) while local dev uses `ARGUS_DATA_DIR` on disk — behavior differs by environment.

---

## 1. Where ARGUS data is stored today

### 1.1 Primary journal store (entities, logs, inbox JSON mode, attachment metadata)

| Property | Value |
|----------|--------|
| **Module** | `lib/argus/server-storage.ts` → `readRawJournal()` / `writeArgus()` |
| **File** | `{ARGUS_DATA_DIR}/journal.json` |
| **Fallback** | `{repo}/data/argus/journal.json` when `ARGUS_DATA_DIR` unset |
| **Format** | `ArgusData` v3 JSON: `entities`, `logs`, `inboxItems`, `attachments`, `version: 3` |
| **Binary files** | `{ARGUS_DATA_DIR}/files/{attachmentId}` (opaque id, no extension) |
| **Boot metadata** | `{ARGUS_DATA_DIR}/meta/storage.json` |

**Resolution order** (`lib/argus/storage/paths.ts`):

```text
ARGUS_DATA_DIR env (trimmed) → else process.cwd()/data/argus
```

**Production (Vercel):** `.env.vercel.production` shows `ARGUS_DATA_DIR=""` → empty string is falsy after trim → **falls back to repo `data/argus/`**, which is **wiped on redeploy**.

**Local dev (correct pattern):** `ARGUS_DATA_DIR=C:\Users\...\ArgusData` — persists outside repo.

### 1.2 Cloud inbox store (optional — production email path)

| Property | Value |
|----------|--------|
| **Toggle** | `ARGUS_INBOX_STORE=supabase` |
| **Module** | `lib/argus/inbox-store/supabase.ts` |
| **Tables** | `argus_inbox_items`, `argus_attachments` |
| **Binaries** | Supabase Storage bucket `argus-files` |
| **Scope** | Inbox CRUD only — **not** entities, logs, or journal attachments |

When enabled, inbox operations delegate from `server-storage.ts`; **`readArgus()` / `writeArgus()` still use JSON** for everything else.

### 1.3 Legacy / bootstrap sources

| Source | When used | Risk |
|--------|-----------|------|
| `{repo}/data/health-vault/vault.json` | If `journal.json` missing | One-time read → **writes** migrated v3 to `journal.json` (`readRawJournal`) |
| `{repo}/data/argus/journal.json` | Legacy in-repo | Copied once to external `ARGUS_DATA_DIR` if target empty (`bootstrap.copyLegacyRepoData`) |
| v2 `contacts` / `entries` / `evidence` | Inside old JSON | Transformed by `migrateToV3()` on every read |

### 1.4 What is NOT persisted anywhere durable (production)

| Data | On Vercel today |
|------|-----------------|
| People / organizations / projects (`entities`) | Ephemeral JSON ❌ |
| Notes / logs | Ephemeral JSON ❌ |
| Capture attachments (non-inbox) | Ephemeral `files/` ❌ |
| Project edits, relations on logs | Ephemeral JSON ❌ |
| Inbox emails | Supabase ✅ (if `ARGUS_INBOX_STORE=supabase`) |

### 1.5 Storage topology diagram

```text
                    ┌─────────────────────────────────────┐
                    │           Vercel production          │
                    └─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   journal.json                 files/                    Supabase (optional)
   (EPHEMERAL)                  (EPHEMERAL)               argus_inbox_items
   entities, logs,              log attachments            argus_attachments
   inbox if json mode           capture uploads            argus-files bucket
          │                           │                           │
          └──────── SPLIT BRAIN ──────┴───────────────────────────┘
                    emails may survive; notes/people do not
```

---

## 2. Every code path that deletes, resets, seeds, migrates, or overwrites

### 2.1 Full wipe / reset

| Path | Location | What it destroys | UI exposed? | Clears Supabase inbox? |
|------|----------|------------------|-------------|------------------------|
| **`clearAllArgusData()`** | `lib/argus/server-storage.ts:635` | All files in `files/`; writes `emptyArgus()` to `journal.json` | ✅ `JournalHome` → `ArgusClearAllForm` | ❌ No |
| **`clearAllArgusDataAction()`** | `app/argus/actions.ts:262` | Calls above; redirects to journal | ✅ | ❌ No |

### 2.2 Record delete (user-initiated)

| Path | Location | What it destroys | UI surfaces |
|------|----------|------------------|-------------|
| **`deleteLog()`** | `server-storage.ts:588` | Log row, attachment files + metadata; unlinks `convertedLogId` on inbox | Log detail, `HomeNetworkCard` |
| **`deleteLogAction()`** | `actions.ts:239` | Server action wrapper | Same |
| **`deleteEntity()`** | `server-storage.ts:607` | Entity; strips id from all `log.entityIds` and `inbox.linkedEntityIds` | Network, project, home project/network cards |
| **`deleteEntityAction()`** | `actions.ts:246` | Server action wrapper | Same |
| **`deleteInboxItem()`** | `server-storage.ts:623` | JSON inbox item **or** Supabase row + storage objects | Home inbox, inbox triage |
| **`deleteInboxAction()`** | `actions.ts:254` | Server action wrapper | Same |
| **`cloudInbox.deleteInboxItem()`** | `inbox-store/supabase.ts:246` | Supabase inbox row, attachment rows, `argus-files` objects | Same (when cloud store) |

**Gate today:** `ArgusDeleteForm` → browser `confirm(confirmMessage)` only. No env check, no typed confirmation, no production disable.

### 2.3 Overwrite / full-document replace

| Path | Location | Behavior | Risk |
|------|----------|----------|------|
| **`writeArgus()`** | `server-storage.ts:61` | Atomic replace `journal.json` via `.tmp` + rename | **No backup** before replace |
| **`createEntity` / `updateEntity` / `createLog` / `updateLog` / …** | `server-storage.ts` | Read-modify-write full JSON | Lost update if concurrent; no backup |
| **`convertInboxToLog()`** | `server-storage.ts:476` | Mutates JSON inbox + adds log; **always JSON** (no cloud inbox branch) | Cloud inbox convert may fail or desync |
| **`linkInboxToEntities()`** | cloud + json paths | Updates inbox linkage | Safe mutation |
| **`archiveInboxItem()`** | cloud + json paths | Status change only | Safe |

### 2.4 Migration / bootstrap (can overwrite or empty)

| Path | Location | Behavior | Risk |
|------|----------|----------|------|
| **`migrateToV3()`** | `lib/argus/migrate.ts:53` | Transforms v2 → v3 on read; normalizes v3 | Read-only transform unless caller writes |
| **`readRawJournal()` vault path** | `server-storage.ts:49-52` | If no `journal.json`, reads `vault.json` → **writes migrated file** | One-time upgrade |
| **`readRawJournal()` missing files** | `server-storage.ts:56` | Returns **`emptyArgus()`** silently | **User sees empty app — data appears “lost”** |
| **`copyLegacyRepoData()`** | `storage/bootstrap.ts:38` | Copies repo `data/argus` → external dir if target has no journal | Safe if target empty |
| **`ensureArgusStorageReady()`** | `storage/bootstrap.ts:65` | Creates dirs; may copy legacy | Runs on every storage touch |

**Important:** If `ARGUS_DATA_DIR` points to a **new empty folder**, bootstrap does **not** pull from old location unless repo legacy exists and external file absent — user can accidentally “start fresh.”

### 2.5 API / tools that write ARGUS data

| Path | Location | Writes? | Notes |
|------|----------|---------|-------|
| **`POST /api/argus/email-inbox`** | `app/api/argus/email-inbox/route.ts` | Creates inbox item + attachments | Production intake |
| **`POST /api/argus/inbox`** | `app/api/argus/inbox/route.ts` | Creates inbox item | Bearer token |
| **All `app/argus/actions.ts` create/update** | actions | JSON (+ cloud inbox) | User CRUD |
| **`tools/validate-argus-capture.ts`** | tools | **`createLog()`** test record | Dev validation script |
| **`tools/verify-argus-inbox-schema.ts`** | tools | POST test email to production | Creates real inbox row |
| **`tools/test-email-inbox.ts` / `simulate-email-worker-intake.ts`** | tools | POST test payloads | Creates inbox rows |
| **`tools/seed-supabase.ts`** | tools | Trades/playbooks only | **Not ARGUS journal** |

No ARGUS journal seed script exists. **`seed-supabase.ts` does not touch ARGUS.**

### 2.6 Attachment file delete

| Path | Location | Trigger |
|------|----------|---------|
| **`removeAttachmentFile()`** | `server-storage.ts:569` | `fs.unlink` on `files/{id}`; errors swallowed |
| **`deleteAttachmentsForIds()`** | `server-storage.ts:581` | Called from `deleteLog`, `deleteInboxItem` (json mode) |

---

## 3. Why data is lost after deploy (ranked)

| # | Cause | Mechanism |
|---|-------|-----------|
| **1** | **Ephemeral Vercel filesystem** | `journal.json` and `files/` live under `/var/task` or similar; redeploy = new instance |
| **2** | **`ARGUS_DATA_DIR` not set on Vercel** | Falls back to `data/argus/` inside deployment artifact |
| **3** | **Split storage** | User sees inbox emails (Supabase) but empty people/notes (JSON wiped) — feels like partial loss |
| **4** | **Silent `emptyArgus()`** | Fresh deploy with no file → empty store, no error banner |
| **5** | **Accidental “Clear all”** | Button on home journal page |
| **6** | **Env drift** | Vercel CLI / deploy overwriting local `.env.local` (`ARGUS_DATA_DIR` documented as lost in integrations docs) |
| **7** | **Wrong `ARGUS_DATA_DIR` path** | Malformed env (split line) caused intake failures historically; pointing to empty dir starts fresh |

---

## 4. Required fixes (proposal — do not implement in this pass)

### 4.1 Disable destructive / reset actions unless explicitly confirmed

**Principle:** Production must not offer one-click total data loss.

| Action | Proposed gate |
|--------|----------------|
| **`clearAllArgusDataAction`** | **Disable in production** (`NODE_ENV=production` or `VERCEL=1`) unless `ARGUS_ALLOW_DESTRUCTIVE=1` |
| **`clearAllArgusDataAction`** | Require **typed confirmation** string (`DELETE ALL ARGUS DATA`) in addition to `confirm()` |
| **`clearAllArgusDataAction`** | Hide `ArgusClearAllForm` from `JournalHome` by default; show only when `ARGUS_TESTING_UI=1` |
| **`deleteLog` / `deleteEntity` / `deleteInbox`** | Keep with confirm; add server-side check that record exists and log deletion in `meta/deletions.log` (optional) |
| **`clearAllArgusData`** | When cloud inbox enabled, **must not claim** to clear inbox — today it lies (JSON only) |

**Files to change (future):** `app/argus/actions.ts`, `app/argus/components/JournalHome.tsx`, `lib/argus/server-storage.ts`

### 4.2 Backup-before-write

**Principle:** Every `writeArgus()` should snapshot previous `journal.json` before replace.

| Item | Proposal |
|------|----------|
| **When** | Immediately before `fs.rename(tmp, journalFile)` in `writeArgus()` |
| **Where** | `{ARGUS_DATA_DIR}/backups/journal-{ISO-timestamp}.json` |
| **Rotation** | Keep last **N=20** backups; delete oldest |
| **Also backup** | Optional: copy changed attachment files on delete only (harder); P0 = journal.json only |
| **Restore** | Document manual restore: copy backup over `journal.json`; restart app |
| **Failure** | If backup fails, **abort write** and throw (do not silently skip) |

**Note:** `backupsDir` already created in `bootstrap.ts:73` but **never used**.

**Cloud inbox:** Separate concern — Supabase has its own backup; journal backup does not cover inbox tables.

**Files to change (future):** `lib/argus/server-storage.ts`, optionally `lib/argus/storage/backup.ts`

### 4.3 Visible warning for non-persistent storage

**Principle:** User must see when data will not survive redeploy.

| Condition | Warning level |
|-----------|---------------|
| `!isExternalDataRoot()` **and** `(VERCEL \|\| NODE_ENV=production)` | **Critical banner** — “ARGUS data is stored on ephemeral disk. Notes and references will be lost on deploy.” |
| `!isExternalDataRoot()` on local dev | **Info banner** — “Using repo folder `data/argus/`. Set ARGUS_DATA_DIR for persistence.” |
| `isExternalDataRoot()` | No warning (or subtle “External storage: {path}”) |
| `isCloudInboxStore()` **and** ephemeral journal | **Split warning** — “Email inbox is cloud-backed; notes and people are not.” |
| `journal.json` missing on first read | **Blocking banner** — “No journal found. Starting empty. Check ARGUS_DATA_DIR.” |

**Implementation hook (already exists):** `getStorageDiagnostics()` in `server-storage.ts:541` returns `{ root, external, journalFile, filesDir }`.

**UI placement (minimal, no redesign):** One line banner in `ArgusAppHeader` or top of `JournalHome` — reuse existing header component.

**Files to change (future):** `app/argus/components/ArgusAppHeader.tsx`, `app/argus/(app)/journal/page.tsx`, new `StorageWarningBanner.tsx`

---

## 5. Environment checklist (operator — not code)

| Environment | `ARGUS_DATA_DIR` | `ARGUS_INBOX_STORE` | Journal safe? | Inbox safe? |
|-------------|-------------------|---------------------|---------------|-------------|
| Local dev (recommended) | `C:\Users\...\ArgusData` | `json` or `supabase` | ✅ | ✅ if supabase |
| Vercel prod (current) | unset / `""` | `supabase` | ❌ ephemeral | ✅ |
| Vercel prod (minimum fix) | **Must use external DB** — JSON cannot work | `supabase` | ❌ until journal migrated | ✅ |

**P0 reality:** Without migrating journal off Vercel filesystem, **`ARGUS_DATA_DIR` on Vercel does not create persistent disk** (no attached volumes on Hobby). Persistent journal requires Supabase/Postgres or external object store — **out of scope for this audit’s code freeze**, but must be understood.

**Immediate operator mitigation (no code):**

1. Do not use Vercel-hosted ARGUS for authoritative notes until journal is cloud-backed.
2. Run MatrixTrade locally with `ARGUS_DATA_DIR` for journal work, **or** accept email-only persistence on prod.
3. Back up `ArgusData` folder manually before every deploy / git pull on local.
4. Remove or avoid “Clear all ARGUS data” on any shared/production session.

---

## 6. UI inventory — destructive controls

| Control | Page / component | Action |
|---------|------------------|--------|
| Clear all ARGUS data | `JournalHome` → `ArgusClearAllForm` | `clearAllArgusDataAction` |
| Delete record | `logs/[id]`, `HomeNetworkCard` | `deleteLogAction` |
| Delete reference | `network/[id]`, `projects/[id]`, home cards | `deleteEntityAction` |
| Delete email | `HomeInboxCard`, `InboxTriagePanel` | `deleteInboxAction` |

All use `TESTING.*` copy in `lib/argus/ux-copy.ts` but **Clear all is rendered on main journal home**, not a hidden testing page.

---

## 7. Smallest safe implementation sequence (P0 data safety only)

| Step | Work | Schema? | UI redesign? |
|------|------|---------|--------------|
| **P0.1** | Storage warning banner using `getStorageDiagnostics()` | No | Minimal banner |
| **P0.2** | `backup-before-write` in `writeArgus()` + rotation | No | No |
| **P0.3** | Gate `clearAllArgusData` / hide Clear all in production | No | Hide one form |
| **P0.4** | Fix `clearAll` copy + behavior when `ARGUS_INBOX_STORE=supabase` (warn or block) | No | No |
| **P0.5** | Log when `emptyArgus()` boot path runs; surface in banner | No | Minimal |
| **P0.6** | Document + operator script: manual export `journal.json` | No | No |

**Explicitly deferred (not P0 data safety):** v01 schema migration, product flow reset, Supabase journal store.

---

## 8. Acceptance criteria (P0 data safety)

- [ ] User sees a **visible warning** on Vercel prod that journal data is not persistent.
- [ ] Every `writeArgus()` creates a timestamped backup in `backups/`.
- [ ] **Clear all** cannot run on production without explicit env override.
- [ ] Operator doc lists **exact paths** and backup/restore steps.
- [ ] Audit updated when journal moves to durable storage.

---

## 9. References

| Doc / code | Relevance |
|------------|-----------|
| `lib/argus/server-storage.ts` | All journal I/O, deletes, clearAll |
| `lib/argus/storage/paths.ts` | `ARGUS_DATA_DIR` resolution |
| `lib/argus/storage/bootstrap.ts` | Boot migration, `backupsDir` |
| `lib/argus/inbox-store/supabase.ts` | Cloud inbox delete |
| `md/integrations/argus-storage.md` | Intended persistence model |
| `md/integrations/argus-cloud-first-audit.md` | Production gap analysis |
| `.env.vercel.production` | `ARGUS_DATA_DIR=""` |
| `app/argus/components/JournalHome.tsx` | Clear all UI |

**Stop here.** No code changes in this pass.

---

## 10. Rule 0 compliance — “Never Destroy User Data”

**Rule 0 (canonical):**

> User data must survive: repo update · deploy · schema change · seed · migration · refactor · failed write · app restart  
> Before any write/migration: (1) backup · (2) validate backup · (3) run change · (4) verify counts before/after · (5) rollback/stop if unexpected drop  
> Disable any script/button/API that can wipe ARGUS data without explicit confirmation.  
> **No feature work until this is proven.**

### 10.1 Survival matrix — current vs Rule 0

| Event | Rule 0 requires | Current state | Verdict |
|-------|-----------------|---------------|---------|
| **Repo update** (git pull) | Data unchanged | Safe if `ARGUS_DATA_DIR` external; repo `data/argus/` gitignored | ⚠️ Pass locally only |
| **Deploy** (Vercel) | Data unchanged | Journal on ephemeral FS → **wiped** | ❌ **FAIL** |
| **Schema change** (future v01) | Backup + count check + rollback | Not implemented; DDL draft only | ❌ Not ready |
| **Seed** | Must not touch ARGUS user data | `seed-supabase.ts` = trades/playbooks only | ✅ Pass (ARGUS untouched) |
| **Migration** (`migrateToV3`, vault boot) | Backup before write; verify counts | Writes migrated journal **without backup** | ❌ **FAIL** |
| **Refactor** (reads/writes) | Same as write path | Every CRUD via unguarded `writeArgus()` | ❌ **FAIL** |
| **Failed write** | Rollback from backup | Atomic rename only; **no pre-backup** | ❌ **FAIL** |
| **App restart** | Data reloads intact | OK on external disk; empty boot on missing file | ⚠️ Pass / silent fail |

**Overall Rule 0 survival: ❌ NOT PROVEN** — production deploy alone violates the rule.

### 10.2 Write/migration protocol — current vs Rule 0

| Step | Rule 0 | Implemented today | Gap |
|------|--------|-------------------|-----|
| **1. Create backup** | Required before every write/migration | `backupsDir` mkdir only; **never written** | ❌ |
| **2. Validate backup exists** | Must verify before proceeding | None | ❌ |
| **3. Run change** | After 1–2 | `writeArgus()` runs unconditionally | Premature |
| **4. Verify count before/after** | entities, logs, inbox, attachments | None | ❌ |
| **5. Rollback if drop** | Stop or restore backup | None | ❌ |

**Affected paths (all call `writeArgus()` without protocol):**

- All create/update/delete in `server-storage.ts` (~15 call sites)
- `readRawJournal()` vault migration path (writes on first boot)
- `clearAllArgusData()` (intentional total wipe — must be gated separately)

**Rule 0 write gate (target implementation):**

```text
writeArgusSafe(data):
  countsBefore = count(data currently on disk)
  backup = snapshot(journal.json) → backups/
  assert fileExists(backup)
  writeArgus(data)
  countsAfter = count(data)
  if countsAfter unexpectedly < countsBefore (excluding explicit deletes):
    restore(backup); throw
```

Explicit deletes (`deleteLog`, `deleteEntity`, `deleteInbox`, `clearAll`) must pass a **declared intent** flag so the gate does not treat them as accidents — but `clearAll` remains **disabled in prod** per Rule 0.

### 10.3 Wipe surfaces — current vs Rule 0

Rule 0: *Disable any script/button/API that can wipe ARGUS data without explicit confirmation.*

| Surface | Wipe scope | Confirmation today | Rule 0 compliant? |
|---------|------------|-------------------|-------------------|
| `ArgusClearAllForm` on Home | **Everything** (JSON) | Browser `confirm()` | ❌ Too weak; exposed in prod |
| `clearAllArgusDataAction` | API/server action | Same | ❌ No env gate |
| `deleteLogAction` | One record + files | `confirm()` | ⚠️ Partial — needs server-side guard |
| `deleteEntityAction` | One reference + unlink | `confirm()` | ⚠️ Partial |
| `deleteInboxAction` | One email (+ Supabase files) | `confirm()` | ⚠️ Partial |
| `tools/validate-argus-capture.ts` | Writes test log | None | ⚠️ Dev only |
| `verify-argus-inbox-schema.ts` | POST test to **production** | None | ❌ Writes prod inbox without safety protocol |

**Rule 0 minimum for wipes:**

| Control | Required gate |
|---------|---------------|
| Clear all | Hidden unless `ARGUS_TESTING_UI=1`; blocked in prod unless `ARGUS_ALLOW_DESTRUCTIVE=1`; typed phrase + confirm |
| Per-record delete | Keep confirm; optional typed name for entity delete |
| Test tools hitting prod | Require `--dry-run` default; explicit `--write` flag |

### 10.4 P0 audit vs Rule 0 — alignment

| P0 audit proposal (§4–7) | Rule 0 requirement | Aligned? |
|---------------------------|-------------------|----------|
| Backup-before-write in `writeArgus()` | Step 1 | ✅ Partial — missing validate + count check |
| Abort write if backup fails | Failed write survival | ✅ |
| Disable Clear all in production | Disable wipe without confirmation | ✅ |
| Storage warning banner | Does not satisfy survival — **visibility only** | ⚠️ Necessary but insufficient |
| Manual operator backup doc | Helps repo update locally | ⚠️ Does not fix deploy |
| No Supabase journal migration in P0 | Rule 0 **cannot pass on Vercel** without durable journal store | ❌ **Blocker** |

**Conclusion:** P0 audit fixes **steps 1 and wipe gates** but **does not alone prove Rule 0** on production. Durable journal storage (Supabase or equivalent) is a **prerequisite**, not feature work.

### 10.5 Rule 0 proof checklist (must all pass before feature work)

**Infrastructure**

- [ ] Journal + attachments stored on **durable** backend (not Vercel FS)
- [ ] Inbox + journal on coherent storage strategy (no split-brain)

**Write protocol**

- [ ] `writeArgusSafe()` implements steps 1–5
- [ ] Migration/boot paths use same protocol
- [ ] Failed backup **blocks** write

**Wipe gates**

- [ ] Clear all disabled/hidden in production
- [ ] Prod test tools require explicit write flag

**Verification (automated smoke test)**

- [ ] Seed N entities, M logs, K inbox items
- [ ] Run deploy simulation / restart
- [ ] Assert counts ≥ N, M, K
- [ ] Run sample write; assert backup file created
- [ ] Deliberately corrupt write; assert rollback restores counts

**Visibility**

- [ ] Banner when storage non-persistent (until durable store live)

### 10.6 Revised implementation order (Rule 0 first)

| Order | Work | Rule 0 addresses |
|-------|------|------------------|
| **R0.1** | `writeArgusSafe()` — backup, validate, count check, rollback | Steps 1–5 |
| **R0.2** | Gate/disable all wipe surfaces | Wipe rule |
| **R0.3** | Storage warning + block writes when ephemeral in prod | Deploy honesty |
| **R0.4** | **Durable journal store** (minimal: Supabase JSON blob or tables) | Deploy + restart |
| **R0.5** | Automated Rule 0 smoke test in CI or `tools/verify-argus-data-safety.ts` | Proof |
| **—** | Product flow, v01 schema, UI features | **Blocked until R0.1–R0.5 pass** |

### 10.7 Rule 0 verdict

| Question | Answer |
|----------|--------|
| Does current ARGUS satisfy Rule 0? | **No** |
| Does P0 audit alone satisfy Rule 0? | **No** — missing count verification, rollback, durable prod storage |
| Can feature work proceed? | **No** — per Rule 0 and user gate |
| Smallest path to “proven”? | R0.1 → R0.2 → R0.3 → R0.4 → R0.5, then re-run this checklist |

