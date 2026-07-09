# ARGUS — Documentation Index

**Start here** for architecture, principles, product flow, implementation status, and handoffs.

| | |
|---|---|
| **Repo** | [github.com/argometal/MatrixTrade](https://github.com/argometal/MatrixTrade) |
| **App** | `/argus/*` inside MatrixTrade (Next.js 15) |
| **Production** | https://matrix-trade-theta.vercel.app/argus |
| **Parent index** | [`md/README.md`](../README.md) |
| **ChatGPT entry** | [`CHATGPT.md`](../../CHATGPT.md) · [`argus-chatgpt-handoff.md`](../integrations/argus-chatgpt-handoff.md) |

---

## Product loop

```text
Receive → Organize → Correlate → Retrieve → Deliver
```

**Identity:** ARGUS is an **Evidence Organization System** — not a note-taking or document-authoring app. See [`evidence-organization-vision.md`](evidence-organization-vision.md).

| Stage | Status (2026-07-09) |
|-------|---------------------|
| **Receive** | Inbox API, email intake, journal (evidence registration), Create & Link |
| **Organize** | Entity graph, v2 browsers, topic/event evidence panels |
| **Correlate** | Link once, entity neighborhoods, topic binders |
| **Retrieve** | v2 timelines, evidence streams, search, detail pages |
| **Deliver** | **Evidence Vault v1** (`POST /api/argus/export`) — other packages proposed |

---

## Status legend

Use these labels in docs and checklists. Update when reality changes.

| Label | Meaning |
|-------|---------|
| **Canonical** | Rule of construction — follow even if code lags |
| **Implemented** | Shipped in repo; may need QA |
| **In progress** | Active iteration; docs may trail code slightly |
| **Proposed** | Design / handoff only — not built |
| **Deferred** | Agreed later; do not block current work |
| **Legacy** | Still routed; prefer v2 equivalent |

**Rule:** When code and docs disagree, fix docs in the **same iteration** or mark the gap explicitly in [Known weaknesses](#known-weaknesses-lean-into-each-iteration).

---

## Reading order

### Track A — Principles & architecture (read first)

0. [`evidence-organization-vision.md`](evidence-organization-vision.md) — **what** ARGUS is (Evidence Organization System; not authoring)
1. [`observation-engine-vision.md`](observation-engine-vision.md) — **how** ARGUS behaves (observation engine)
2. [`../integrations/argus-design-principles.md`](../integrations/argus-design-principles.md) — 10 design rules
3. [`../integrations/argus-architecture.md`](../integrations/argus-architecture.md) — objects, information flow
4. [`ai-charter.md`](ai-charter.md) — AI must trace to evidence; never fabricate
5. [`correlation-guide.md`](correlation-guide.md) — capture once, link everywhere
6. [`vision-review-protocol.md`](vision-review-protocol.md) — periodic vision alignment (AI + human)

### Track B — Product & lenses

7. [`knowledge-model-v01.md`](knowledge-model-v01.md) — **target** ontology (Evidence graph)
8. [`knowledge-execution-model.md`](knowledge-execution-model.md) — Evidence registration, entities, Execution
9. [`timeline-vision.md`](timeline-vision.md) — Timeline scope and placement
10. [`design-matrix-stage.md`](design-matrix-stage.md) — org / project / person lenses
11. [`product-flow-proposal.md`](product-flow-proposal.md) — evidence → relations → narrative
12. [`v2-hierarchy-implementation-report.md`](v2-hierarchy-implementation-report.md) — **implemented** linking rules + code map

### Track C — Build, QA, export

13. [`v2-design-checklist.md`](v2-design-checklist.md) + [`checklist-protocol.md`](checklist-protocol.md)
14. [`v2-checklist-solutions.md`](v2-checklist-solutions.md) — fixed vs deferred
15. [`export-delivery-handoff.md`](export-delivery-handoff.md) — delivery layer analysis + vault v1
16. [`model-alignment-audit.md`](model-alignment-audit.md) — v3 runtime vs v01 target gaps

---

## Runtime truth (developers)

**Do not guess.** ARGUS runs **two documented models** until v01 migration:

| Layer | Today (v3 runtime) | Target (v01) |
|-------|-------------------|--------------|
| Storage | `ArgusData` in `journal.json` and/or Supabase | Unified `argus_evidence` + junctions |
| Journal | `Log` (`kind`: log \| event \| follow_up) | Evidence rows |
| Email | `InboxItem` (pending \| linked \| converted \| archived) | Evidence + links |
| Entities | `Entity` polymorphic blob | Typed Person, Org, Project, Topic, Event |
| Topics | `log.topics[]` strings + topic entities | Topic table + tags separated |
| Code entry | `lib/argus/types.ts`, `server-storage.ts` | `supabase/argus-v01-schema.sql` (draft) |

**When implementing features:** use v3 types and existing loaders. When designing schema:** use v01 ontology. Document new gaps in [`model-alignment-audit.md`](model-alignment-audit.md).

### Lens rules (implemented — do not duplicate)

| Scope | Evidence rule | Code |
|-------|---------------|------|
| Organization | Direct links only, all dates | `organizationEvidenceScope()` |
| Person | Direct links only, all dates | `personEvidenceScope()` |
| Project | Direct + via `linkedPersonIds`, date-bounded | `getProjectEvidenceScope()` |
| Topic / Event | Direct links (entity id in `entityIds` / `linkedEntityIds`) | Same as org scope on entity |

Source: [`lib/argus/v2/hierarchy.ts`](../../lib/argus/v2/hierarchy.ts)

---

## Current routes (v2 primary)

| Area | Route | Notes |
|------|-------|-------|
| Home | `/argus/v2` | Dashboard |
| Inbox | `/argus/v2/inbox` | Triage, link, tags |
| **Deliver** | `/argus/v2/deliver` | Export Center (Evidence Vault v1) |
| Network browse | `/argus/v2/browse/network` | People roster |
| Person detail | `/argus/v2/network/[id]` | Relationship overview |
| Organization | `/argus/v2/organizations/[id]` | Forever timeline |
| Project | `/argus/v2/projects/[id]` | Bounded engagement |
| Topics / Events | `/argus/v2/browse/topics`, `.../events` | Master-detail |
| Export API | `POST /api/argus/export` | Evidence Vault ZIP (no UI button yet) |
| Legacy | `/argus/journal`, `/argus/network/[id]` | Redirect or narrow layout — porting to v2 |

---

## Document map

### Constitution & AI

| Doc | Status |
|-----|--------|
| [evidence-organization-vision.md](evidence-organization-vision.md) | Canonical (product identity) |
| [observation-engine-vision.md](observation-engine-vision.md) | Canonical |
| [ai-charter.md](ai-charter.md) | Canonical |
| [vision-review-protocol.md](vision-review-protocol.md) | Canonical |
| [correlation-guide.md](correlation-guide.md) | Canonical |
| [../integrations/argus-design-principles.md](../integrations/argus-design-principles.md) | Canonical |
| [../integrations/argus-architecture.md](../integrations/argus-architecture.md) | Canonical |

### Model & alignment

| Doc | Status |
|-----|--------|
| [knowledge-model-v01.md](knowledge-model-v01.md) | Canonical (target) |
| [knowledge-execution-model.md](knowledge-execution-model.md) | Canonical |
| [model-alignment-audit.md](model-alignment-audit.md) | Reference — gap list |
| [../integrations/argus-storage.md](../integrations/argus-storage.md) | Implemented |

### Product & UX

| Doc | Status |
|-----|--------|
| [timeline-vision.md](timeline-vision.md) | Canonical |
| [design-matrix-stage.md](design-matrix-stage.md) | Canonical lenses |
| [product-flow-proposal.md](product-flow-proposal.md) | Canonical flow |
| [network-browse-spec.md](network-browse-spec.md) | Spec |
| [v2-design-checklist.md](v2-design-checklist.md) | QA — update every UI change |
| [v2-checklist-solutions.md](v2-checklist-solutions.md) | QA solutions |
| [checklist-protocol.md](checklist-protocol.md) | Mandatory process |
| [create-link-mobile-checklist.md](create-link-mobile-checklist.md) | Mobile QA |
| [changes-numbered.md](changes-numbered.md) | Change log |

### Delivery & export

| Doc | Status |
|-----|--------|
| [deliver-export-checklist.md](deliver-export-checklist.md) | **Deliver / Export QA** — Evidence Vault v1 testing |
| `lib/argus/export/` | Evidence Vault v1 code |

### Ops & handoffs

| Doc | Status |
|-----|--------|
| [../integrations/argus-chatgpt-handoff.md](../integrations/argus-chatgpt-handoff.md) | External AI |
| [../integrations/vercel-argus-production-handoff.md](../integrations/vercel-argus-production-handoff.md) | Production gaps |
| [email-intake-e2e.md](email-intake-e2e.md) | Email pipeline |
| [phase-0-1-stabilization-audit.md](phase-0-1-stabilization-audit.md) | Stabilization |
| [phase-1-gate.md](phase-1-gate.md) | Gate criteria |

---

## Known weaknesses (lean into each iteration)

Explicit debt — fix or re-acknowledge each pass:

| # | Weakness | Mitigation this iteration |
|---|----------|---------------------------|
| 1 | Docs split across `md/argus/` and `md/integrations/` | **This README** is the single ARGUS entry; integrations hold constitution only |
| 2 | v3 runtime vs v01 target confuses readers | [Runtime truth](#runtime-truth-developers) section above |
| 3 | Checklist lags code (person v2, export, inbox Process) | Update `v2-design-checklist.md` when touching those areas |
| 4 | Deliver layer only partially built | **Export Center UI** + Vault API; other packages + history deferred |
| 5 | Inbox follow-up does not feed person Attention metrics | Documented in product design; wire in a later iteration |
| 6 | Legacy routes still exist | Redirects where safe; remove when v2 parity confirmed |
| 7 | Production data on Vercel needs Supabase | See vercel handoff; local dev is source of truth for iteration |

**Iteration rule:** After each feature pass, update (1) this README status table, (2) relevant checklist boxes, (3) `changes-numbered.md` if user-facing.

---

## Local dev & mobile QA (without Vercel push)

Industry practice: **validate on device against local or preview**, deploy when a slice is stable.

| Goal | Approach |
|------|----------|
| Phone test UI | Run `npm run dev` on LAN (`--hostname 0.0.0.0`); open `http://<your-ip>:3002/argus/v2` on phone (same Wi‑Fi) |
| Phone test without deploy | No Vercel push required; data from local `ARGUS_DATA_DIR` or Supabase env in `.env.local` |
| Export test | `POST /api/argus/export` with session cookie — see [export-delivery-handoff.md](export-delivery-handoff.md) |
| Production smoke | Push to Vercel only when checklist slice is green; prod URL: `matrix-trade-theta.vercel.app` |
| Private records on phone | Unlock PIN in app before export with `includePrivate: true` |

**Do not assume** production has the latest code until pushed. Phone sessions against local dev are valid QA.

---

## Evidence Vault v1 (quick reference)

```http
POST /api/argus/export
Content-Type: application/json
Cookie: argus-auth=1

{
  "package": "evidence_vault",
  "scopeType": "person",
  "scopeId": "<entity-id>",
  "includePrivate": false
}
```

**Scopes:** `person` | `project` | `organization` | `topic` | `event`

**ZIP contents:** `manifest.json`, `evidence.json`, `timeline.json`, `files/*`

**Code:** `lib/argus/export/` · `app/api/argus/export/route.ts`

---

## Adding documentation

1. One topic per file under `md/argus/` or `md/integrations/` (constitution only in integrations).
2. Add a row to the [document map](#document-map) above.
3. Add a line to [`md/README.md`](../README.md) if cross-cutting.
4. Set **Status** in the doc header (Canonical / Implemented / Proposed).
5. If AI-facing, link from [`ai-charter.md`](ai-charter.md) or [`argus-chatgpt-handoff.md`](../integrations/argus-chatgpt-handoff.md).

---

*Last updated: 2026-07-09 — Evidence Organization System identity; topic evidence panel.*
