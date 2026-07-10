# The Library — Matrix / MatrixTrade architecture

**Start here.** `md/` is **the Library** — the documentation architecture for this project.  
It is the source of truth for how the system is built, ruled, and evolved.  
**Enough to reconstruct the entire system** without guessing.

Private repo: `github.com/argometal/MatrixTrade`  
**Production:** https://matrix-trade-theta.vercel.app

**ChatGPT entry point:** [`CHATGPT.md`](../CHATGPT.md) (repo root — read first)

---

## Library tiers

| Tier | Path | What it holds |
|------|------|---------------|
| **Matrix (vision)** | `matrix/` | **Product identity** — strategic planning mission; read before designing features |
| **Runtime** | `architecture/`, `rules/`, `design/` | What the app **does today** — must match deployed code |
| **Phases** | `phases/` | Roadmap status — update when a phase completes |
| **Integrations** | `integrations/`, `protocols/` | ChatGPT, Obsidian, Worker, Supabase, Vercel |
| **Concepts** | `concepts/` | Ideas worth keeping — **apply later**, not shipped |
| **ARGUS** | `argus/` | Separate product — own index and lifecycle |
| **Topics / Research** | `topics/`, `research/` | Deep dives and product research |

**Rule:** If it is not deployed, it belongs in `concepts/` (or marked *Deferred* in the source doc).  
Do not treat concept docs as runtime behavior.

---

## Runtime snapshot (2026-07-10)

| Area | State |
|------|-------|
| UI shell | **Preview only** — dark `PreviewShell` on all trading routes |
| Data store | Supabase (`TRADES_STORE=supabase`) or local `data/` |
| Planning | `/planning` Phase 0 live |
| Monthly risk | Carryover toggle on `/system`; `closedAt` drives month bucketing |
| Legacy UI | Preserved in `app/components/legacy/` — not mounted |

See [`architecture/matrixtrade-app.md`](architecture/matrixtrade-app.md) for routes and modules.

---

## How to use

1. **New to the project?** [`matrix/strategic-planning-vision.md`](matrix/strategic-planning-vision.md) → `architecture/system-overview.md` → `phases/roadmap.md`
2. **What ships today?** `architecture/matrixtrade-app.md` + `rules/`
3. **What to build next?** `phases/roadmap.md` + `concepts/README.md`
4. **Working on ARGUS?** [`argus/README.md`](argus/README.md)
5. **Verifying MatrixTrade UI?** [`design/README.md`](design/README.md) — update checklists with every UI change
6. **Integrations** → `integrations/` · **Protocols** → `protocols/`
7. **New topic** → `topics/your-topic.md` + one row in this index

---

## Matrix (product vision)

**Start here for MatrixTrade mission** — not ARGUS.

| Document | Contents |
|----------|----------|
| [matrix/README.md](matrix/README.md) | **Index** — reading order, code vs vision map |
| [matrix/strategic-planning-vision.md](matrix/strategic-planning-vision.md) | **Identity** — Playbook → Stock File → Decision Lab → Trade |
| [matrix/library-alignment-backlog.md](matrix/library-alignment-backlog.md) | **Pending** — older library docs to align with vision |

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
| [experiment-cycle.md](rules/experiment-cycle.md) | Trading lab — no trade-count cap |
| [investment-principles.md](rules/investment-principles.md) | Capital preservation, discipline, framework |
| [data-ownership.md](rules/data-ownership.md) | App vs Obsidian vs you |
| [immutability-and-history.md](rules/immutability-and-history.md) | Never delete, version, append |

---

## Design (MatrixTrade preview QA)

| Document | Contents |
|----------|----------|
| [design/README.md](design/README.md) | **Index** — workflow + agent update rule |
| [design/features-used-vs-unused-checklist.md](design/features-used-vs-unused-checklist.md) | **Runtime audit** — used vs built-but-unused |
| [design/legacy-vs-preview-map.md](design/legacy-vs-preview-map.md) | **Route map** — preview active, legacy preserved |
| [design/new-mode-parity-checklist.md](design/new-mode-parity-checklist.md) | Parity audit — migration complete; sign-off pending |
| [design/home-preview-checklist.md](design/home-preview-checklist.md) | Situation Room `/home-preview` |
| [design/trades-preview-checklist.md](design/trades-preview-checklist.md) | Trades workspace `/trades-preview` |
| [design/planning-module-proposal.md](design/planning-module-proposal.md) | Planning Phase 0 **shipped**; Phase 1+ in concepts |

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
| [chat-handoff-trading-book.md](protocols/chat-handoff-trading-book.md) | **Check** — alinear cualquier chat antes de diseñar Stock Playbook |
| [import-handoff-v1.md](protocols/import-handoff-v1.md) | MT-IMPORT / MT-UPDATE (planned) |

---

## Phases

| Document | Contents |
|----------|----------|
| [roadmap.md](phases/roadmap.md) | Phase 0–4 status and next steps |

---

## Concepts (apply later)

| Document | Contents |
|----------|----------|
| [concepts/README.md](concepts/README.md) | **Index** — deferred ideas, priority, links |
| [concepts/deferred-matrixtrade.md](concepts/deferred-matrixtrade.md) | MT-PLAN, experiment restart, metrics, AI session, import |

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
