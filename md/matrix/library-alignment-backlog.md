# Library alignment backlog — Matrix strategic vision

**Status:** Pending (2026-07-10).  
**Trigger:** [strategic-planning-vision.md](strategic-planning-vision.md) established as canonical product identity.

Update these docs so the whole Library points to the same mission. Do not delete history — add status headers and links.

---

## Priority 1 — Identity & entry points

| Doc | Action |
|-----|--------|
| [`MATRIX-v2-VISION.md`](../../MATRIX-v2-VISION.md) | Add banner: strategic core → `md/matrix/`; demote H001–H030 as primary framing; note trading lab (no cap) |
| [`md/README.md`](../README.md) | **Done** — Matrix tier added; verify index row |
| [`CHATGPT.md`](../../CHATGPT.md) | Point ChatGPT entry to `md/matrix/strategic-planning-vision.md` before handoffs | **Done** 2026-07-10 — mechanics brief + vision links |
| [`md/architecture/system-overview.md`](../architecture/system-overview.md) | Add fifth conceptual layer: Playbook → Stock File → Decision Lab → Trade; keep technical four-layer diagram |

---

## Priority 2 — Runtime docs (must match vision language)

| Doc | Action |
|-----|--------|
| [`md/architecture/matrixtrade-app.md`](../architecture/matrixtrade-app.md) | Reframe modules under strategic core; map routes to four layers |
| [`md/architecture/data-flow.md`](../architecture/data-flow.md) | Extend flow: File → Lab decision → Trade; not only Create trade → Obsidian |
| [`md/design/planning-module-proposal.md`](../design/planning-module-proposal.md) | **Done** (2026-07-10) — UI name Scouting Desk; gatekeeper framing |
| [`md/design/stock-thesis-proposal.md`](../design/stock-thesis-proposal.md) | **Done** (2026-07-10) — Stock File naming in prose |
| [`md/protocols/chat-handoff-trading-book.md`](../protocols/chat-handoff-trading-book.md) | Replace or shorten with mechanics brief spec; mark superseded sections |
| [`md/phases/roadmap.md`](../phases/roadmap.md) | Add Phase: Decision Lab gatekeeper + AI mechanics brief |

---

## Priority 3 — Rules & concepts

| Doc | Action |
|-----|--------|
| [`md/rules/experiment-cycle.md`](../rules/experiment-cycle.md) | Position experiment as **lab** under Trade layer, not whole product identity |
| [`md/rules/investment-principles.md`](../rules/investment-principles.md) | Cross-link decision framework to Decision Lab |
| [`md/concepts/deferred-matrixtrade.md`](../concepts/deferred-matrixtrade.md) | Add row: `buildMatrixMechanicsBrief`, Decision Lab gatekeeper, Stock File rename |
| [`md/concepts/README.md`](../concepts/README.md) | Index new deferred items |
| [`md/topics/companies-model.md`](../topics/companies-model.md) | Relate `companies/TICKER/` to Stock File (repo depth vs app profile) |
| [`md/topics/decision-framework.md`](../topics/decision-framework.md) | Own questions → Decision Lab checklist |

---

## Priority 4 — Design checklists & research

| Doc | Action |
|-----|--------|
| [`md/design/features-used-vs-unused-checklist.md`](../design/features-used-vs-unused-checklist.md) | Add Stock File route; relabel Planning → Decision Lab (when renamed) |
| [`md/design/legacy-vs-preview-map.md`](../design/legacy-vs-preview-map.md) | `/stock-theses/[id]` row |
| [`md/design/README.md`](../design/README.md) | Link `md/matrix/` as product vision source |
| [`md/research/trading-journal-product-research.md`](../research/trading-journal-product-research.md) | Note differentiation: strategic planning vs journal category |

---

## Code / UI follow-ups (document only — implement separately)

| Item | Notes |
|------|-------|
| Rename UI “Stock Thesis” → “Stock File” | **Done** (2026-07-10) — UI labels; code IDs unchanged |
| Rename UI “Planning Lab” → Scouting Desk | **Done** (2026-07-10) — nav + `/planning` header; route unchanged |
| `buildMatrixMechanicsBrief()` | **Done** (2026-07-10) — `lib/matrix-mechanics-brief.ts`; `/exchange` + copy buttons |
| Scouting Desk gatekeeper UI | **Done** (2026-07-10) — MVP verdict panel + scouting context copy |
| `md/matrix/vision-review-protocol.md` | Create when Decision Lab v1 ships (mirror ARGUS) |

---

## Completion rule

When an item is done, mark it **Done** with date in this file. When the backlog is empty, archive this doc or fold remaining items into `md/phases/roadmap.md`.
