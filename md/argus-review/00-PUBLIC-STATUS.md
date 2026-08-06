# Argus — public status summary

**Canonical location:** `main` only  
**Path:** `md/argus-review/00-PUBLIC-STATUS.md`  
**Date:** 2026-08-06

**Audience:** humans + ChatGPT / IA  

---

## Open this (on main)

| | URL |
|--|-----|
| **This status** | https://github.com/argometal/MatrixTrade/blob/main/md/argus-review/00-PUBLIC-STATUS.md |
| **Raw (plain text)** | https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus-review/00-PUBLIC-STATUS.md |
| **Full pack folder** | https://github.com/argometal/MatrixTrade/tree/main/md/argus-review |
| **Repo ZIP (default branch)** | https://github.com/argometal/MatrixTrade/archive/refs/heads/main.zip → open `md/argus-review/` |

---

## Deprecated handoff methods (do not use)

| Method | Status |
|--------|--------|
| Feature-branch raw URLs (`…/cursor/…/md/…`) | **Deprecated** — connectors often cannot read them |
| Draft PR links / screenshots of links | **Deprecated** |
| “Share branch name with IA” without merge to `main` | **Deprecated** |
| Pasting partial docs in chat instead of `main` paths | **Deprecated** for architecture review |

**Rule going forward:** Argus architecture review material for external AI lives on **`main`** under `md/argus-review/`. If it is not on `main`, it is not the handoff.

---

## What Argus is (one line)

Argus is the Evidence Organization System inside MatrixTrade (`/argus/*`).  
Loop: Receive → Organize → Correlate → Retrieve → Deliver.  
App: https://matrix-trade-theta.vercel.app/argus

---

## What was done (this work stream)

### 1) Delete events — code (open PR, not required for review pack)

| | |
|--|--|
| Change | Event detail: **Delete event** (inline). Soft-delete + name confirm. |
| PR | https://github.com/argometal/MatrixTrade/pull/161 |
| Status | Draft — product change; separate from this docs pack |

### 2) Signals / Aliases / topic metrics — waiting on IA decisions

| | |
|--|--|
| Problem | Event Signals do not roll into topic metrics after link |
| Finding | Patterns = Tags on evidence only; Aliases ≠ Signals; link ≠ shared metric scope |
| Decisions | D1–D5 in pack / related docs — **no metric code until confirmed** |
| Related PR | https://github.com/argometal/MatrixTrade/pull/162 (draft docs; superseded for *access* by this `main` pack) |

### 3) Evidence-only architecture pack — **on main** (this folder)

| File | Content |
|------|---------|
| `00-PUBLIC-STATUS.md` | This summary |
| `01-README.md` | Pack purpose + reading order |
| `02-system-map.md` | Directories / modules / files |
| `03-document-index.md` | Argus MD library index |
| `04-architecture.md` | Layers, ownership, interfaces |
| `05-data-flow.md` | Inputs / storage / outputs |
| `06-decision-flow.md` | Gates / classification / delete |
| `07-ontology.md` | Entities / relationships / vocabulary |
| `08-dependencies.md` | Internal + external deps |
| `09-open-items.md` | Known debt already in repo |
| `10-source-index.md` | Traceability |
| `11-behavioral-evaluation-review.md` | **Behavioral metrics inventory + refinement recommendations** |
| `12-evidence-engine-principles-solution.md` | **Sealed principles + concrete solution (Evidence Engine)** |
| `13-evidence-engine-implementation.md` | **Implementation notes (phases A–D)** |
| `appendix-*.txt` | Complete file / action lists |

---

## What ChatGPT should do next

1. Open **main** URLs above (not branch URLs).  
2. Read `00` then `01`–`10` under `md/argus-review/`.  
3. For behavioral metrics refinement, read **`11-behavioral-evaluation-review.md`**.  
4. Return Decisions D1–D5 for Signals↔topic metrics (or override).  
5. Do **not** treat feature-branch PRs as the source of truth for access.

---

## Suggested default (not approved until IA confirms)

| Decision | Suggested |
|----------|-----------|
| Labels | Keep Aliases (Topic) ≠ Signals (Event) |
| After event↔topic link | Widen topic Patterns + volume to linked-event evidence (bidirectional) |
| Events pill on topic | Add |
| Aliases → Patterns | Never |

---

## Paste block for a new ChatGPT thread

```text
Argus architecture review. Use ONLY files on GitHub main:

https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus-review/00-PUBLIC-STATUS.md

Folder:
https://github.com/argometal/MatrixTrade/tree/main/md/argus-review

Read 00 then 01–10. Evidence only. No redesign until after the audit.
Branch/PR-only handoffs are deprecated.
```
