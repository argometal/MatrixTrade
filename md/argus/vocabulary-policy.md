# ARGUS vocabulary — Topic, Tag, Tracker

**Status:** Canonical (2026-08-09)  
**Mechanics:** [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md)

Two Tag roles only:

| Term | Where | Role |
|------|--------|------|
| **Tag** | On Notes/emails (`log.topics[]`, `inbox.topics[]`) | Accumulates evidence. Repetition → stronger Patterns / larger chips. |
| **Tracker** | Journal `ArgusData.signalTags[]` | Flag a Tag to watch it. Always visibly marked (⚑). Does **not** copy onto Notes. |
| **Topic** | Entity (`Kind: topic`) | Evidence binder |
| **Event** | Entity (`Kind: event`) | Case binder |
| **Note** | `Log` row in Chronicle | Narrative evidence |

**Flag** = the action (Flag / Unflag). **Tracker** = the role after you Flag a Tag.

### How to use

| Intent | Where |
|--------|--------|
| Put a Tag on evidence | Event → **Note** → Tags → Save |
| Flag / unflag a Tracker | **Click the Tag** (Topic Tags, Event Tags) or **Home → Tags** (control center — Flag if it isn’t a Tracker yet) |
| See Tags + Trackers together | **Home → Intelligence → Tags** (Universe + Trackers strip) |
| See Tags for a Topic | Topic → **Tags** (rolls up notes on the Topic + linked Events) |

### Deprecated

| Old | Status |
|-----|--------|
| **Match tags** (Topic `linkedTags` / Aliases) | **Deprecated** — UI removed. Search uses evidence Tags from notes. Storage ignored for product behavior. |
| Event Signals | Replaced by Tracker (Flag on Tags) |
| Separate “Focus Tags” list editor on Event | Replaced by click-to-Flag on Tag chips |

Nav badge counts are **not** Trackers (`buildV2NavCounts`) — triage debt only.

**Reading modes:** Timeline (org/project) · Chronicle (topic/event/person). See [`timeline-chronicle-model.md`](timeline-chronicle-model.md).
