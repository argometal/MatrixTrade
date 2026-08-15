# ARGUS · Consolidated product direction

**Status:** direction locked for discussion · **analysis only** · no auto-implementation  
**Audience:** product / architecture IA + implementers  
**Date:** 2026-08-15  

> Stable system. Do **not** redesign architecture or invent a new roadmap.  
> Reuse what exists. Discard suggestions that do not improve the current system.  
> Implement only after explicit approval of the analysis below.

---

## Brief (consolidated)

### 1. Graph / Neighborhoods

Graph is becoming one of ARGUS’s highest-value intelligence surfaces.

- Keep evidence-backed graph construction.
- Keep Local / Context / Ego focus concepts.
- Do **not** replace the ARGUS graph with Forge; learn visualization ideas only.
- Molecule experiment: correct idea; currently too compressed (overlap, label collide, unreadable edges, communities as blobs).
- **Retune, don’t redesign:** stronger collision/separation; visible space; grouped without touching; weak ties farther; important edges readable; don’t hide complexity for “clean.”
- Goal: readable molecular communities, not compact clusters.
- Study patterns: Obsidian local graph · Gephi/ForceAtlas · Forge force/collision/hierarchy.
- ARGUS data/provenance remains authoritative.

### 2. Portfolio

Do **not** delete Portfolio. Treat as **secondary** until it proves a distinct question that Graph / Tags / Patterns / Overview cannot answer better. Do not invest heavily merely because it exists.

### 3. Overview

Org/Project Overview → useful binder landing pages. Pulse experiment is directionally correct.

Answers: *What is this binder, what is happening inside it, and is there something requiring attention?*

```
OVERVIEW
Current state
[ Evidence mix ] [ Graph composition ] [ Activity ]
Patterns / signals
------------------
Needs attention
Maximum one concise actionable item
------------------
Explore
Timeline · Tags · Links
```

- Pulse primary · chips smaller/secondary · keep evidence donut, graph composition, patterns, Project sparkline.
- No vanity metrics · not another dashboard.
- Next possible experiment: **one** Open-work line (follow-up / open runbook / genuine actionable) — not a task manager.

### 4. Topic Event quick view

Evidence donut stays **inspect-only**. No sticky Chronicle yet. Understand composition → Open Event for depth.

### 5. What to emulate

- **Linear:** hierarchy, state before detail, restrained Overview, specialized deeper views.
- **Notion:** multiple views over same data; modular composition without duplicating data.
- **Obsidian:** local/context graph; progressive exploration.
- **Gephi/ForceAtlas:** community separation; readable relationship strength.
- **ArgusForge:** force/collision/layout concepts where useful.
- Do **not** copy any product wholesale.

ARGUS model:

Evidence → Relationships → Patterns / Signals → Attention / Action

| Surface | Job |
|---------|-----|
| Overview | Orientation |
| Graph | Structural exploration |
| Timeline | Chronology |
| Tags | Classification / provenance |
| Links | Explicit relationships |
| Patterns | Recurrence |
| Runbooks | Execution |

Each surface: distinct job.

### 6. Product discipline

Before changing: inspect code · find duplicates/legacy · reuse loaders/components · preserve provenance/ontology · prefer trimming over adding.

Continue removing visible “Journal” / “Documents” UI labels where they no longer match the model; **no** risky storage migrations for naming alone.

---

## Analysis (STOP — awaiting approval)

### 1. What already exists

