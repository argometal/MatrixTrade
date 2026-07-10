# ARGUS — Entity lifecycle (rename, archive, scope)

**Status:** Canonical (2026-07-10)  
**Related:** [`evidence-organization-vision.md`](evidence-organization-vision.md) · [`knowledge-model-v01.md`](knowledge-model-v01.md) · [`tag-patterns-vision.md`](tag-patterns-vision.md)

---

## Three outcomes — not one delete button

| Action | Meaning | Data |
|--------|---------|------|
| **Rename** | Fix label; keep links and history | `entity.name` update |
| **Archive** | Hide from metrics and default browse; still retrievable and deliverable | `lifecycleStatus: archived` |
| **Delete** | Soft-delete (`deletedAt`) — last resort for garbage / test data | Rule 0 — never hard-remove |

Rename never deletes. Archive never deletes. Evidence and links stay intact.

---

## Lifecycle states

| Status | Applies to | Metrics | Browse default |
|--------|------------|---------|----------------|
| `active` | All entities | Yes | Visible |
| `completed` | Projects past `endDate` | Yes | Visible as Completed |
| `archived` | User-archived | **No** | Hidden |

Legacy `status: archived` in entity notes is migrated to `lifecycleStatus` on read.

---

## Time rules by lens

| Lens | Date filter | Archive |
|------|-------------|---------|
| **Project** | Default view: evidence within `startDate`–`endDate` (direct + via contacts) | Yes — removes from portfolio metrics |
| **Organization** | No date limit — institutional memory | Yes |
| **Topic on org** | No date limit — permanent binder | Yes — topic entity archived, not org |
| **Topic on project** | Monitoring lens: use project date scope when viewing project; topic entity stays timeless | Link via `linkedTopicIds` |

**Topic transfer** = link topic to project for bounded monitoring — not moving or copying evidence.

Toggle on project page: **In project dates** (default) · **All dates** (`?scope=all`).

---

## Garbage vs long-term tracking

| User intent | Action |
|-------------|--------|
| Not useful day-to-day, keep for audit | **Archive** |
| Still monitoring in a bounded engagement | Link topic → project; view under project dates |
| Permanent institutional subject | Topic on organization; no expiry |
| True junk | Soft-delete (protected flows) |

---

## Rename surfaces (v1)

| Object | Rename |
|--------|--------|
| Organization, project, topic, event, contact | `renameEntityAction` + `V2EntityLifecycleActions` |
| Tag (global string) | `renameTagAction` — all register + inbox rows |
| Inbox subject | `updateInboxSubjectAction` |
| Register entry title | Existing log edit |

---

## Storage

Argus has **no application quota**. Local data lives in `ARGUS_DATA_DIR` (user disk). Production inbox uses Supabase plan limits. See [`../integrations/argus-storage.md`](../integrations/argus-storage.md).

---

## Code

- `lib/argus/entity-lifecycle.ts` — status resolution, metrics filter
- `lib/argus/project-evidence-scope.ts` — `respectProjectDates` option
- `app/argus/v2/components/V2EntityLifecycleActions.tsx`
- `app/argus/v2/components/V2ProjectScopeToggle.tsx`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-10 | Initial lifecycle model — 070909 batch |
