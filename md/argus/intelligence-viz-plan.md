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

### Tags tab (Home → Intelligence → Tags)
- **Tag universe** workspace (`V2FocusTagPortfolio`) — Universe / Hot / Patterns / Stale / Trackers.
- **Stale** = has evidence but none in the last 90 days (still a Tag).
- Universe includes evidence Tags + Topic Tags (`linkedTags`) + Trackers (`signalTags`).
- **Trackers strip** + Manage editor — Flag / Disable Tracker never deletes Note or Topic Tags.
- Bubble plot: recency × recurrence; ⚑ / amber ring = Tracker; gold ring = Pattern.
- Selection shows evidence + binders; binder click loads **connection neighborhood**.

### Graph (neighborhood views)
- **Removed** global graph tab from Home Intelligence — whole-graph view was premature without graph infra.
- **Home model (Tags is the template):**
  - **Main (center):** full Connection neighborhood around the selection — zoom / explore (`scope: local`).
  - **Right dock (small):** context neighborhood — **one level up** (Org above Project/Topic when linked), else a wider neighborhood (`scope: context`).
  - Applies on Treemap, Portfolio, and Tags binder selection.
- **Entity detail:** Connection neighborhood on organization, project, topic, and event browse detail (same main graph).
- Pattern: Kumu / Obsidian — local 1–2 hop subgraph around the open entity, not a universe map.
- **Layout:** radial — center entity in the middle (gold ring), neighbors on a ring.
- **Edges:** `linked`, `project-link`, `co-mentioned`, `focus-affinity` (shared Tracker).
- **Halo:** rose/amber = evidence carries a Tracker Tag.
- **Shipped:** expand-on-click ego focus — click a node to show only that node + direct neighbors; Back / Full neighborhood / Esc returns. ⌘/Ctrl+click opens the entity. Dual-ring layout when crowded.

### Topic ↔ event linkage (recurrence / recency / evidence)
For **topics**, Home treemap/portfolio **and Topics browse cards** count evidence on the topic entity **plus** linked events (Notes/emails on Event binders). Topic **Chronicle** stays topic-direct; Event notes remain under Connections / Event.

Linked events discovered via:
1. `topic.linkedEntityIds` / outbound bags → event entities
2. Reverse Event→Topic links (`linkedTopicIds` / `linkedEntityIds`)
3. Journal logs that link both the topic and an event in `entityIds`

Events never appear as treemap nodes but can boost a topic’s size, color, recency, recurrence, and browse “evidence” totals.

### Topics browse viewers
- **Grid · cards** / **List · rows** / **Manage · Active / Quiet / Empty / Archived** (hover names on the icon switcher; board id stays `board` in prefs).

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

## ArgusForge graph — comparison only (do not port)

ArgusForge has richer graph infra (`/forge/argus/units` 3D + realm React Flow). **Do not copy Forge code into Argus.** Useful advantages to steal as *ideas*:

| Advantage | Forge | Argus today |
|-----------|-------|-------------|
| Explicit Focus / ego | Dim or show selected + neighbors | **Shipped** click-to-focus ego in neighborhood SVG |
| 3D force layout | `react-force-graph-3d` | Not implemented — SVG radial only |
| Filters / search dimming | Multi-axis | Not on neighborhood graph |
| Camera Fit / Reset | Orbit + reheat | Expand fullscreen only |
| Typed relations UI | Drag-to-relate | Evidence-derived edges only |

**3D:** never implemented in Argus v2. Forge proves 3D helps dense molecules; Argus stays 2D SVG for Evidence Engine simplicity until a dedicated graph infra pass.

---

## Key files
- `lib/argus/v2/intelligence-viz.ts` — node building, treemap layout, graph
- `lib/argus/v2/topic-loaders.ts` — Topic browse rows (portfolio evidence = Topic ∪ Events)
- `app/argus/v2/components/V2KnowledgeTreemap.tsx`
- `app/argus/v2/components/V2PortfolioBubbleMatrix.tsx`
- `app/argus/v2/components/V2FocusTagPortfolio.tsx` — Tags · Trackers universe
- `app/argus/v2/components/V2HomeNeighborhoodViewer.tsx` — Home lens neighborhood
- `app/argus/v2/components/V2EntityNeighborhoodPanel.tsx`
- `app/argus/v2/components/V2KnowledgeGraph.tsx`
- [`vocabulary-policy.md`](vocabulary-policy.md) — Tag vs Tracker
