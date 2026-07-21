# ARGUS vocabulary — Topic, Tag, Alias, Signal

**Status:** Canonical (2026-07-21)

| Term | Where | Role |
|------|--------|------|
| **Topic** | Entity (`Kind: topic`) | Evidence binder |
| **Tag** | Evidence only (`inbox.topics[]`, `log.topics[]`) | User marks on items; Patterns / filters / Deliver |
| **Alias** | Topic entity (`linkedTags` storage) | Synonyms for matching inbox/search — not Patterns |
| **Signal** | Event entity (`linkedTags` storage) | User-defined event markers; copied to evidence on chronicle save → Patterns |

Nav badge counts are **not** Signals (see `buildV2NavCounts`).

UI: one chip-list editor; copy is Aliases (Topics) or Signals (Events).
