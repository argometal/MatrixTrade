# Argus — public status summary (2026-08-06)

**Audience:** humans + ChatGPT / IA  
**Purpose:** one page of what was done recently, what is waiting, and where the files are.  
**This is not an architecture redesign.**

---

## One link to open first

https://raw.githubusercontent.com/argometal/MatrixTrade/cursor/chatgpt-argus-review-e1a0/md/argus-review/00-PUBLIC-STATUS.md

**Pack folder (all review files):**  
https://github.com/argometal/MatrixTrade/tree/cursor/chatgpt-argus-review-e1a0/md/argus-review

**ZIP of this branch:**  
https://github.com/argometal/MatrixTrade/archive/refs/heads/cursor/chatgpt-argus-review-e1a0.zip  
→ open folder `md/argus-review/`

**PR:** https://github.com/argometal/MatrixTrade/pull/164

---

## What Argus is (one line)

Argus is the Evidence Organization System inside MatrixTrade (`/argus/*`). Loop: Receive → Organize → Correlate → Retrieve → Deliver.

Production app: https://matrix-trade-theta.vercel.app/argus

---

## What was done in this work stream

### 1) Delete events — code ready (not merged)

| | |
|--|--|
| **Change** | Event detail shows **Delete event** (inline, like projects). Soft-delete with name confirm. After delete, browse drops `selected`. |
| **PR** | https://github.com/argometal/MatrixTrade/pull/161 |
| **Branch** | `cursor/argus-delete-events-e1a0` |
| **Status** | Open draft — **not on `main` yet** |

### 2) Signals / Aliases / topic metrics — IA handoff only (not coded)

| | |
|--|--|
| **Problem reported** | Signals on events do not change topic metrics after linking event ↔ topic. |
| **Finding** | By design today: Patterns count **Tags on evidence only**. Aliases ≠ Signals (same storage field `linkedTags`, different jobs). Linking does not widen topic metric scope. |
| **Deliverable** | Decision handoff for IA (options D1–D5). **No product code until IA confirms.** |
| **PR** | https://github.com/argometal/MatrixTrade/pull/162 |
| **Branch** | `cursor/ia-event-topic-signals-handoff-e1a0` |
| **Status** | Open draft — **not on `main` yet** |

### 3) ChatGPT evidence-only architecture pack — docs ready (not merged)

| | |
|--|--|
| **Ask from IA** | Expose architecture exactly as implemented. No redesign. No recommendations. |
| **Deliverable** | `md/argus-review/` files `01`–`10` + file-list appendices |
| **PR** | https://github.com/argometal/MatrixTrade/pull/164 |
| **Branch** | `cursor/chatgpt-argus-review-e1a0` |
| **Status** | Open — **not on `main` yet** |

**Files in the pack:**

| File | Content |
|------|---------|
| `00-PUBLIC-STATUS.md` | This summary |
| `01-README.md` | Pack purpose, reading order, commit/branch |
| `02-system-map.md` | Directories, modules, files |
| `03-document-index.md` | All Argus MD docs |
| `04-architecture.md` | Layers, ownership, interfaces |
| `05-data-flow.md` | Inputs / storage / outputs |
| `06-decision-flow.md` | Gates, classification, delete/private |
| `07-ontology.md` | Entities, relationships, vocabulary |
| `08-dependencies.md` | Internal + external deps |
| `09-open-items.md` | Known debt / limitations already in repo |
| `10-source-index.md` | Statement → source file traceability |
| `appendix-*.txt` | Complete path lists (172 + 128 files, 73 actions) |

---

## Why ChatGPT / IA could not “analyze the structure”

1. Docs lived on **feature branches / draft PRs**, not on `main`.
2. Screenshots and GitHub UI links are not the same as readable file content for some connectors.
3. Multiple PRs (#161, #162, #164) split the story.

**Fix that unblocks connectors:** merge PR **#164** (and ideally #162) into `main`, then point ChatGPT at:

https://raw.githubusercontent.com/argometal/MatrixTrade/main/md/argus-review/00-PUBLIC-STATUS.md

Until merge, use the **raw branch URL** at the top of this file (verified HTTP 200).

---

## What is waiting (decisions / merges)

| Priority | Action | Owner |
|----------|--------|--------|
| 1 | Merge **#164** so the review pack is on `main` | Human (repo admin) |
| 2 | Give ChatGPT the raw `00-PUBLIC-STATUS.md` + pack folder URL | Human |
| 3 | IA returns Decisions D1–D5 on Signals/Aliases/metrics (#162) | IA / product |
| 4 | After D1–D5: implement metric rollup (or chosen option) | Agent |
| 5 | Merge **#161** Delete event (or after QA) | Human |
| 6 | Deploy pointer / tag when product PRs land | Agent (usual pattern) |

---

## Suggested default (from #162 handoff — not approved yet)

| Decision | Suggested |
|----------|-----------|
| Labels | Keep **Aliases** (Topic) ≠ **Signals** (Event) |
| Metrics after link | Widen topic Patterns + volume to linked-event evidence (bidirectional) |
| Events pill on topic | Add count |
| Aliases → Patterns | Never (keep policy) |

---

## Production note

Latest deploy pointer on `main` at branch creation for this pack referenced tag **`main0806b`** (runbooks delete + board default). Delete-events and metric rollup are **not** in that deploy.

---

## How to paste this into ChatGPT

Copy:

> Read this status page, then the pack under the same folder (`01`–`10`). Do not redesign yet. First confirm you can open the files. Then perform the architecture audit using evidence only.
>
> https://raw.githubusercontent.com/argometal/MatrixTrade/cursor/chatgpt-argus-review-e1a0/md/argus-review/00-PUBLIC-STATUS.md
>
> Folder: https://github.com/argometal/MatrixTrade/tree/cursor/chatgpt-argus-review-e1a0/md/argus-review
