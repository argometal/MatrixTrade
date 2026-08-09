# ARGUS vocabulary — Topic, Tag, Tracker

**Status:** Canonical (2026-08-09)  
**Mechanics:** [`evidence-engine-mechanics.md`](evidence-engine-mechanics.md)

## One Tag system

| Term | Where | Role |
|------|--------|------|
| **Tag** | Notes/emails (`topics[]`) **and** Topic binder (`entity.linkedTags`) | Same Tag names. Notes accumulate evidence / Patterns. Topic Tags keep the binder findable and stay in the Home universe. |
| **Tracker** | Journal `ArgusData.signalTags[]` | Watch-on for a Tag (⚑). **Flag / Disable Tracker** never deletes the Tag. |
| **Topic** | Entity (`Kind: topic`) | Evidence binder |
| **Event** | Entity (`Kind: event`) | Case binder |
| **Note** | `Log` row in Chronicle | Narrative evidence |

**Flag** = turn Tracker on. **Disable Tracker** = turn watch off. Tag remains unless explicitly removed from Notes or Topic Tags.

### Home → Intelligence → Tags filters

| Filter | Meaning |
|--------|---------|
| **Universe** | All Tags (evidence + Topic Tags + Trackers) |
| **Hot** | Used on evidence in the last **30 days** |
| **Patterns** | Recurring evidence Tags (Pattern floor) |
| **Stale** | Has evidence, but **none in the last 90 days** (dormant — still a Tag) |
| **Trackers** | Tags with watch-on |

There is no separate “Quiet Tracker” mode — a Tag with no evidence yet is still a Tag (often a new Topic Tag or a Tracker waiting for notes).

### How to use

| Intent | Where |
|--------|--------|
| Put a Tag on evidence | Event → **Note** → Tags → Save |
| Create Topic Tags | Topic → **Tags** → Topic Tags editor (Save) |
| Flag / Disable Tracker | Click the Tag chip (Event / Topic / Home → Tags). **Confirms both ways** before convert. Disable keeps the chip so you can re-Flag. |
| Tags on an Event | **Event → Tags → On this Event** = Tags already used on that Event’s Notes/emails. Put Tags on evidence via **Note → Tags** (picker pool + checkmarks). |
| Manage universe | **Home → Intelligence → Tags** (Universe filters + Trackers strip + Manage) — no easy delete of Tags |
| See Tags for a Topic | Topic → **Tags** (notes ∪ linked Events ∪ Topic Tags) |

### Trimmed / retired labels

| Old | Status |
|-----|--------|
| “Match tags” as a separate ontology | **Retired as a name** — same storage (`linkedTags`), now **Topic Tags** in the one Tag system |
| Quiet Tracker filter | **Removed** — zero-evidence names are Tags |
| Event Signals | Replaced by Tracker |
| Radioactive / critical marker wording | Use **Tracker** |

Nav badge counts are **not** Trackers (`buildV2NavCounts`) — triage debt only.

### Orphans · Linked (homologated triage)

Same attention vocabulary across binders and intake:

| Surface | Orphans | Linked / Quiet | Done hiding |
|---------|---------|----------------|-------------|
| **Topics** | Orphans — no evidence and no structural links | Quiet (linked or stale) · Active (recent evidence) | Archived |
| **Events** | Orphans — no Topic/Org/Project/Person neighbors | Linked | Archived |
| **Inbox** | Orphans — unlinked email (`pending`) | Linked | Archived (Converted = legacy) |

Events default to **latest first** with a Show more page; Upcoming/Past is a secondary time cut (`?when=`).

**Reading modes:** Timeline (org/project) · Chronicle (topic/event/person). See [`timeline-chronicle-model.md`](timeline-chronicle-model.md).
