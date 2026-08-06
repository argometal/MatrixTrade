# 01 — README

**Canonical location:** `main` → `md/argus-review/`  
**Branch-only handoffs are deprecated.** See [`00-PUBLIC-STATUS.md`](00-PUBLIC-STATUS.md).

**Start here:**  
https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus-review/00-PUBLIC-STATUS.md

---

**Purpose of this pack:** Expose the existing Argus architecture exactly as implemented and documented in the repository, so ChatGPT can perform an evidence-based architectural review.

**Rules applied while assembling this pack:** No summarization-as-redesign, no reinterpretation, no recommendations, no invented architecture. Gaps marked `UNKNOWN`. Incomplete work marked `PARTIALLY IMPLEMENTED` only where the repository already uses that wording or an equivalent cited phrase. Where two documents disagree, both are reported.

---

## Overall purpose

Argus is the Evidence Organization System inside MatrixTrade (`/argus/*`). Trading and Argus share auth infrastructure only — not business logic or data (`md/integrations/argus-architecture.md`).

This directory (`md/argus-review/`) is a **read-only evidence pack** for external review. It is not a redesign brief.

---

## Document index (this pack)

| File | Contents |
|------|----------|
| [`00-PUBLIC-STATUS.md`](00-PUBLIC-STATUS.md) | Public status + main URLs (start here) |
| [`01-README.md`](01-README.md) | Purpose, index, reading order, version |
| [`02-system-map.md`](02-system-map.md) | Directories, modules, major files, purposes, dependencies |
| [`03-document-index.md`](03-document-index.md) | Every architecture document under `md/argus/` and `md/integrations/argus-*.md` |
| [`04-architecture.md`](04-architecture.md) | Current layers, components, responsibilities, ownership, interfaces |
| [`05-data-flow.md`](05-data-flow.md) | Inputs, outputs, persistent storage, memory/state, events |
| [`06-decision-flow.md`](06-decision-flow.md) | Current decision / gate / classification pipeline as coded |
| [`07-ontology.md`](07-ontology.md) | Entities, relationships, terminology (v3 runtime + documented v01 target) |
| [`08-dependencies.md`](08-dependencies.md) | Internal and external dependencies |
| [`09-open-items.md`](09-open-items.md) | TODOs, known limitations, incomplete implementations, identified debt |
| [`10-source-index.md`](10-source-index.md) | Traceability: statements → source paths |
| [`11-behavioral-evaluation-review.md`](11-behavioral-evaluation-review.md) | Behavioral evaluation inventory + prioritized refinement |
| [`12-evidence-engine-principles-solution.md`](12-evidence-engine-principles-solution.md) | Sealed principles + Evidence Engine solution |
| [`appendix-app-argus-files.txt`](appendix-app-argus-files.txt) | Complete `app/argus` `.ts`/`.tsx` paths (172) |
| [`appendix-lib-argus-files.txt`](appendix-lib-argus-files.txt) | Complete `lib/argus` `.ts`/`.tsx` paths (128) |
| [`appendix-actions-exports.txt`](appendix-actions-exports.txt) | All `export async function` names in `actions.ts` (73) |

---

## Reading order (for ChatGPT)

1. `00-PUBLIC-STATUS.md`
2. `01-README.md`
3. `02-system-map.md`
4. `03-document-index.md`
5. `04-architecture.md`
6. `05-data-flow.md`
7. `06-decision-flow.md`
8. `07-ontology.md`
9. `08-dependencies.md`
10. `09-open-items.md`
11. `10-source-index.md`
12. `11-behavioral-evaluation-review.md` (behavioral metrics refinement)
13. `12-evidence-engine-principles-solution.md` (sealed principles + solution)

**Canonical product reading order** (from `md/argus/README.md`, Tracks A–C) is catalogued in `03-document-index.md`.

---

## Architecture version

| Item | Value | Source |
|------|-------|--------|
| Runtime data schema | `ArgusData.version: 3` | `lib/argus/types.ts` |
| Target schema (not applied as read path) | Knowledge Model v01 (DDL draft) | `md/argus/knowledge-model-v01.md`, `supabase/argus-v01-schema.sql` |
| Product identity | Evidence Organization System | `md/argus/evidence-organization-vision.md` |
| Architecture constitution | Canonical — accepted constitution | `md/integrations/argus-architecture.md` |

---

## Share addresses (main only)

| What | URL |
|------|-----|
| Status | https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus-review/00-PUBLIC-STATUS.md |
| Pack folder | https://github.com/argometal/MatrixTrade/tree/main/md/argus-review |
| Repo ZIP | https://github.com/argometal/MatrixTrade/archive/refs/heads/main.zip |

---

## Related evidence (outside this pack)

| Path | Note |
|------|------|
| `md/argus/` | Full Argus MD library (on `main`) |
| `md/integrations/argus-*.md` | Constitution, storage, email |
| `md/argusforge/IA-HANDOFF.md` | Apps · ARGUS · ArgusForge runtime truth |
