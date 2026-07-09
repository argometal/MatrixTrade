# Intelligence visualization — plan & future work

Status: **implemented** (treemap + portfolio axes as of 2026-07). This doc captures decisions and **future** treemap flag overlays — not yet built.

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
- Unchanged — tag cloud from `buildV2TagCloud`, separate from knowledge nodes.

### Graph (neighborhood views)
- **Removed** global graph tab from Home Intelligence — whole-graph view was premature without graph infra.
- **Added** per-entity **Connection neighborhood** on organization, project, and topic detail views.
- Pattern: Kumu / Obsidian — local 1–2 hop subgraph around the open entity, not a universe map.
- **Layout:** radial — center entity in the middle (gold ring), neighbors on a ring.
- **Edges:** `linked`, `project-link`, `co-mentioned` (from journal `entityIds`).
- **Future:** typed edge tooltips, expand-on-click, gap/quality/error flags (`observation-engine-vision.md`).

### Topic ↔ event linkage (recurrence / recency / evidence)
For **topics**, metrics include evidence on the topic entity **plus** linked events discovered via:
1. `topic.linkedEntityIds` → event entities
2. `project.linkedTopicIds` + `project.linkedEventIds` / `project.linkedEntityIds`
3. Journal logs that link both the topic and an event in `entityIds`

Events never appear as treemap nodes but can boost a topic’s size, color, recency, and recurrence.

---

## Future: treemap flag overlays (plan only)

Goal: surface **automatic signals** as optional treemap decorations (border tint, corner badge, or hatch) — not new node types.

| Flag | Signal source (draft) | Visual intent |
|------|----------------------|---------------|
| **Information gaps** | Topic/project with low evidence vs peer set, or long silence after prior activity | Highlight under-documented areas |
| **Service quality** | Inbox/journal sentiment or SLA-style patterns (TBD — needs observation engine) | Flag recurring quality themes |
| **Errors** | Log tags / structured error mentions, failed follow-ups, repeated incident topics | Draw attention to failure modes |

### Implementation notes (when prioritized)
- Add computed `flags: TreemapFlag[]` on `V2KnowledgeNode` in `lib/argus/v2/intelligence-viz.ts`.
- Render in `V2KnowledgeTreemap.tsx` as overlays; keep size/color semantics unchanged.
- **No UI toggles in v1** — flags on by default once rules are stable, or env/feature gate later.
- Rules should be evidence-based and explainable in tooltips (same honesty bar as recency/recurrence).

### Open questions
- Should gap detection compare within org, within project, or global peer set?
- Service quality likely depends on observation-engine milestones (`observation-engine-vision.md`).
- Error detection: tag strings vs structured fields vs AI classification?

---

## Key files
- `lib/argus/v2/intelligence-viz.ts` — node building, treemap layout, graph
- `app/argus/v2/components/V2KnowledgeTreemap.tsx`
- `app/argus/v2/components/V2PortfolioBubbleMatrix.tsx`
- `app/argus/v2/components/V2EntityNeighborhoodPanel.tsx`
- `app/argus/v2/components/V2KnowledgeGraph.tsx`
