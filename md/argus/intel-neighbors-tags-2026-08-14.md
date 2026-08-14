# Intel viz investigations — Neighbors Molecule + Tag dots

**Date:** 2026-08-14  
**Status:** **MERGED / sealed** — visual OK; ship approved for `#271`  
**Audience:** humans + AI agents  
**Canonical:** `main` → this file  

### Post-merge decision (2026-08-14 — do not reopen casually)

1. **Molecule remains experimental** — UI toggle only (`Radial | Molecule`).
2. **Radial remains production default.**
3. **Do not** convert Molecule to default until real-data use near the ~18-node cap proves it consistently wins — then flip with a **minimal** one-line default change.
4. **No further graph architecture** now (no Forge motor port, no React Flow, no shared ARGUS/Forge graph infra, no ontology/edge surgery).
5. Forge already donated the valuable idea (weighted forces + soft clustering) without contaminating ARGUS — **that was the goal; stop.**

Related PRs:

| Slice | PR | Branch |
|-------|-----|--------|
| Neighbors Molecule A/B | [#269](https://github.com/argometal/MatrixTrade/pull/269) | `cursor/graph-molecule-layout-e1a0` |
| Tag Intel small dots | [#270](https://github.com/argometal/MatrixTrade/pull/270) | `cursor/tag-intel-small-dots-e1a0` |
| Combined ship | [#271](https://github.com/argometal/MatrixTrade/pull/271) | `cursor/intel-neighbors-tags-ship-e1a0` |

---

## 1) Neighbors — weighted-force Molecule (Option A)

### Problem
ARGUS neighborhood relationships were good enough; the **radial layout** was too simple for dense ~13-node neighborhoods (e.g. SLB/XOM). Crossing spokes hid communities.

### Constraint (approved)
Same Evidence Engine graph construction. Same nodes, edges, kinds/weights, local/context neighborhood, ego focus semantics, SVG renderer, entity visual language, caps (~14–18). **Do not** change Forge, ontology, neighbor discovery, React Flow, 3D, or shared ARGUS/Forge infra.

### Decision
Add a second layout mode beside production Radial:

| Mode | Role |
|------|------|
| **Radial** | Production default — unchanged behavior |
| **Molecule** | Experimental cooled 2D weighted-force positions only |

### Implementation
- File: `lib/argus/v2/neighborhood-molecule-layout.ts`
- UI toggle: `app/argus/v2/components/V2KnowledgeGraph.tsx` — **Radial \| Molecule**
- Dependency: existing **`d3-force-3d`** (no new `d3-force`); `numDimensions(2)`
- Seed: radial positions → short cooled sim (~280 ticks)

| Force | Params | Intent |
|-------|--------|--------|
| link distance | weight ≥2 → 14; ≥1 → 26; else 42 | linked tight; affinity long |
| link strength | 0.85 / 0.40 / 0.12 | communities pull harder |
| charge | −48, distanceMax 70 | spread without explode |
| collide | r 5.5, strength 0.85 | reduce overlap |
| center / x / y | 0.06 / 0.02 / 0.02 | weak keep-in-view |
| parents | Org 0.08α / Project 0.06α on `linked` | Forge-inspired soft cluster; no new ontology |

### Focus behavior (Molecule)
**map → select → microscope** — keep full Molecule world coordinates; emphasize selected + 1-hop; subdue the rest. Do **not** re-layout into a new shape. Radial focus still re-layouts ego (production).

### Fixture / artifacts
- Tool: `tools/test-neighborhood-molecule-layout.ts`
- SVGs/PNGs: `artifacts/graph-molecule-ab/`
- Observed: two organic branches (XOM vs SLB) with weak bridge; cooled sim stable on 13 nodes; coords fit 0–100.

### Explicit non-goals
- Molecule is **not** the new default (**sealed** 2026-08-14)
- Do not delete edges to improve appearance
- Do not declare engine replacement; do not port Forge graph stack
- Next default flip only after real-data comparison near ~18-node topologies — minimal change

---

## 2) Tag Intel — small dots (labels visible)

### Problem
Home → Intelligence → Tags universe used **large evidence-sized bubbles** (`r ≈ 1.6–4.8+`). Bubbles overlapped the mark; labels only showed when `r >= 2.4` — names like `handover` often invisible.

### Emulation (approved direction)
| Pattern | Why |
|---------|-----|
| **Linear** | Micro color mark + readable text |
| **Obsidian graph** | Small nodes so labels win |
| Map-pin hit targets | Small visible dot + larger invisible tap area |

Avoid Gapminder-style area bubbles when the **tag name** must stay readable.

### Decision
Dot + always-on label plot. Axes unchanged: **recurrence × recency**. Evidence volume = faint size hint only (~`1.05–1.55`).

### Implementation
- File: `app/argus/v2/components/V2FocusTagPortfolio.tsx`
- Help: `lib/argus/v2/help-topics.ts` (`tags-universe`)
- Tracker: thin amber ring + `⚑` on the **label** (no huge halo / in-circle glyph)
- Invisible hit circle `r≈3.4` for taps
- De-overlap padding increased so labels have room

### Fixture / artifacts
- Tool: `tools/render-tag-intel-dots-ab.ts`
- SVGs/PNGs: `artifacts/tag-intel-dots/`

---

## 3) What AI / next agents should assume

1. Neighborhood graph data path unchanged (`buildV2EntityNeighborhoodGraph` / Evidence Engine). Layout is a **view** concern.
2. Radial = default. Molecule = review toggle until a later explicit default flip.
3. Tag universe is a **scatter of small dots**, not a bubble chart.
4. Do not port Forge React Flow / 3D into ARGUS based on these slices.
5. Prefer reading this file + [`intelligence-viz-plan.md`](intelligence-viz-plan.md) on **`main`** after merge (feature-branch URLs are deprecated for external AI — see [`../argus-review/00-PUBLIC-STATUS.md`](../argus-review/00-PUBLIC-STATUS.md)).

---

## 4) Key code paths

| Concern | Path |
|---------|------|
| Molecule layout | `lib/argus/v2/neighborhood-molecule-layout.ts` |
| Graph UI + toggle | `app/argus/v2/components/V2KnowledgeGraph.tsx` |
| Tag universe plot | `app/argus/v2/components/V2FocusTagPortfolio.tsx` |
| Shared layout helpers | `lib/argus/v2/intelligence-viz.ts` |
| Force typings | `types/d3-force-3d.d.ts` |
