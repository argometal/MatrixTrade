# ARGUS vocabulary — Topic, Tag, Alias, Signal

**Status:** Canonical (2026-08-07)  
**Mechanics:** [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md)

| Term | Where | Role |
|------|--------|------|
| **Topic** | Entity (`Kind: topic`) | Evidence binder |
| **Tag** | Evidence only (`inbox.topics[]`, `log.topics[]`) | User marks on items; Patterns / filters / Deliver |
| **Alias** | Topic entity (`linkedTags` storage) | Synonyms for matching inbox/search — not Patterns |
| **Signal** | Event entity (`linkedTags` storage) | User-defined event markers; copied to evidence on chronicle save → Patterns |

Nav badge counts are **not** Signals (see `buildV2NavCounts`) — they are **triage debt**.

**Network status** (New / Active / Dormant / Lost / Archived) is derived retrieval vocabulary — not a Tag/Signal/Pattern.

UI: one chip-list editor; copy is Aliases (Topics) or Signals (Events).

**Timeline vs Chronicle:** [`timeline-chronicle-model.md`](timeline-chronicle-model.md) · **Storage growth:** [`storage-archive-export.md`](storage-archive-export.md) · **Deprecated handoffs:** [`DEPRECATED-HANDOFFS.md`](DEPRECATED-HANDOFFS.md)
