# ARGUS — Secure Persistent Storage (Phase P0)

**Status:** Implemented — storage layer + `ARGUS_DATA_DIR`  
**Scope:** Storage only. No UX, Journal, Network, or Trading changes.

Related: [`argus-architecture.md`](argus-architecture.md) · [`argus-design-principles.md`](argus-design-principles.md)

---

## Principle

The **application** (MatrixTrade repo) and **user data** (ARGUS journal) are separate products.

| In repository | Outside repository |
|---------------|-------------------|
| Code | Journal (`journal.json`) |
| Documentation | Attachment binaries |
| Configuration (`.env.local`) | Future email cache |
| | Future AI annotations |
| | Backups |

User operational data must survive: git pull, branch switches, redeploys, repo moves.

---

## Configuration

Set in `.env.local`:

```env
# Any folder — does NOT require a new disk or partition
ARGUS_DATA_DIR=C:\Users\vmartinez9\ArgusData
```

| Variable | Required | Default if unset |
|----------|----------|------------------|
| `ARGUS_DATA_DIR` | Optional | `{repo}/data/argus` (legacy, inside repo but gitignored) |

**No extra disk needed.** `ARGUS_DATA_DIR` is just a path to a normal folder — e.g. under your user profile (`C:\Users\you\ArgusData`). The goal is to keep data **outside the git repo**, not on a separate drive.

When unset, behavior is unchanged: data lives in `data/argus/` inside the project (gitignored). That still works on a single-drive PC; setting `ARGUS_DATA_DIR` to a user-folder path is recommended if you want data to survive repo moves or re-clones.

---

## Directory layout

All paths relative to `ARGUS_DATA_DIR`:

```text
ARGUS_DATA_DIR/
├── journal.json          # v3 datastore: entities, logs, inbox, attachment metadata
├── files/                # Attachment binaries (id = filename)
├── meta/
│   └── storage.json      # Boot metadata, migration record
├── email-cache/          # Reserved — Phase Email Intake
├── annotations/          # Reserved — Phase AI (overlays only)
└── backups/              # Reserved — local backup target (manual / future auto)
```

### What lives in `journal.json`

Single JSON document (v3):

- `entities`
- `logs` (journal entries)
- `inboxItems`
- `attachments` (metadata only — includes `parentType`, `parentId`)
- `version: 3`

Inbox content is **not** a separate file today; raw inbox lives inside `journal.json`. Email cache dir is reserved for future RFC822 / MIME blobs.

---

## Storage abstraction

All ARGUS disk I/O goes through:

| Module | Role |
|--------|------|
| `lib/argus/storage/paths.ts` | Resolve `ARGUS_DATA_DIR`, path layout |
| `lib/argus/storage/bootstrap.ts` | Create dirs, one-time migration |
| `lib/argus/server-storage.ts` | **Only** module that reads/writes journal + files |

Routes and UI import `server-storage` functions only — never paths.

Future backends (SQLite, Postgres, S3) replace `server-storage` internals; public function signatures stay stable.

---

## Attachments

- Binary: `{ARGUS_DATA_DIR}/files/{attachmentId}`
- Metadata: `journal.json` → `attachments[]` with `parentType` (`inbox` | `journal`) and `parentId`
- Never stored inside the git repository when `ARGUS_DATA_DIR` is external

Inbox → Journal conversion **moves parent reference** on metadata (binary file unchanged).

---

## Migration strategy

### Automatic (on first boot after setting `ARGUS_DATA_DIR`)

1. App starts; `ensureArgusStorageReady()` runs once.
2. Creates directory layout under `ARGUS_DATA_DIR`.
3. If `{repo}/data/argus/journal.json` exists **and** `{ARGUS_DATA_DIR}/journal.json` does **not**:
   - Copy `journal.json` → `ARGUS_DATA_DIR`
   - Copy `files/` recursively if present
   - Write `meta/storage.json` with `migratedFrom` and `migratedAt`
4. **Legacy repo copy is not deleted** — user verifies, then removes manually.

