# ARGUS v2 hierarchy — implementation report

**Date:** 2026-07-05  
**Branch:** `main`  
**Emergency revert:** `git checkout change-114-revert` (state before v2 UI)  
**v2 preview:** `/argus/v2/*` — production UI unchanged at `/argus/journal`, `/argus/network`, `/argus/projects/[id]`

---

## 1. Hierarchy model (locked)

Three lenses read the **same evidence graph** with different aggregation rules:

| Lens | Time | Evidence rule | UI route |
|------|------|---------------|----------|
| **Organization** | Forever (no end date) | **Direct links only** — `log.entityIds`, `inbox.linkedEntityIds` containing org id | `/argus/v2/organizations/[id]` |
| **Project** | `startDate` → `endDate` (adjustable on entity) | **Direct + via contacts** — same as `lib/argus/project-evidence.ts` | `/argus/v2/projects/[id]` |
| **Person** | Relationship lifetime | **Direct links only** — person file for behavior / HR / performance (not org roll-up) | Legacy `/argus/network/[id]` (v2 person page TBD) |

**Key rule (user “third option”):** Organization does **not** inherit all activity from linked people. People appear on the org page as **roster** only. Person-scoped evidence stays on the person record.

---

## 2. Journal duality (Note vs Log)

| UI label | Stored field | Timeline display |
|----------|--------------|------------------|
| **Log** (recurring / sequence) | `log.kind === "log"` | `Journal · Log` |
| **Note** (one-time) | `log.kind === "event"` or `follow_up` | `Journal · Note` |

Implemented in `lib/argus/v2/timeline-builders.ts` → `logToTimelineEntry()`.

---

## 3. Code map — field wiring

### Organization page

| UI element | Source |
|------------|--------|
| Name, notes, alias | `Entity` (`type === "company"`) |
| Journal / email counts | `organizationEvidenceScope()` → `getEntityHistory` + `getLinkedInboxForEntity` |
| Timeline | Merged logs + inbox from org scope only |
| Linked people | `entity.linkedPersonIds` + person ids from `entity.linkedEntityIds` |
| Linked projects | `projectsForOrganization()` — `project.linkedEntityIds` includes org **or** `org.linkedEntityIds` includes project |
| Relationship panel | `buildEntityIntelligence()` — `strategicValue`, `relationshipHealth`, `outcomeScore` |
| Protected entries | Hidden unless PIN unlock (`includePrivate`) |

**Module:** `lib/argus/v2/hierarchy.ts`, `lib/argus/v2/loaders.ts` → `loadOrganizationPageData()`

### Project page

| UI element | Source |
|------------|--------|
| Name, dates, notes | `Entity` (`type === "project"`) |
| Duration | `startDate` / `endDate` on entity |
| Stats (journal, emails, attachments) | `getProjectEvidenceScope()` + `getAllProjectScopeInbox()` |
| Timeline | Direct logs + via-contact logs + all scoped inbox, date-filtered |
| People sidebar | `project.linkedPersonIds` |
| Organization link | First `company` in `project.linkedEntityIds` |

**Module:** reuses `lib/argus/project-evidence.ts` via `getProjectEvidenceScope`, `getAllProjectScopeInbox`

### Home page

| UI element | Source |
|------------|--------|
| Stat cards | Counts from `ArgusData.logs`, inbox items, `entitiesByKind()` |
| Recent activity | Latest `Log` rows with linked entity names |
| Follow-ups | Logs with `followUpDate` or `kind === "follow_up"` |
| Timeline rail | Recent logs + inbox (global sample) |
| Entity table | `buildV2EntityRows()` — links to v2 org/project or legacy person |
| Tags | Aggregated from `log.topics[]` |
| Sidebar counts | `buildV2NavCounts()` |

---

## 4. Files added (v2 preview)

```
app/argus/v2/                          ← parallel shell (does not replace (app) layout)
lib/argus/v2/hierarchy.ts              ← org / project / person scope rules
lib/argus/v2/timeline-builders.ts      ← Log/Note + email → timeline entries
lib/argus/v2/loaders.ts                ← page data loaders
lib/argus/v2/mock-data.ts              ← types + unused demo constants (fallback types)
md/argus/design-matrix-stage.md        ← locked product model
md/argus/v2-hierarchy-implementation-report.md  ← this file
```

---

## 5. Verification checklist

| Rule | Implemented | Where |
|------|-------------|-------|
| Org timeline = direct links only | Yes | `organizationEvidenceScope` |
| Org people = roster, not evidence proxy | Yes | Sidebar list only; scope excludes person-linked items |
| Project timeline = direct + via contacts in date range | Yes | `getProjectEvidenceScope` + `getAllProjectScopeInbox` |
| Log vs Note on timeline | Yes | `logJournalSubtype()` |
| Protected until PIN | Yes | `includePrivate` passed through loaders |
| Legacy routes untouched | Yes | No edits to `(app)/journal`, `(app)/network`, `(app)/projects` pages |

---

## 6. Not yet migrated

- v2 **Person** viewer (behavior / risk / performance facets)
- **Continue log** UX on entity pages
- Tab switching (Overview / Timeline / …) — single overview view for now
- Replace production Home with v2 shell
- Real relationship chart (placeholder uses strategic value)

---

## 7. How to test

1. Log in to Argus.
2. Open `/argus/v2` — confirm live counts match your data.
3. Open an organization: `/argus/v2/organizations/{id}` — timeline should only show items linked to that org.
4. Open a project: `/argus/v2/projects/{id}` — timeline should include project-linked emails/logs and contact-linked items within project dates.
5. Compare with legacy `/argus/network/{orgId}` and `/argus/projects/{projectId}` — same underlying data, different layout.

---

## 8. Rollback

```bash
# Before any v2 work
git checkout change-114-revert

# v2 shells only (if tagged separately)
git checkout change-114

# Latest with live wiring
git checkout change-115
```
