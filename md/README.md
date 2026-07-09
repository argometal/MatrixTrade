# MD Library — Matrix / MatrixTrade

**Start here.** This folder is the documentation source of truth.  
If you need architecture, rules, integrations, or roadmap — it lives here.  
**Enough to reconstruct the entire system** without guessing.

Private repo: `github.com/argometal/MatrixTrade`

**ChatGPT entry point:** [`CHATGPT.md`](CHATGPT.md) (repo root — read first)

---

## How to use

1. **New to the project?** Read in order: `architecture/system-overview.md` → `architecture/repo-structure.md` → `phases/roadmap.md`
2. **Working on ARGUS?** Start with [`argus/README.md`](argus/README.md) — canonical index, reading order, runtime truth
3. **Verifying v2 UI?** → [`argus/v2-design-checklist.md`](argus/v2-design-checklist.md) — check each box before sign-off
4. **Verifying MatrixTrade preview UI?** → [`design/README.md`](design/README.md) — Home & Trades preview functional checklists (update on every UI change)
5. **Looking for a rule?** → `rules/`
6. **How does X connect to ChatGPT/Obsidian?** → `integrations/`
7. **Copy/paste protocols?** → `protocols/`
8. **Adding a new topic?** Create `topics/your-topic.md` and add a line to this index.

---

## Architecture

| Document | Contents |
|----------|----------|
| [system-overview.md](architecture/system-overview.md) | Layers: app, vault, repo, ChatGPT |
| [repo-structure.md](architecture/repo-structure.md) | All top-level folders |
| [matrixtrade-app.md](architecture/matrixtrade-app.md) | Next.js app, pages, lib |
| [data-flow.md](architecture/data-flow.md) | Create trade → Obsidian → export → ChatGPT |

---

## Rules

| Document | Contents |
|----------|----------|
| [experiment-cycle.md](rules/experiment-cycle.md) | H001–H030, P/L, limits, validation |
| [investment-principles.md](rules/investment-principles.md) | Capital preservation, discipline, framework |
| [data-ownership.md](rules/data-ownership.md) | App vs Obsidian vs you |
| [immutability-and-history.md](rules/immutability-and-history.md) | Never delete, version, append |

---

## Design (MatrixTrade preview QA)

| Document | Contents |
|----------|----------|
| [design/README.md](design/README.md) | **Index** — workflow + agent update rule |
| [design/features-used-vs-unused-checklist.md](design/features-used-vs-unused-checklist.md) | **Feature audit** — used vs built-but-unused |
| [design/legacy-vs-preview-map.md](design/legacy-vs-preview-map.md) | **Legacy vs preview** — route map |
| [design/new-mode-parity-checklist.md](design/new-mode-parity-checklist.md) | **Parity audit** — legacy features to add in preview mode |
| [design/home-preview-checklist.md](design/home-preview-checklist.md) | Situation Room `/home-preview` — functional checklist |
| [design/trades-preview-checklist.md](design/trades-preview-checklist.md) | Trades workspace `/trades-preview` — functional checklist |
| [design/planning-module-proposal.md](design/planning-module-proposal.md) | **Planning** `/planning` — Phase 0 implemented |

**Rule:** Update the matching checklist in the same change whenever preview UI code changes (see `.cursor/rules/design-checklists.mdc`).

---

## ARGUS

**Start here:** [`argus/README.md`](argus/README.md) — index, reading order, runtime truth, known weaknesses.

**Rule of construction for AI:** [`argus/evidence-organization-vision.md`](argus/evidence-organization-vision.md) — product identity; then [`argus/observation-engine-vision.md`](argus/observation-engine-vision.md) for engine behavior; [`argus/ai-charter.md`](argus/ai-charter.md) for operational AI rules. Periodic review: [`argus/vision-review-protocol.md`](argus/vision-review-protocol.md).

