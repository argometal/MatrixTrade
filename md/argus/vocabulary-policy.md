# ARGUS vocabulary — Topic, Tag, Match tag, Focus Tag

**Status:** Canonical (2026-08-07)  
**Mechanics:** [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md)

Keep the product word **TAGS**. Sub-roles stay under that family:

| Term | Where | Role |
|------|--------|------|
| **Topic** | Entity (`Kind: topic`) | Evidence binder |
| **Tag** (evidence) | `inbox.topics[]`, `log.topics[]` | Marks on Notes/emails → Patterns / filters / Deliver |
| **Match tag** | Topic entity (`linkedTags` storage) | Synonyms so inbox/search suggest this Topic — **not** Patterns |
| **Focus Tag** | Journal `ArgusData.signalTags[]` | Flagged Tags → highlight-critical / reason to focus. **Not** auto-copied onto evidence |
| **Note** | `Log` row in Chronicle / Timeline | Narrative evidence |
| **Event** | Entity (`Kind: event`) | Case binder — not a Journal type |

**Retired names**

| Old | Use |
|-----|-----|
| Event Signals (Event `linkedTags`) | Focus Tags + Note Tags |
| Aliases (Topic UI) | **Match tags** (same storage) |

### How to flag / tag in the UI

| Intent | Where |
|--------|--------|
| Tag a Note on an Event (Patterns) | Event → **Note** → Tags button → Save |
| Flag what you are watching | Event → **Tags** tab (Focus Tags), or Home → Tags |
| Help inbox find a Topic | Topic → **Tags** tab → Match tags |
| See tags/Patterns from linked Events | Topic → **Tags** tab (rollup; edit Note Tags on the Event) |

Nav badge counts are **not** Focus Tags (`buildV2NavCounts`) — triage debt only.

**Network status** (New / Active / Dormant / Lost / Archived) is derived retrieval vocabulary — not a Tag/Focus Tag/Pattern.

**Reading modes:** Timeline (org/project) · Chronicle (topic/event/person). See [`timeline-chronicle-model.md`](timeline-chronicle-model.md).

**Storage growth:** [`storage-archive-export.md`](storage-archive-export.md) · **Deprecated handoffs:** [`DEPRECATED-HANDOFFS.md`](DEPRECATED-HANDOFFS.md)
