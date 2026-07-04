# ARGUS Phase 0 & Phase 1 Stabilization Audit

**Status:** Objects-first workflow implemented. **Pending validation** on production deploy.

**Date:** 2026-07-04  
**Scope:** Person, Organization, Project, Topic, Event + Evidence (logs). No relationships, timelines, narratives, or reports.

---

## Executive summary

### P0 regression (read-only app)

**Symptom:** All object and evidence creation fails on Vercel production.

**Root cause:** Journal writes are blocked when `isJournalWriteBlocked()` is true. On Vercel without a cloud journal store, every mutation throws `ArgusWriteBlockedError` before reaching Supabase.

**Contributing factors:**

| Factor | File | Effect |
|--------|------|--------|
| Write gate blocks ephemeral storage | `lib/argus/data-safety/write-gate.ts` | Throws before DB write |
| Production env missing Supabase creds | `.env.vercel.production` (empty `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) | Cloud store never activates |
| No explicit `ARGUS_JOURNAL_STORE=supabase` on Vercel | Vercel project settings | Prior to fix, auto-detect did not run |
| Generic UI error | Journal/network pages (prior) | Masked layer as “Check storage” |

**Fix applied (local, pending deploy):**

1. **`lib/argus/journal-store/config.ts`** — Auto-enable Supabase journal on Vercel when `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set (unless explicitly `filesystem`/`json`/`local`).
2. **`lib/argus/persistence/errors.ts`** — Layered errors (`ui`, `api`, `validation`, `database`, `permission`, `supabase`, `constraint`, `unknown`).
3. **`lib/argus/server-storage.ts`** — Read-after-write confirmation for `createEntity()` and `createLog()`.
4. **`app/argus/actions.ts`** — Single `persistNewEntity()` path; `redirectWriteFailure()` with `errorLayer` + `errorMsg`.
5. **UI entry points** — Layered error display; removed “Check storage.”

**Production still blocked until operator:**

1. Sets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on Vercel.
2. Runs `supabase/argus-setup.sql` once in Supabase SQL editor.
3. Sets `ARGUS_INBOX_STORE=supabase` (inbox/evidence attachments).
4. Redeploys with stabilization commit.

---

## Canonical creation path (ONE path)

```
UI entry point
  → createEntityInlineAction / createEntityAction
    → persistNewEntity()                    [app/argus/actions.ts]
      → validation (name, kind)
      → createEntity()                      [lib/argus/server-storage.ts]
        → writeArgus() → writeArgusSafe()
          → writeJournalToSupabase() OR ArgusWriteBlockedError
        → readArgus() + find entity (read-after-write)
      → getEntity() confirmation
      → revalidatePath + return { id, href, name }
  → redirect (form) OR router.push (inline)
```

Evidence (logs):

```
UI → createLogAction
  → createLog() [server-storage]
    → writeArgus + read-after-write via getLog
  → redirect to /argus/logs/:id
```

---

## Creation path audit

| Entry point | File | Action | Flow | Status |
|-------------|------|--------|------|--------|
| Global ◇ launcher | `EntityCreateLauncher.tsx` | `createEntityInlineAction` | **Canonical** | OK |
| Network create form | `EntityCreateForm.tsx` | `createEntityAction` | **Canonical** | OK |
| Reference picker modal | `ReferencePickerModal.tsx` | `createEntityInlineAction` | **Canonical** | OK |
| Entity picker inline | `EntityPicker.tsx` | `createEntityInlineAction` | **Canonical** | OK |
| Activity edit panel | `ActivityEditPanel.tsx` | `createEntityInlineAction` | **Canonical** | OK |
| Journal/inbox “new entity” fields | `resolveEntityIds()` in `actions.ts` | `persistNewEntity` | **Canonical** (was direct `createEntity`) | Fixed |
| Validation scripts | `tools/validate-*.ts` | `createEntity()` direct | **Test-only bypass** | Acceptable (not UI) |

### Removed / dead paths

| Path | Status |
|------|--------|
| Direct UI `createEntity()` calls | **None in `app/`** |
| Pending-new / re-select after create | Removed in `bc0ddfa` |
| Place/Document/Other at create | Blocked by `isCreatableReferenceKind()` |
| Legacy `?error=storage` without layer | Superseded by `errorLayer` + `errorMsg` |

### Duplicate flows (consolidated)

- **`createEntityAction`** (form POST + redirect) and **`createEntityInlineAction`** (client + router.push) both delegate to **`persistNewEntity()`**. Not duplicate persistence — only transport differs.

---

## Persistence audit

Required chain: **UI → API → Validation → Database write → Database confirmation → UI success**

| Step | Entity create | Evidence create |
|------|---------------|-----------------|
| UI | Launcher, form, pickers | `JournalHome` → `createLogAction` |
| API | Server actions in `actions.ts` | `createLogAction` |
| Validation | `persistNewEntity` name/kind checks | `parseJournalInput`, body required |
| DB write | `writeArgusSafe` → Supabase or filesystem | Same |
| DB confirmation | `readArgus` in `createEntity` + `getEntity` in `persistNewEntity` | `readArgus` in `createLog` + `getLog` |
| UI success | Redirect / `router.push` only after await resolves | Redirect to log detail |

**Never before confirmation:** Inline modals only close after `createEntityInlineAction` resolves (throws on failure).

---

## Logging / error layers

| Layer | When |
|-------|------|
| `validation` | Empty name, invalid kind |
| `supabase` | Write blocked, missing creds, Supabase journal errors |
| `database` | Read-after-write miss, data safety rollback |
| `unknown` | Unclassified Error |

**Removed:** “Check storage.”  
**Journal page:** Shows `errorLayer: errorMsg` or explicit Supabase setup message.

---

## Activity audit

**Source:** `buildHomeActivityFeed()` in `lib/argus/home-helpers.ts`

- Merges **`getEntities()`** and **`getLogs()`** (both from `readArgus()` / Supabase).
- Sorted by `updatedAt`.
- **Not optimistic** — no client-side fake entries.
- Entity `updatedAt` bumped on linked log create (in `createLog`).

**Validation:** `validate-argus-objects-first.ts` and `validate-argus-phase0-crud.ts` assert new entities appear in feed after DB read.

---

## Search audit

**Source:** `searchEntities()` / `searchLogs()` in `server-storage.ts` — reads fresh `readArgus()` data.

- No separate index; search is live over persisted journal JSON.
- New objects searchable immediately after create (same process, no page refresh required for server components after `revalidatePath`).

---

## Home counters audit

**Source:** Journal page loads `getEntities()`, `getLogs()`, `getInboxItems()` server-side.

- Project/network summaries built in `home-helpers.ts` from those reads.
- **Not from local state or optimistic cache.**

---

## Detail pages

| Kind | Route | Loader |
|------|-------|--------|
| Person, Organization, Topic, Event | `/argus/network/[id]` | `getEntity(id)` |
| Project | `/argus/projects/[id]` | `getEntity(id)` |
| Evidence | `/argus/logs/[id]` | `getLog(id)` |

404 only when `getEntity` / `getLog` returns undefined (soft-deleted or missing).

---

## CRUD checklist (automated evidence)

Run:

```bash
npx tsx tools/validate-argus-entity-crud.ts
npx tsx tools/validate-argus-objects-first.ts --supabase
npx tsx tools/validate-argus-phase0-crud.ts --supabase
npx tsx tools/validate-argus-phase0-crud.ts --supabase --vercel-auto
```

### Local Supabase run (2026-07-04)

**`validate-argus-entity-crud.ts`** — PASS all 5 kinds create/read/persist/cleanup.

**`validate-argus-objects-first.ts --supabase`** — PASS person/project/topic: create, search, activity, detail, health 7/7.

**`validate-argus-phase0-crud.ts --supabase`** — PASS all 5 kinds + evidence: create, search, activity, detail, health 7/7, cleanup.

**`validate-argus-phase0-crud.ts --supabase --vercel-auto`** — PASS (simulates Vercel without `ARGUS_JOURNAL_STORE`; auto-detect enables Supabase when creds present).

| Object | Create | Read | Update | Delete | Refresh | Search | Activity | Home | Detail |
|--------|--------|------|--------|--------|---------|--------|----------|------|--------|
| Person | ✅ auto | ✅ auto | ⏳ manual | ✅ auto cleanup | ✅ auto | ✅ auto | ✅ auto | ✅ DB-derived | ✅ auto |
| Organization | ✅ auto | ✅ auto | ⏳ manual | ✅ auto | ✅ auto | ✅ auto | ✅ auto | ✅ DB | ✅ auto |
| Project | ✅ auto | ✅ auto | ⏳ manual | ✅ auto | ✅ auto | ✅ auto | ✅ auto | ✅ DB | ✅ auto |
| Topic | ✅ auto | ✅ auto | ⏳ manual | ✅ auto | ✅ auto | ✅ auto | ✅ auto | ✅ DB | ✅ auto |
| Event | ✅ auto | ✅ auto | ⏳ manual | ✅ auto | ✅ auto | ✅ auto | ✅ auto | ✅ DB | ✅ auto |
| Evidence | ✅ auto | ✅ auto | ⏳ manual | ✅ auto cleanup | ✅ auto | ✅ auto | N/A | N/A | ✅ route |

⏳ = not yet manually verified in browser on production.

---

## Rule 0 verification

| Rule | Status | Evidence |
|------|--------|----------|
| No migration deletes data | ✅ | `writeArgusSafe` backup + count drop rollback (`write-gate.ts`) |
| No deployment deletes data | ⚠️ blocked without Supabase | Ephemeral FS on Vercel; write gate prevents silent loss |
| Supabase source of truth | ✅ when configured | `isCloudJournalStore()` + `readJournalFromSupabase` |
| Test cannot overwrite production | ✅ | Validation uses stamped names + deletes after; destructive gated |
| Backup before destructive write | ✅ | `backupJournalJson` / `assertBackupExists` in write gate |

See also: `md/argus/rule-0-protected-data-audit.md`, `md/argus/p0-data-safety-audit.md`.

---

## Remaining blockers

| # | Blocker | Root cause | File(s) | Minimal fix | Evidence |
|---|---------|------------|---------|-------------|----------|
| 1 | **Production read-only** | Empty Supabase env on Vercel | Vercel project env, `.env.vercel.production` | Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, redeploy | Local `--supabase` scripts PASS; production env empty |
| 2 | **Supabase schema** | Tables may not exist | `supabase/argus-setup.sql` | Run SQL once in Supabase | Health check `database` offline if missing |
| 3 | **Deploy verification** | Stabilization commit not deployed | — | Commit, push, redeploy, manual create × 5 + evidence | Pending |
| 4 | **Inbox store** | Evidence attachments need cloud inbox | `ARGUS_INBOX_STORE` | Set `supabase` on Vercel | Attachment health check |
| 5 | **Manual CRUD update** | Update flows not in automated script | `updateEntityAction`, `updateLogAction` | Manual browser test post-deploy | Checklist ⏳ |
| 6 | **objects-first script scope** | Only tests 3/5 kinds | `tools/validate-argus-objects-first.ts` | Use `validate-argus-phase0-crud.ts` for full 5 | New script added |

---

## Operator checklist (production acceptance)

1. Run `supabase/argus-setup.sql` in Supabase.
2. Vercel env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ARGUS_INBOX_STORE=supabase` (journal auto-detects on Vercel when creds present).
3. Deploy stabilization commit.
4. Create each object type (name only) → detail → refresh → still exists.
5. Search each object without full page reload (navigate to Search).
6. Confirm Home activity + counters update.
7. Create evidence → refresh → detail → search.
8. Redeploy → confirm objects still exist.

---

## Files changed in stabilization (uncommitted at audit time)

- `lib/argus/journal-store/config.ts`
- `lib/argus/persistence/errors.ts` (new)
- `lib/argus/server-storage.ts`
- `app/argus/actions.ts`
- `app/argus/components/EntityCreateLauncher.tsx`
- `app/argus/components/EntityCreateForm.tsx`
- `app/argus/components/EntityPicker.tsx`
- `app/argus/components/ReferencePickerModal.tsx`
- `app/argus/(app)/journal/page.tsx`
- `app/argus/(app)/network/page.tsx`
- `tools/validate-argus-phase0-crud.ts` (new)
- `md/argus/phase-0-1-stabilization-audit.md` (this file)

**Do not implement Phases 2–6.**
