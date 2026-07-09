# ARGUS — Timeline Vision

**Status:** Canonical (product direction)  
**Purpose:** What Timeline should be — scope, placement, industry patterns, and phased upgrades.  
**Related:** [`observation-engine-vision.md`](observation-engine-vision.md) · [`knowledge-execution-model.md`](knowledge-execution-model.md) · [`design-matrix-stage.md`](design-matrix-stage.md)

**Not the same as:** [`v2-design-checklist.md`](v2-design-checklist.md) (UI/design QA only).

---

## 1. Agreement: Entities primary, Timeline secondary

| Layer | Role on Home | Question |
|-------|--------------|----------|
| **Entities** | **Primary** | Where do I go? (org, project, person, topic, event) |
| **Timeline** | **Secondary** | What happened recently across evidence? |

**Home change (2026-07-07):** Recent Activity removed (duplicated Timeline). Recent Entities promoted to main column.

Timeline earns its place only as a **visual guide into more** — not a second inbox or duplicate entity list.

---

## 2. What Timeline does today (runtime)

`buildV2HomeTimeline()` merges:

| Source | Rendered as |
|--------|-------------|
| Journal (`Log`) | Purple — note, log, meeting (heuristic) |
| Inbox (`InboxItem`) | Blue — email |

Limit: **8 items** in Home sidebar rail. “View all” → `/argus/journal`.

**Code:** `lib/argus/v2/loaders.ts` · `lib/argus/v2/timeline-builders.ts` · `V2Timeline.tsx` · `V2OrgTimeline.tsx` (richer on org/project pages).

### Not in Home Timeline today

- Entity Event records (dated meeting anchors)
- Runbook completion signals (Execution)
- File / attachment evidence
- Entity creation milestones
- Deduped inbox (converted emails may still appear)
- Per-entity scope on Home

### Why it feels “email only”

1. Inbox volume often exceeds journal volume → rail looks like mail.
2. Email rows use prominent “Email from …” titles.
3. Compact sidebar, 8-item cap, journal-only “View all”.
4. Same chronological slice that Recent Activity used to show.

Technically it is **evidence-only** (journal + inbox), not email-only — but UX reads as inbox-shaped.

---

## 3. North star

> **Timeline = chronological evidence + light execution signals, scoped to an entity (or a filtered global teaser) — never a second inbox.**

Aligned with Observation Engine: Timeline **reconstructs** and **correlates**; it does not score productivity or assign tasks.

---

## 4. Knowledge vs Execution on Timeline

### Knowledge stream (Timeline should show)

- Journal notes and logs
- Inbox / email evidence
- Files attached to journal or inbox
- Entity Events (“Weekly sync — Mar 12” as anchor; notes remain evidence)
- Tags / topics on evidence

### Execution stream (optional filter or sparse dots)

- Runbook completed (one dot when all steps done — not per checkbox)
- Follow-up due / overdue (future Execution table; today via journal `follow_up`)

### Structure stream (sparse milestones only)

- “Project created”, “Linked to organization” — not every edit

---

## 5. Industry patterns (what to borrow)

| Product | Pattern | Takeaway for ARGUS |
|---------|---------|-------------------|
| Salesforce / HubSpot | Activity timeline per account | Typed stream + filters on **entity** |
| Notion | History scoped to page | Timeline contextual to object |
| Linear | Project activity feed | Events + artifacts, not only messages |
| Clay / Folk | Relationship timeline | **Who** + **what happened** |
| Day One | Date-grouped life log | Kind icons, date columns |
| GitHub | Activity rail | Typed dots, density modes |

**Industry default for relationship/knowledge tools:**

1. Entity-scoped deep timeline (org / project / person).
2. Typed entries (email, note, meeting, file, milestone).
3. Filter chips (All · Journal · Email · Meetings · Files).
4. Two densities: compact rail (Home teaser) vs rich cards (entity detail).
5. Jump to evidence **or** entity — not always legacy log URL.
6. One stream — no duplicate “Recent Activity” panel.

`V2OrgTimeline` on organization/project pages is closer to target than Home sidebar rail.

---

## 6. Placement strategy

| Surface | Timeline role |
|---------|---------------|
| **Home** | Small mixed **teaser** (5 items) or remove; **Entities stay primary** |
| **Organization / Project / Person** | **Full timeline** — main reconstruction view |
| **Topic / Event browse** | Selected detail panel timeline |
| **Future `/argus/v2/activity`** | Global filtered activity (optional) |

**Rename candidate (Home sidebar):** “Timeline” → **“Recent evidence”** or **“Activity”** to avoid confusion with entity history.

---

## 7. Phased upgrades

| # | Feature | Priority | Notes |
|---|---------|----------|-------|
| 7.1 | Filter chips on Home: All · Journal · Email · Meetings | High | Stops “all email” feel |
| 7.2 | Hide inbox rows already `convertedLogId` | High | Less noise |
| 7.3 | Entity names on every row | High | Connects to lenses |
| 7.4 | Include Event entities on timeline | Medium | Meeting anchors |
| 7.5 | Runbook completed → single timeline dot | Medium | Execution visible |
| 7.6 | Shrink Home teaser to 5 items | Medium | Entities dominate |
| 7.7 | Rich timeline on all entity detail pages | High | Where industry puts the feature |
| 7.8 | Unified Activity page with date range | Lower | Full product |

---

## 8. Four verbs check

| Verb | Timeline role |
|------|---------------|
| **Observe** | Surfaces captured evidence in time order |
| **Correlate** | Shows linked people, orgs, projects, tags on each row |
| **Hypothesize** | Not on Timeline UI (future Insight layer) |
| **Reconstruct** | Primary job on entity pages — rebuild “what happened when” |

Timeline features that ask “how productive were you?” **violate** [`observation-engine-vision.md`](observation-engine-vision.md) — reject.

---

## 9. Decision log

| Date | Decision |
|------|----------|
| 2026-07-07 | Remove Home Recent Activity; promote Recent Entities |
| 2026-07-07 | Keep Timeline but narrow Home role; expand on entity pages |
| 2026-07-07 | Document industry patterns and phased scope in this file |