### Manual migration (recommended for production)

```powershell
# 1. Stop the app
# 2. Create folder in user profile (no extra disk)
mkdir $env:USERPROFILE\ArgusData

# 3. Copy data
xcopy /E /I c:\Tools\MatrixTrade\data\argus $env:USERPROFILE\ArgusData

# 4. Set .env.local
ARGUS_DATA_DIR=C:\Users\vmartinez9\ArgusData

# 5. Start app — verify /argus/journal
# 6. Delete repo copy when satisfied
```

### Health Vault legacy

If only `data/health-vault/vault.json` exists, `server-storage` still migrates content into the active storage root on first read (existing behavior).

### Conflict policy

If **both** repo `data/argus/journal.json` and `ARGUS_DATA_DIR/journal.json` exist: **ARGUS_DATA_DIR wins**. No merge. Document and backup before switching paths.

### ID integrity

Migration is file-level copy — IDs inside JSON are preserved. No duplicate ID generation.

---

## Backup strategy (documented — not automated)

### Manual backup

Copy the entire `ARGUS_DATA_DIR` folder:

```powershell
xcopy /E /I C:\Users\vmartinez9\ArgusData C:\Users\vmartinez9\ArgusBackups\2026-06-29
```

Or zip:

```powershell
Compress-Archive -Path C:\Users\vmartinez9\ArgusData -DestinationPath C:\Users\vmartinez9\ArgusBackups\argus-2026-06-29.zip
```

### Automatic local backup (future)

Planned: scheduled copy into `{ARGUS_DATA_DIR}/backups/` with rotation. **Not implemented in P0.**

Suggested policy when implemented:

| Setting | Recommendation |
|---------|----------------|
| Frequency | Daily if active use; weekly minimum |
| Retention | 7 daily + 4 weekly |
| Target | Separate disk or cloud folder (user-managed) |

### What to backup

Always include:

- `journal.json`
- `files/` (all attachments)
- `meta/storage.json`

Optional later: `email-cache/`, `annotations/`

---

## Recovery strategy

### Full restore

1. Stop MatrixTrade.
2. Replace `ARGUS_DATA_DIR` contents from backup (or point `ARGUS_DATA_DIR` at backup folder).
3. Verify `journal.json` parses (app boot).
4. Start app; open `/argus/journal`.

### Partial corruption

1. Stop app.
2. Restore `journal.json` from backup.
3. If attachments missing, restore `files/` from same backup timestamp.
4. Never edit `journal.json` by hand unless emergency — prefer restore.

### After repo clone on new machine

1. Clone MatrixTrade.
2. Set `.env.local` with same `ARGUS_DATA_DIR` (or copy data folder to new path).
3. No data lives in git — journal appears when path is correct.

---

## Future compatibility (no redesign required)

| Future feature | Storage location |
|----------------|------------------|
| Email ingestion | `email-cache/` + inbox API → `journal.json` |
| Inbox API | Unchanged — writes via `server-storage` |
| Evidence / PDF / screenshots | `files/` + attachment metadata |
| Voice notes | `files/` with audio MIME |
| AI annotations | `annotations/` JSON overlays — never replace `journal.json` body |

---

## Verification checklist

After setting `ARGUS_DATA_DIR`:

- [ ] `meta/storage.json` exists under data root
- [ ] `external: true` in meta when path is outside repo
- [ ] New journal entry persists after `git pull`
- [ ] Attachments download from `/api/argus/files/{id}`
- [ ] Legacy `data/argus` in repo no longer grows (optional delete)

---

## Code map

| Path | Purpose |
|------|---------|
| `lib/argus/storage/paths.ts` | `ARGUS_DATA_DIR` resolution |
| `lib/argus/storage/bootstrap.ts` | Boot + migration |
| `lib/argus/storage/index.ts` | Public storage exports |
| `lib/argus/server-storage.ts` | All CRUD + file bytes |

---

## Next phase

**Email + Evidence Intake** builds on this layer — inbox API and attachment parents already compatible. No storage redesign required before email router work.
