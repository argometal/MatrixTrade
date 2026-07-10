# Intelligence visualization — plan & future work

Status: **implemented** (treemap + portfolio axes as of 2026-07). Tag pattern overlays implemented 2026-07-10 — see [`tag-patterns-vision.md`](tag-patterns-vision.md).

## Current behavior

### Treemap
- **Nodes:** organizations, projects, topics only (no events, tags, people).
- **Size:** evidence volume (journal logs + linked inbox emails).
- **Color:** recent activity share in the last 7 days (green = active, gray = quiet).

### Portfolio matrix
- **Nodes:** organizations, projects, topics.
- **Y axis:** recency — days since last evidence, mapped 0–1 (0d → 1, 90d+ → 0).
- **X axis:** recurrence — evidence item count in the last 30 days, normalized 0–1 within the portfolio set.
- **Bubble size:** total evidence count.
- No BCG quadrant labels or manual strategic/completion axes.

### Tags tab
- Tag cloud from `buildV2TagCloud` — top **20** tags by frequency (industry folksonomy cap).
- Separate from knowledge nodes; patterns use the same tag strings on evidence.

### Graph (neighborhood views)
- **Removed** global graph tab from Home Intelligence — whole-graph view was premature without graph infra.
- **Added** per-entity **Connection neighborhood** on organization, project, and topic detail views.
- Pattern: Kumu / Obsidian — local 1–2 hop subgraph around the open entity, not a universe map.
- **Layout:** radial — center entity in the middle (gold ring), neighbors on a ring.
- **Edges:** `linked`, `project-link`, `co-mentioned` (from journal `entityIds`).
- **Future:** typed edge tooltips, expand-on-click.

### Topic ↔ event linkage (recurrence / recency / evidence)
For **topics**, metrics include evidence on the topic entity **plus** linked events discovered via:
1. `topic.linkedEntityIds` → event entities
2. `project.linkedTopicIds` + `project.linkedEventIds` / `project.linkedEntityIds`
3. Journal logs that link both the topic and an event in `entityIds`

Events never appear as treemap nodes but can boost a topic’s size, color, recency, and recurrence.

---

## Tag pattern overlays (implemented)

User-defined **tags on evidence** — not Argus-inferred gaps, quality, or errors. See [`tag-patterns-vision.md`](tag-patterns-vision.md).

| Rule | Value |
|------|-------|
| Pattern floor | ≥ **3** tagged evidence items in scope (rule of three) |
| Freshness | ≥ 1 tagged item in last **90 days** |
| Topic-level flag | **Never** — only evidence carries tags |
| Treemap | Amber stroke when scope has active patterns |
| Entity header | Up to **3** pattern badges + overflow |

Picker shows top **10** frequent tags; tag cloud shows top **20**. User can create any tag; infrequent tags drop from suggestions.

---

## Key files
- `lib/argus/v2/intelligence-viz.ts` — node building, treemap layout, graph
- `app/argus/v2/components/V2KnowledgeTreemap.tsx`
- `app/argus/v2/components/V2PortfolioBubbleMatrix.tsx`
- `app/argus/v2/components/V2EntityNeighborhoodPanel.tsx`
- `app/argus/v2/components/V2KnowledgeGraph.tsx`
