# ARGUS Tag System · IMPLEMENTATION ORDER 001

**Status:** In progress (Phase 1–7 + Home Tags role chips)  
**Branch:** `cursor/tag-ontology-roles-e1a0`  
**Rule:** One reusable infra; caller passes `TagRole` + scope. Trackers are flags, not a role.

## Phase 1 · Field map

| Current field | Semantic meaning today | Intended role | Migration action |
|---------------|------------------------|---------------|------------------|
| `Log.topics[]` | Evidence Tags on Notes | `evidence` | Keep. Scope via `entityIds`. |
| `InboxItem.topics[]` | Evidence Tags on email | `evidence` | Keep. |
| Topic `Entity.linkedTags[]` | Topic Tags (findability) | `topic` | Dual-read → prefer `topicTags[]`; dual-write during transition. |
| Project `Entity.linkedTags[]` | Ambiguous “project tags” | `project` | Stop ambiguous write; use `projectTags[]`; legacy read from `linkedTags`. |
| Event `Entity.linkedTags[]` | Legacy Event Signals | — (not Event Tags) | Already migrated to `signalTags`; do not treat as `event`. Use `eventTags[]` for binder classification. |
| Org/Person `Entity.linkedTags[]` | Misused classification | — | Stop new writes; structural links only. Legacy read ignored for Tag roles. |
| `ArgusData.signalTags[]` | Tracker flags | flag on any Tag key | Keep. Not a `TagRole`. |
| `ArgusData.globalTags[]` | *(new)* | `global` | New optional array. |
| Entity `projectTags` / `topicTags` / `eventTags` | *(new)* | binder roles | Optional; adapter falls back to legacy. |
| `knownExtras` session | Fake “on this…” Tags | session only | Key by `scopeId`; never merge into persistent inventory. |

## Pre-execution deliverables

### 1. Files to modify (foundation slice)

- `md/argus/tag-ontology-001.md` (this doc)
- `md/argus/vocabulary-policy.md`
- `lib/argus/tag-ontology.ts` **(new)**
- `lib/argus/types.ts`
- `lib/argus/normalize.ts`
- `lib/argus/journal-helpers.ts` (`buildTagBuckets` scoped)
- `lib/argus/server-storage.ts` (`renameTag` role-aware)
- `lib/argus/signal-tags.ts` (normalize via ontology)
- `app/argus/v2/components/V2TrackerTogglePanel.tsx` (knownExtras)
- `app/argus/v2/browse/events/components/V2EventDetailPanel.tsx` (scoped picker buckets)
- `app/argus/components/ProjectEditForm.tsx` + `actions.ts` (projectTags writes)
- `app/argus/v2/browse/topics/components/V2TopicAliasEditor.tsx` (topicTags dual-write)
- `tools/test-tag-ontology-001.ts` **(new)**

### 2. Schema current → target

**Current:** one string folksonomy via `topics` + generic `linkedTags` + `signalTags`.

**Target (compat):**

```
ArgusData.globalTags?: string[]
ArgusData.signalTags?: string[]          // Tracker flags (unchanged)

Entity.projectTags?: string[]
Entity.topicTags?: string[]
Entity.eventTags?: string[]
Entity.linkedTags?: string[]             // legacy dual-read only

Log.topics / InboxItem.topics            // evidence (unchanged)
```

Structural IDs unchanged: `linkedTopicIds`, `linkedEventIds`, `linkedEntityIds`, `entityIds`.

### 3. Compatibility strategy

- **New writes** go to role fields (`projectTags` / `topicTags` / `eventTags` / `globalTags`).
- **Topic** also dual-writes `linkedTags` until cutover.
- **Reads** via `readTagsForRole()`: prefer role field, else legacy `linkedTags` for topic/project only.
- **`?tag=`** unchanged initially; later `?tag=&role=` with fallback.
- **Patterns** stay evidence-only.
- No destructive rewrite of Notes.

### 4. Migration order

1. Domain module + types + normalize defaults  
2. knownExtras scoped  
3. Scoped `buildTagBuckets` + Event Note wiring  
4. Stop Project/Org ambiguous Tag writes; Project → `projectTags`  
5. Topic editor dual-write `topicTags`  
6. Role-aware rename  
7. Home Tags manager (role chips + annotated portfolio) — this PR  
8. Full picker/role on all binders — next PR  
9. Retire `linkedTags` writes — later  

### 5. Regression risks

| Risk | Mitigation |
|------|------------|
| Topic search/`?tag=` misses aliases | Dual-read `topicTags`∪`linkedTags` |
| Rename only hits evidence | Role-aware rename touches role stores + optional evidence |
| Same string different roles | Keys are `(role, key)`; rename defaults to one role |
| Patterns inflate | Never mine project/event/topic binder tags into Patterns |
| UI still looks universal | Event picker scoped in this slice; Home manager next |

## Non-negotiable (locked)

- No cosmetic-only patch  
- No four pickers / four normalize implementations  
- No IDs as tags  
- No Patterns split by binder role  
- No Tracker namespace  
- No session state in persistent inventory  
- No generic `linkedTags` with mixed semantics for new writes  
