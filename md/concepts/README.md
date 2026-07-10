# Concepts — apply later

**Status:** Deferred ideas worth keeping. Not runtime truth.

These documents describe **intended future behavior** — not what is deployed today.  
Before implementing any concept, read the matching **runtime** doc in `architecture/`, `rules/`, or `design/` first.

---

## How concepts relate to the Library

| Tier | Folder | Meaning |
|------|--------|---------|
| **Runtime** | `architecture/`, `rules/`, `design/` (checklists) | What the app does **now** — keep in sync with code |
| **Integrations** | `integrations/`, `protocols/` | How external systems connect — active or planned |
| **Concepts** | `concepts/` | Product/architecture ideas to apply **later** — do not treat as shipped |
| **ARGUS** | `argus/` | Separate product track — own lifecycle |

When a concept ships, move its description into the runtime tier and mark the concept doc **implemented** (or archive the concept section).

---

## Concept index

| Concept | Doc | Priority | Notes |
|---------|-----|----------|-------|
| ChatGPT import (`MT-IMPORT:v1`) | [import-handoff-v1.md](../protocols/import-handoff-v1.md) | P1 | Parser + `/import` confirm page |
| Structured plans from AI (`MT-PLAN:v1`) | [deferred-matrixtrade.md](deferred-matrixtrade.md) §1 | P1 | ChatGPT → Planning module |
| Company-centric knowledge | [companies-model.md](../topics/companies-model.md) | P2 | `companies/TICKER/` aggregation |
| Experiment restart (`experimentId`) | [deferred-matrixtrade.md](deferred-matrixtrade.md) §2 | P2 | H031+ cycles without monthly reset |
| Auto metrics pipeline | [deferred-matrixtrade.md](deferred-matrixtrade.md) §3 | P3 | `metrics/` from trades + plans |
| AI Session + QR revival | [deferred-matrixtrade.md](deferred-matrixtrade.md) §4 | P3 | Actions exist; UI disabled |
| Paste AI Notes save UI | [deferred-matrixtrade.md](deferred-matrixtrade.md) §5 | P3 | `saveAiNotesAction` orphaned |
| Snapshot copy on New Trade | [deferred-matrixtrade.md](deferred-matrixtrade.md) §6 | P2 | Today only on `/exchange` |
| Monthly risk history chart | [deferred-matrixtrade.md](deferred-matrixtrade.md) §7 | P3 | Last 6 months cap usage |
| Classic ↔ preview runtime toggle | [deferred-matrixtrade.md](deferred-matrixtrade.md) §8 | P4 | Legacy components preserved; no toggle |
| Planning Phase 1+ | [planning-module-proposal.md](../design/planning-module-proposal.md) §Phase 1 | P2 | Charts, alerts, AI batch on failures |
| Library vision alignment | [library-alignment-backlog.md](../matrix/library-alignment-backlog.md) | P1 | Older docs → `matrix/strategic-planning-vision.md` |
| Decision Lab gatekeeper | [strategic-planning-vision.md](../matrix/strategic-planning-vision.md) | **Done** | Scouting Desk + inbox apply |
| AI mechanics brief | [ai-engineering.md](../matrix/ai-engineering.md) | **Done** | `lib/ai-context.ts` + scout-assessment / file-update |
| MATRIX v2 data folders | [deferred-matrixtrade.md](deferred-matrixtrade.md) §9 | P3 | `portfolio/`, `journal/`, `lessons/` population |

---

## Rules for concept docs

1. **Never mix** concept formulas with runtime docs without a clear status header.
2. **Link back** to the runtime doc that will own the feature when built.
3. **Do not delete** — mark `Status: Deferred` or `Status: Implemented → see X`.
4. **ARGUS concepts** stay under `md/argus/` — this folder is MatrixTrade product only.
