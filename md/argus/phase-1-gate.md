# ARGUS Development Gate — Phase 1 (MOP)

**Rule:** No Phase 2 work until every checkbox below is complete and verified end-to-end.

**Last audit:** 2026-07-03 · **MOP readiness:** ~55–60%

Legend: ✅ Complete · ⚠️ Partial · ❌ Missing

---

## WORKSPACE

| | Item | Status | Notes |
|---|------|--------|-------|
| ☐ | Create a Project | ✅ | `ReferenceCreateModal` → `createEntity` |
| ☐ | Edit a Project | ⚠️ | Alias/notes only; **name not editable** |
| ☐ | Archive a Project | ❌ | Only hard delete; no archive status |

## TOPICS

| | Item | Status | Notes |
|---|------|--------|-------|
| ☐ | Create a Topic | ✅ | Tags on logs + topic-as-entity |
| ☐ | Edit a Topic | ⚠️ | Tag strings on note edit; no topic detail/rename |
| ☐ | Assign Topic to Project | ⚠️ | Indirect via co-linking on same log; no first-class relation |

## CAPTURE

| | Item | Status | Notes |
|---|------|--------|-------|
| ☐ | Create note | ✅ | CaptureSheet → createLog |
| ☐ | Edit note | ✅ | ActivityEditPanel → updateLog |
| ☐ | Delete note | ✅ | deleteLogAction |
| ☐ | Move note to another Topic | ✅ | Edit tags on note |

## EMAIL

| | Item | Status | Notes |
|---|------|--------|-------|
| ☐ | Receive email automatically | ⚠️ | Worker → tunnel → API verified 2026-07-04; requires dev + cloudflared running; redeploy Worker when quick tunnel URL changes; fix intake DNS CNAME for permanent hostname |
| ☐ | Email appears in Inbox | ✅ | inbox list + journal home |
| ☐ | Read email correctly | ✅ | EmailViewer |
| ☐ | View HTML/text | ✅ | text + sandboxed HTML iframe |
| ☐ | Download attachments | ✅ | `/api/argus/files/[id]` |
| ☐ | Link email to Topic | ⚠️ | Only on convert-to-log with tags; not direct inbox link |
| ☐ | Link email to Person | ✅ | linkInboxToEntities |
| ☐ | Archive email after classification | ⚠️ | Manual archive; convert ≠ archive; no auto-close |

## FILES

| | Item | Status | Notes |
|---|------|--------|-------|
| ☐ | Upload document | ✅ | Capture + email intake |
| ☐ | Upload photo | ✅ | Same attachment path |
| ☐ | Preview supported files | ✅ | Image/PDF inline preview |
| ☐ | Download original file | ✅ | files API |

## PEOPLE

| | Item | Status | Notes |
|---|------|--------|-------|
| ☐ | Create Person | ✅ | ReferenceCreateModal |
| ☐ | Edit Person | ⚠️ | Alias/notes only; **name not editable** |
| ☐ | Link Person to Topics | ✅ | Derived from linked logs |
| ☐ | View related emails | ❌ | `linkedEntityIds` on inbox not shown on entity page |
| ☐ | View related documentation | ⚠️ | Logs + attachment counts; not full doc search |

## TIMELINE

| | Item | Status | Notes |
|---|------|--------|-------|
| ☐ | Every Topic has a chronological timeline | ❌ | No topic route or unified aggregator |
| ☐ | Notes / Emails / Files / Meetings / Follow-ups together | ❌ | Entity pages show logs only; inbox not merged |

## SEARCH

| | Item | Status | Notes |
|---|------|--------|-------|
| ☐ | Find Project | ✅ | searchEntities |
| ☐ | Find Topic | ⚠️ | Tags in note search; no dedicated topic index |
| ☐ | Find Person | ✅ | searchEntities |
| ☐ | Find Email | ❌ | No inbox search |
| ☐ | Find Document | ❌ | No attachment search |

## USABILITY

| | Item | Status | Notes |
|---|------|--------|-------|
| ☐ | Every record is editable | ⚠️ | Logs/inbox yes; entity names no |
| ☐ | Every record can be related | ⚠️ | Fragmented topic model |
| ☐ | No dead records | ⚠️ | `needs_classification` can linger |
| ☐ | User always knows the next action | ⚠️ | Inbox/follow-up badges only |

---

## Priority order to reach MOP

1. **Topic timeline** — unified chronological view per topic
2. **Search email + document**
3. **Entity pages show linked inbox emails**
4. **Project archive + edit name · Topic assign-to-project · inbox topic link + archive loop**
5. **Close classification loop** — no stale `needs_classification` or inbox items

---

## Verification template

For each checkbox when marking ✅:

```
[ ] User action:
[ ] API/storage change:
[ ] UI shows result:
[ ] Verified in production path (if email/tunnel):
```
