# Snapshot / Control label debt — Prompt 25-07

**Status:** Findings only (no code in this note).  
**Date:** 2026-07-25  
**Related:** [control-panel-ia.md](control-panel-ia.md) · [snapshot-catalog.md](snapshot-catalog.md) · [schema-first-apply.md](schema-first-apply.md) · [runtime-truth.md](runtime-truth.md)

---

## Verdict

There is a **real inconsistency** between internal AI instructions (Mechanics / schema-first text) and the **visible Control interface**.

The AI that asked for “Control → Train AI” / a separate “Schema Contract” menu followed **obsolete snapshot text**, not a missing UI inventada por el chat.

---

## Visible Control surface (truth)

### Primary

| Visible label | Job |
|---------------|-----|
| **MTA Mechanics** | Constitution — copy once for a new AI chat |
| **Stock Files** | One ticker — MTAE request, profile, linked scouts |
| **Apply** | Paste AI Block → Validate → Accept |

### Library

| Visible label | Job |
|---------------|-----|
| **Technical Analysis** | MTAE protocol + TF maps |
| **Playbook** | Method + stats |
| **Scout Desk** | Desk overview + monthly risk room |
| **Learning** | MAF attribution protocol |

### Outside Control (also copyable)

| Visible label | Where |
|---------------|--------|
| **Dashboard snapshot** | Dashboard |
| **`{ID}` forensic** | `/trades/{ID}` when closed only |

### Under Mechanics (detail, not top-level)

| Visible copy row | Reality |
|------------------|---------|
| **MTA Mechanics** | Brief / constitution |
| **Apply schema contract** | Schema-first handshake text (`buildApplySchemaContractText`) |

Internal section id remains `train-ai`. That id must **never** appear as a human-facing path.

---

## Obsolete references still taught to the AI

| Bad path / label | Where it still appears | Problem |
|------------------|------------------------|---------|
| `Control → Train AI` | `lib/matrix-mechanics-brief.ts` (SCHEMA-FIRST) | Not a visible menu |
| `Control → Train AI → Schema contract / sample blocks` | `lib/apply-schema-contract.ts` | Same; samples path mislabeled |
| `Control → Train AI` | `md/matrix/schema-first-apply.md` | Doc debt mirrors code |
| “Import in Inbox” as primary flow | `lib/matrix-mechanics-snapshot.ts` (APPLY GATE) | Write path label is **Apply** |
| Ask for separate “Schema Contract” top-level | Implied by SCHEMA-FIRST wording | Contract is a **copy row under Mechanics**, not a home section |

Already correctly forbidden in Mechanics SNAPSHOT MENU (partial):

- `Control → Closed trade` / Session / Case / Request
- `Control → Update` (write path is **Apply**)

Those FORBIDDEN lines are good — but SCHEMA-FIRST still points at **Train AI**, so the brief contradicts itself.

---

## Depuración required (implementation checklist)

When coding this debt, do all of the following:

### 1. Purge retired / nonexistent menu paths

Remove or rewrite every AI-facing string that says:

- Train AI
- Control → Update (as current path)
- Control → Closed trade (as Control home)
- Session / Case / Request as Control sections

Keep them only in **FORBIDDEN** / **Retired** notes if useful as anti-patterns.

### 2. Apply = only visible import / validate / accept path

- Human-facing write path: **Control → Apply → Validate → Accept**
- Stock File → **Apply AI Result** may open the same Apply step
- Do not teach Inbox Import as the primary label (History may remain secondary)

### 3. Put exact block contracts where the human can copy them

Choose one product rule and enforce it in text + UI:

**Option A (preferred if we keep a separate copy row):**  
SNAPSHOT MENU must list the **exact visible label**:

`Control → MTA Mechanics → Apply schema contract`

**Option B:** Embed the contract (or a sufficient subset) inside the Mechanics paste so the AI never asks for a second Control trip.

Either way: never say “Train AI”.

### 4. Do not ask for a Schema Contract that is not on SNAPSHOT MENU

If the label is not in SNAPSHOT MENU, diagnosis must not request it.  
If the contract stays as a Mechanics child row, SNAPSHOT MENU must name that child row.

### 5. Legacy closed trades — explicit registration path

Mechanics (or Learning / forensic guidance) must define how to record, via **Apply** only:

| Need | Direction (fields / blocks exist; guidance missing) |
|------|------------------------------------------------------|
| Historical absence of Playbook | `trade-update.playbookId` null / explicit “none historically” — do not invent a playbook |
| Historical absence of Scout PLAN | No fake `planId`; do not invent PLAN-xxx |
| Reconstructed thesis | `trade-update.thesis` (labeled reconstructed; never invent prices) |
| Reconstructed planned R | `riskRewardPlanned` / planned risk fields only from human-stated numbers |
| Loss classification | `lossClassification` (e.g. `pending_study` …) |
| Post-stop study | `postStopStudy` + observation / attribution as separate blocks when evidence exists |

Evidence for closed trades lives on **`/trades/{ID}` forensic** — not in Control home.

### 6. Diagnosis may request only SNAPSHOT MENU labels

Hard rule for Needs Attention / readiness / Mechanics:

> Ask the human to copy **only** labels listed in SNAPSHOT MENU (plus Trade forensic when the task is a closed trade).

SNAPSHOT MENU itself must be updated so it matches visible labels, including at least:

- MTA Mechanics
- Apply schema contract (if Option A)
- Stock Files / `{TICKER}` slices
- Library → Technical Analysis · Playbook · Scout Desk · Learning
- Dashboard snapshot
- Trades / `{ID}` trade / `{ID}` forensic
- Apply (write path — not a snapshot paste, but the only mutate gate)

---

## Naming mismatch (secondary)

| Source | Label |
|--------|-------|
| Control UI primary button | **MTA Mechanics** |
| Some docs (`control-panel-ia.md`, catalog) | **Matrix Mechanics** |

Align docs to the **visible** UI string (`MTA Mechanics`) or rename UI once — do not leave both as “current”.

---

## Root-cause files (for the future fix PR)

| File | Issue |
|------|--------|
| `lib/matrix-mechanics-brief.ts` | SCHEMA-FIRST → `Control → Train AI`; SNAPSHOT MENU incomplete vs UI |
| `lib/matrix-mechanics-snapshot.ts` | APPLY GATE still says Import in Inbox; SNAPSHOT MENU soft |
| `lib/apply-schema-contract.ts` | Footer path → Train AI |
| `md/matrix/schema-first-apply.md` | Same obsolete path |
| `app/components/control-panel/MatrixControlPanel.tsx` | Internal id `train-ai` OK; visible labels already mostly correct |
| `lib/load-control-panel-data.ts` | Serves schema contract under Mechanics — good; text content still outdated |

---

## Out of scope for this note

- No code changes in this findings commit beyond publishing this MD (+ index pointers).
- Live Apply payloads for PLAN-004 / duplicates remain separate work.
- Dashboard UI for scout metric counters remains separate.

---

## Acceptance when fixed

1. Pasting Mechanics into a fresh AI chat never mentions Train AI / Update / Closed trade as current paths.  
2. SCHEMA-FIRST points only at a label that exists in SNAPSHOT MENU (or embeds the contract).  
3. AI diagnosis for a closed legacy trade asks for forensic / Dashboard / Mechanics labels only — never a Control forensic picker.  
4. Human can complete schema-first Apply using only visible Control + Dashboard + Trade window labels.
