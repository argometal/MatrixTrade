# ARGUS vocabulary — Topic, Tag, Alias, Focus Tag (Signal)

**Status:** Canonical (2026-08-07)  
**Mechanics:** [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md)

| Term | Where | Role |
|------|--------|------|
| **Topic** | Entity (`Kind: topic`) | Evidence binder |
| **Tag** | Evidence only (`inbox.topics[]`, `log.topics[]`) | User marks on items; Patterns / filters / Deliver |
| **Alias** | Topic entity (`linkedTags` storage) | Synonyms for matching inbox/search — not Patterns |
| **Focus Tag** (Signal) | Journal `ArgusData.signalTags[]` | Flagged Tags → highlight-critical / reason to focus. **Not** auto-copied onto evidence |
| **Note** | `Log` row in Chronicle / Timeline | Narrative evidence (user label; code may say journal) |
| **Event** | Entity (`Kind: event`) | Case binder — not a Journal type |

**Retired:** Event binder Signals on Event `Entity.linkedTags` — migrated into journal `signalTags`. Topic Aliases remain on Topic `linkedTags`.

Nav badge counts are **not** Focus Tags (see `buildV2NavCounts`) — they are **triage debt**.

**Network status** (New / Active / Dormant / Lost / Archived) is derived retrieval vocabulary — not a Tag/Focus Tag/Pattern.

**Reading modes:** Timeline (org/project) · Chronicle (topic/event/person). Narrative rows = **Notes**. See [`timeline-chronicle-model.md`](timeline-chronicle-model.md).

UI: chip-list editor for Topic Aliases; Home → Tags for Focus Tags.

**Timeline vs Chronicle:** [`timeline-chronicle-model.md`](timeline-chronicle-model.md) · **Storage growth:** [`storage-archive-export.md`](storage-archive-export.md) · **Deprecated handoffs:** [`DEPRECATED-HANDOFFS.md`](DEPRECATED-HANDOFFS.md)