| Document | Contents |
|----------|----------|
| [README.md](argus/README.md) | **ARGUS doc index** — product loop, status legend, routes, mobile QA |
| [evidence-organization-vision.md](argus/evidence-organization-vision.md) | **Evidence Organization System** — product identity; not authoring |
| [observation-engine-vision.md](argus/observation-engine-vision.md) | **Observation Engine** — how the system behaves |
| [ai-charter.md](argus/ai-charter.md) | **AI Charter v1.0** — preserve professional truth; evidence before conclusions |
| [vision-review-protocol.md](argus/vision-review-protocol.md) | **Vision review** — cadence + alignment checklist |
| [knowledge-model-v01.md](argus/knowledge-model-v01.md) | **Canonical ontology** — Evidence, Project, Topic, Person, Organization, linking graph |
| [knowledge-execution-model.md](argus/knowledge-execution-model.md) | **Knowledge vs Execution** — Runbook, entities, Create menu |
| [timeline-vision.md](argus/timeline-vision.md) | **Timeline UX** — entity-scoped evidence stream |
| [v2-hierarchy-implementation-report.md](argus/v2-hierarchy-implementation-report.md) | **v2 linking rules** — org direct-only scope, project via contacts, code map |
| [network-browse-spec.md](argus/network-browse-spec.md) | **Network browser** — relationship intelligence, strength from evidence |
| [v2-design-checklist.md](argus/v2-design-checklist.md) | **v2 design QA checklist** — verify each screen; reset on redesign |
| [correlation-guide.md](argus/correlation-guide.md) | **ARGUS correlation guide v1.0** — capture once, link everywhere |
| [create-link-mobile-checklist.md](argus/create-link-mobile-checklist.md) | Create & Link mobile wizard QA |
| [create-link-correlation-review.md](argus/create-link-correlation-review.md) | Post-session link graph review template |
| [v2-checklist-solutions.md](argus/v2-checklist-solutions.md) | How each checklist item is solved or deferred |
| [checklist-protocol.md](argus/checklist-protocol.md) | **Mandatory:** update checklist on every v2 UI change |
| [design-matrix-stage.md](argus/design-matrix-stage.md) | Three lenses (org / project / person) and v2 route map |
| [product-flow-proposal.md](argus/product-flow-proposal.md) | Evidence → relations → narrative; 30-second story test |
| [deliver-export-checklist.md](argus/deliver-export-checklist.md) | **Deliver / Export QA** — Evidence Vault v1 testing |
| [changes-numbered.md](argus/changes-numbered.md) | Numbered change log (inbox linking, v2 hierarchy, etc.) |
| [email-intake-e2e.md](argus/email-intake-e2e.md) | Email intake end-to-end |
| [phase-1-gate.md](argus/phase-1-gate.md) | Phase 1 gate criteria |

---

## Integrations

| Document | Contents |
|----------|----------|
| [obsidian.md](integrations/obsidian.md) | Vault, frontmatter, note body |
| [chatgpt-bridge.md](integrations/chatgpt-bridge.md) | Export, sync control, ChatGPT role |
| [cloudflare-worker-bridge.md](integrations/cloudflare-worker-bridge.md) | **Active plan:** Worker + KV snapshot URL for ChatGPT |
| [vercel-argus-production-handoff.md](integrations/vercel-argus-production-handoff.md) | Vercel + ARGUS production gap |
| [argus-storage.md](integrations/argus-storage.md) | **ARGUS persistent storage — ARGUS_DATA_DIR (P0)** |
| [argus-architecture.md](integrations/argus-architecture.md) | ARGUS accepted architecture (constitution) |
| [argus-design-principles.md](integrations/argus-design-principles.md) | **ARGUS design principles — gate before UX** |
| [argus-chatgpt-handoff.md](integrations/argus-chatgpt-handoff.md) | ARGUS Journal + Network — ChatGPT instructions |
| [github-and-privacy.md](integrations/github-and-privacy.md) | Private repo, gitignore, what syncs |
| [mobile-connect.md](integrations/mobile-connect.md) | QR codes, local network access |

---

## Protocols

| Document | Contents |
|----------|----------|
| [export-context.md](protocols/export-context.md) | Copy Full Context format |
| [import-handoff-v1.md](protocols/import-handoff-v1.md) | MT-IMPORT / MT-UPDATE (planned) |

---

## Phases

| Document | Contents |
|----------|----------|
| [roadmap.md](phases/roadmap.md) | Phase 0–4 status and next steps |

---

## Topics

Add one `.md` per subject as the system grows.

| Document | Contents |
|----------|----------|
| [trading-journal-product-research.md](research/trading-journal-product-research.md) | **Product research:** TraderSync, Edgewonk, TradesViz, etc. — principles before design |
| [companies-model.md](topics/companies-model.md) | Per-ticker folder structure |
| [decision-framework.md](topics/decision-framework.md) | Why this company, why now |
| [analysis-workflow.md](topics/analysis-workflow.md) | Multi-timeframe workflow |

---

## Legacy pointers (root files)

These remain at repo root for compatibility; **md/ is canonical**:

| Root file | Canonical md doc |
|-----------|------------------|
| `MATRIX-v2-VISION.md` | Summarized across md/; see `architecture/system-overview.md` |
| `MatrixTrade-IP01.md` | `rules/experiment-cycle.md` |
| `vault/ORM/*.md` | Technical detail; see `architecture/matrixtrade-app.md` + `integrations/obsidian.md` |

---

## Adding new documentation

```text
md/topics/new-subject.md   ← new topic
md/README.md               ← add one row to the index
```

Keep documents **simple**, one topic per file, plain markdown.
