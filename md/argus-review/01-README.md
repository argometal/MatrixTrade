# 01 — README

**Start with the public status summary (humans + ChatGPT):**  
[`00-PUBLIC-STATUS.md`](00-PUBLIC-STATUS.md)

**Raw URL:**  
https://raw.githubusercontent.com/argometal/MatrixTrade/cursor/chatgpt-argus-review-e1a0/md/argus-review/00-PUBLIC-STATUS.md

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
| [`01-README.md`](01-README.md) | Purpose, index, reading order, version, commit, branch |
| [`02-system-map.md`](02-system-map.md) | Directories, modules, major files, purposes, dependencies |
| [`03-document-index.md`](03-document-index.md) | Every architecture document under `md/argus/` and `md/integrations/argus-*.md` |
| [`04-architecture.md`](04-architecture.md) | Current layers, components, responsibilities, ownership, interfaces |
| [`05-data-flow.md`](05-data-flow.md) | Inputs, outputs, persistent storage, memory/state, events |
| [`06-decision-flow.md`](06-decision-flow.md) | Current decision / gate / classification pipeline as coded |
| [`07-ontology.md`](07-ontology.md) | Entities, relationships, terminology (v3 runtime + documented v01 target) |
| [`08-dependencies.md`](08-dependencies.md) | Internal and external dependencies |
| [`09-open-items.md`](09-open-items.md) | TODOs, known limitations, incomplete implementations, identified debt |
| [`10-source-index.md`](10-source-index.md) | Traceability: statements → source paths |
| [`appendix-app-argus-files.txt`](appendix-app-argus-files.txt) | Complete `app/argus` `.ts`/`.tsx` paths (172) |
| [`appendix-lib-argus-files.txt`](appendix-lib-argus-files.txt) | Complete `lib/argus` `.ts`/`.tsx` paths (128) |
| [`appendix-actions-exports.txt`](appendix-actions-exports.txt) | All `export async function` names in `actions.ts` (73) |

---

## Reading order (for ChatGPT)

1. This file (`01-README.md`)
2. `02-system-map.md`
3. `03-document-index.md`
4. `04-architecture.md`
5. `05-data-flow.md`
6. `06-decision-flow.md`
7. `07-ontology.md`
8. `08-dependencies.md`
9. `09-open-items.md`
10. `10-source-index.md`

**Canonical product reading order** (from `md/argus/README.md`, Tracks A–C) is catalogued in `03-document-index.md`. Prefer that order when reading the full `md/argus/` library beyond this pack.

---

## Architecture version

| Item | Value | Source |
|------|-------|--------|
| Runtime data schema | `ArgusData.version: 3` | `lib/argus/types.ts` |
| Target schema (not applied as read path) | Knowledge Model v01 (DDL draft) | `md/argus/knowledge-model-v01.md`, `supabase/argus-v01-schema.sql` |
| Product identity | Evidence Organization System | `md/argus/evidence-organization-vision.md` |
| Architecture constitution | Canonical — accepted constitution | `md/integrations/argus-architecture.md` |

---

## Branch name

| | |
|--|--|
| **IA prompt requested** | `chatgpt/argus-review` |
| **Actual Git branch** | `cursor/chatgpt-argus-review-e1a0` |
| **Reason** | Cloud agent branch naming rule requires `cursor/<name>-e1a0` |
| **Pack path** | `md/argus-review/` (as requested) |

---

## Commit hash

Recorded at pack creation:

```text
19108b925c40063b7e0df37a39fd2f735bdd089e
```

Tip of `cursor/chatgpt-argus-review-e1a0` after pack commits.  
**Pack content commit:** `cab7753658dbcd2ddc03eaf17824b294b63b0204`  
**Base at pack start:** `24d83758e2427b58dc3426196e2b495fd5c6cf7b` (`origin/main` at branch creation).  
**Intermediate evidence notes commit:** `6f114aecc0c389a18401e5806d5dbbd48876ee5b` (`md/argus/architecture-review-evidence-notes.md`).

---

## Share addresses (after push)

| What | URL |
|------|-----|
| Pack folder | `https://github.com/argometal/MatrixTrade/tree/cursor/chatgpt-argus-review-e1a0/md/argus-review` |
| This README (raw) | `https://raw.githubusercontent.com/argometal/MatrixTrade/cursor/chatgpt-argus-review-e1a0/md/argus-review/01-README.md` |
| Branch ZIP | `https://github.com/argometal/MatrixTrade/archive/refs/heads/cursor/chatgpt-argus-review-e1a0.zip` → open `md/argus-review/` |

---

## Related evidence (outside this pack)

| Path | Note |
|------|------|
| `md/argus/` | Full Argus MD library |
| `md/integrations/argus-*.md` | Constitution, storage, email |
| `md/argus/architecture-review-evidence-notes.md` | Extraction scratch notes used while assembling this pack |