| Area | Reality today |
|------|----------------|
| **Graph construction** | Evidence-backed via `buildV2EntityNeighborhoodGraph` (`intelligence-viz.ts`) + `collectNeighborEntityIds` (`scope-node-counts.ts`): structural links, reverse links, co-mentions, focus-affinity. Provenance stays in ARGUS loaders. |
| **Local / Context / Ego** | Local = entity-centered neighborhood; Context = parent Org/Project widen (`resolveNeighborhoodContextCenter`); Ego = click-to-focus inside `V2KnowledgeGraph` (Radial re-layout / Molecule preserve positions). No control labeled “Ego”; behavior exists. |
| **Molecule** | Experimental toggle Radial \| Molecule. Force sim in `neighborhood-molecule-layout.ts` (`d3-force-3d`, 2D). Degree-spacing pass already shipped (#286). Forge **not** imported. |
| **Portfolio** | Home Intelligence tab → `V2PortfolioBubbleMatrix` (recurrence × recency × evidence). Shares universe filters with Treemap/Tags. |
| **Overview pulse** | `V2OverviewBinderPulse` on Org/Project: evidence donut, graph binders donut, patterns, Project sparkline. Shipped experiment. |
| **Open-work signals** | Already loaded: Org `openFollowUps` / relationship facts; Project `runbookOpen`; Network `attentionSummaryMessage` — **no Overview CTA synthesizer yet**. |
| **Topic Event donut** | Links inspect-only in `V2TopicDetailPanel`; Open Event for Chronicle. Matches brief. |
| **Emulation targets in-repo** | Forge force ideas documented in `intelligence-viz-plan.md`; MTA Needs Attention / Situation Room = pattern-only (wrong domain for data). |

### 2. What is redundant

| Redundancy | Note |
|------------|------|
| Overview **chip grids first** + pulse below | Same binder health restated; chips compete with pulse for first viewport. |
| Tag patterns on **page header + pulse** (+ sometimes Tags tab) | Triple-ish recurrence of the same badges. |
| Org **Activity sparkline in aside** while Project puts it in pulse | Split composition; handoff wants Activity in the pulse row. |
| Portfolio vs Treemap | Same entity universe; Portfolio’s distinct question is weak vs Graph/Tags/Overview. Keep, don’t grow. |
| Visible **Journal / Documents** copy | `ADD_MENU.journal`, subtitle, some Tags/Inbox hints — UI debt, not storage. |

### 3. What should be retained

- Evidence-backed neighborhood builder and Local/Context/Ego behavior.
- Radial default; Molecule as experimental **retune** surface (not replacement).
- Overview pulse pieces: evidence donut, graph composition, patterns, Project sparkline.
- Topic Event inspect-only donut.
- Portfolio tab (secondary — no deletion, no heavy investment).
- Surface job split: Overview / Graph / Timeline / Tags / Links / Patterns / Runbooks.
- Provenance + ontology; ARGUS data authority over Forge.

### 4. Smallest useful next change

**Recommendation: Molecule readability retune only** (numerics + light label spacing), **or** Overview **pulse-first + single Open-work CTA**.

Given the brief’s emphasis that Graph is becoming highest-value, and Molecule pain is already user-visible:

| Priority | Change | Why smallest / highest leverage |
|----------|--------|----------------------------------|
| **A (preferred first)** | Retune Molecule collision, charge, link distance/strength, parent pulls; optional labelOffset tweak | Pure param pass; no architecture; matches “retune rather than redesign”; files already isolated |
| **B (second)** | Overview: pulse-first layout + one Open-work CTA synthesizer + demote chips to Explore links | Uses existing signals; matches Linear-style cover; already sketched in overview handoff |

Do **not** do A and B in one PR without approval of order.

### 5. Exact files affected

**If Molecule retune (A):**

| File | Role |
|------|------|
| `lib/argus/v2/neighborhood-molecule-layout.ts` | Collision, charge, distances, strengths, parent pulls |
| `app/argus/v2/components/V2KnowledgeGraph.tsx` | Optional `SIZE_CONFIG` / labelOffset only |
| `tools/test-neighborhood-molecule-layout.ts` | Smoke / fixture asserts |
| `artifacts/graph-molecule-ab/` | Optional A/B SVG refresh |

Leave alone: `buildV2EntityNeighborhoodGraph`, Forge libs, ontology.

**If Overview Open-work + pulse-first (B):**

| File | Role |
|------|------|
| `app/argus/v2/components/V2OverviewBinderPulse.tsx` | Layout: Evidence \| Graph \| Activity; Open-work slot; Explore links |
| `lib/argus/v2/overview-open-work.ts` | **New** thin synthesizer (follow-up → runbook → attention → hide) |
| `app/argus/v2/components/V2OrgShell.tsx` | Pulse first; shrink chips; wire CTA; Org Activity into pulse |
| `app/argus/v2/components/V2ProjectShell.tsx` | Same |
| Org/Project `page.tsx` | Pass already-loaded signals; drop duplicate header patterns if agreed |
| `tools/test-overview-open-work.ts` | Smoke |

Reuse (no port): `attentionSummaryMessage`, `runbookOpen` / `runbook-helpers`, `openFollowUps`.

### 6. What we recommend **NOT** doing

- Replace ARGUS graph with Forge / port Forge React Flow or 3D into Overview or Links.
- Redesign neighborhood data model or edge provenance for “cleaner” pictures.
- Delete Portfolio or heavy Portfolio redesign.
- Overview mini ego-graph; vanity KPIs; Needs Attention board / task manager.
- Sticky Chronicle Event donut.
- New roadmap / architecture rewrite.
- Storage migrations for Journal→Note naming.
- Auto-implement this entire brief in one agent pass.
- Invest in Portfolio until it owns a distinct question.

---

## Approval gate

Reply with which to ship first:

1. **A** — Molecule retune only  
2. **B** — Overview pulse-first + one Open-work CTA  
3. **Neither** — refine direction further  
4. **Docs-only** — this file stays as the sealed consolidado  

Until then: **no product code changes from this brief.**

---

## Related

- [`overview-pulse-experiment-handoff.md`](overview-pulse-experiment-handoff.md) — Overview cover proposal detail  
- [`intelligence-viz-plan.md`](intelligence-viz-plan.md) — Forge comparison (ideas only)  
- [`../integrations/current-deploy.md`](../integrations/current-deploy.md) — production pin  
