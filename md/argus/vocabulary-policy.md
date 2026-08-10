# ARGUS vocabulary — Topic, Tag, Tracker, Roles

**Status:** Canonical (ORDER 001 — 2026-08-10)  
**Mechanics:** [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md) · **Ontology:** [`tag-ontology-001.md`](tag-ontology-001.md)

## Tag roles (one infra, typed callers)

| Role | Storage | Purpose |
|------|---------|---------|
| **evidence** | `Log.topics[]` / `InboxItem.topics[]` | Classify Notes/emails. Patterns mine only these. |
| **topic** | `Entity.topicTags[]` (dual-read `linkedTags` on Topics) | Classify Topic binders / findability |
| **project** | `Entity.projectTags[]` (legacy dual-read `linkedTags` on Projects) | Classify Projects |
| **event** | `Entity.eventTags[]` | Classify Event binders (not Note Tags) |
| **global** | `ArgusData.globalTags[]` | Cross-cutting only when shared meaning is intentional |

**Tracker** is **not** a role. Journal `ArgusData.signalTags[]` = Flag / Disable watch on an existing Tag key.

### Structural relations are not Tags

Keep as IDs: `linkedTopicIds`, `linkedEventIds`, `linkedEntityIds`, `Log.entityIds`, `InboxItem.linkedEntityIds`.

### Org / Person

No binder Tags by default — use structural links. Do not write `linkedTags` as classification.

### How to use

| Intent | Where |
|--------|--------|
| Evidence Tag on a Note | Event → **Note** → Tags (scoped to this Event + Topic pool) → Save |
| Topic Tags | Topic → Tags → Topic Tags editor |
| Project Tags | Project edit → Tags (writes `projectTags`) |
| Event binder Tags | Event → Tags → **Event Tags** editor (`eventTags`) — separate from Note evidence |
| Flag Tracker | Chip Flag on Tags manager / Home Tags |
| Manage by role | Home → Intelligence → Tags → **Tag roles** chips (Evidence / Topic / Project / Event / Global) |

### Filters (Home Tags)

| Filter | Meaning |
|--------|---------|
| **Universe** | All roles (evidence + binder + global + trackers-in-universe) |
| **Tag roles** | Filter inventory by `TagRole` (Trackers remain a Flag strip, not a role) |
| **Hot / Patterns / Stale** | Evidence Tags only (activity scores) |
| **Trackers** | Flagged keys in `signalTags` |

### Retired / forbidden

| Pattern | Status |
|---------|--------|
| Generic `linkedTags` with mixed semantics | **Deprecated** — dual-read only |
| Session `knownExtras` merged into “Tags on this…” | **Forbidden** — scoped session draft only |
| Four independent pickers / normalize stacks | **Forbidden** |
| Patterns from project/event/topic binder tags | **Forbidden** |
| IDs stored as Tags | **Forbidden** |

Nav badge counts are **not** Trackers (`buildV2NavCounts`) — triage debt only.
