# Needs Attention — AI-assisted resolution workflow

**Status:** Shipped foundation (2026-07-22) — operability layer over existing Matrix architecture.  
**Rule:** No parallel AI subsystem. Control → Apply remains the only write gate. Needs Attention stays a **derived** queue.

**Related:** [runtime-truth.md](runtime-truth.md) · [snapshot-catalog.md](snapshot-catalog.md) · [control-panel-ia.md](control-panel-ia.md) · [mta-002-operability-plan.md](mta-002-operability-plan.md)

---

## Operating flow

```text
Dashboard snapshot (global, once per session)
  → Needs Attention Task Snapshot (one item)
  → AI readiness diagnosis (READY | NEEDS_MECHANICS | NEEDS_LIBRARY | NEEDS_DATA | AMBIGUOUS | UNSUPPORTED)
  → if needed: Matrix Mechanics
  → if needed: Library Index → one Library section
  → factual questions only (never invent prices/dates/outcomes)
  → ONE Apply-ready JSON
  → Control → Apply → Validate → Accept → verify
  → recalculate Needs Attention
  → item disappears only when source condition is false
```

---

## Global vs task snapshot

| Snapshot | Visible label | Role |
|----------|---------------|------|
| **Dashboard snapshot** | `Dashboard snapshot` | Monthly budget, experiment, trades overview, pending reviews count — **not** a full AttentionItem list |
| **Needs Attention task** | `Copy for AI` on each row | One work unit: linked entities, evidence, missing fields, allowed blocks, completion condition |

Task snapshots may include a small `globalContextSummary` and **must** tell the AI that full context is under **Dashboard snapshot**. Do not embed the full Dashboard paste inside every task.

---

## Non-invention contract

AI must never invent: prices, dates, fills, sizes, targets reached, invalidation, MFE/MAE, exit reasons, Playbook assignments, outcomes, entity IDs, or classifications-as-fact.

Distinguish: verified fact · deterministic calculation · AI interpretation · missing · ambiguous · unsupported.

No Apply JSON until READY (protocol understood + evidence sufficient + zero unverified assumptions).

---

## Phase 1 audit — task matrix

| taskType | sourceCondition | linkedEntities | currentGoTarget | existingApplyBlock | completionCondition | taskSnapshotSupport | status |
|----------|-----------------|----------------|-----------------|--------------------|----------------------|---------------------|--------|
| `assign_playbook` | Trade `!playbookId` and status ≠ pending | Trade, Plan?, Stock File? | `/trades/{id}` | `trade-update` (playbookId) | Trade has playbookId | Yes | **SUPPORTED** |
| `closed_missing_review` | Closed + !reviewedAt | Trade | `/trades/{id}/review` | `trade-review` | reviewedAt set | Yes | **SUPPORTED** |
| `incomplete_closed_aggregate` | Any incomplete closed gaps | Trades list | `/trades` | Per-trade blocks | All gaps cleared | Summary only | **SUPPORTED** (multi) |
| `apply_inbox` | pendingInbox.length > 0 | Inbox items | `/inbox` | Existing proposal types via Control | No unapplied proposals | Yes (operational) | **SUPPORTED** |
| `evaluate_expired_plan` | Plan failed/expired/skipped + !outcome.recordedAt | Plan, Stock File | `/planning?plan=` | **None today** — outcome via Planning UI `recordPlanOutcomeAction` only | outcome.recordedAt (then LO/OBS/MAF as derived tasks) | Yes (diagnostic) | **UNSUPPORTED** (Apply gap — see below) |
| `plan_ready_enter` | Plan status = ready | Plan | Scout enter href | `trade-proposal` | Trade opened / plan entered | Yes | **SUPPORTED** |
| `plan_window_closing` | Watching + validUntil ≤ 48h | Plan | `/planning?plan=` | `decision-update` | Window extended, entered, or terminal | Yes | **SUPPORTED** |
| `closed_missing_observation` | Closed trade with no ObservationRecord | Trade, LO? | `/trades/{id}` | `observation-update` (ensure OBS) | Observation exists with required evidence fields as needed | Yes | **SUPPORTED** (new attention row) |
| `missing_attribution` | LO `ready_for_attribution` + !mafExperimentId | LO, Trade/Plan, OBS? | `/trades/{id}` or Scout | `attribution` | mafExperimentId / LO attributed | Yes | **SUPPORTED** (new attention row) |
| `playbook_samples` | TESTING playbook with 1–2 closed samples | Playbook | `/playbook` | None (need more trades) | ≥3 closed samples | Diagnostic | **UNSUPPORTED** (Apply cannot create samples) |
| `monthly_loss_limit` | Cap breached | Monthly risk | `/stats` | None | New month / room restored | Diagnostic | **UNSUPPORTED** |
| `monthly_loss_warning` | Room ≤ 25% allowance | Monthly risk | `/stats` | None | Room restored | Diagnostic | **UNSUPPORTED** |

### Code map (audit)

| Concern | Path |
|---------|------|
| Attention items | `lib/dashboard-attention.ts`, `lib/plan-attention.ts`, `lib/learning-attention.ts` |
| Incomplete closed | `lib/incomplete-closed-trades.ts` |
| Dashboard load | `lib/dashboard-data.ts` |
| Dashboard UI | `app/components/dashboard/PreviewDashboard.tsx` |
| Dashboard snapshot | `dashboardSnapshotItems()` → `buildAiContextPackage({ scope: "dashboard" })` |
| Task snapshots | `lib/needs-attention-ai.ts` |
| Library Index | `lib/library-index.ts` |
| Apply open | `openPanel({ step: "apply" })` |

---

## AI readiness states

| Status | Meaning |
|--------|---------|
| READY | Protocol + evidence enough → one existing Apply block |
| NEEDS_MECHANICS | Request visible block **Matrix Mechanics** |
| NEEDS_LIBRARY | Request **Library Index**, then one section |
| NEEDS_DATA | Ask precise factual questions — do not invent |
| AMBIGUOUS | Explain alternatives; human chooses |
| UNSUPPORTED | Describe missing capability — no JSON workaround |

First response must be a **MATRIX TASK DIAGNOSIS** (see Mechanics / task snapshot instructions). Only then READY → one JSON.

---

## Library Index

Copyable lightweight index of Control Library labels (not full protocols):

- Technical Analysis — MTAE (no capital)
- Playbook — methods / families / checklists
- Scout Desk — decision / R / capital gate
- Learning — Observation / LO / MAF

AI requests Index first, then one exact section.

---

## Completion

After Apply: validate → persist → verify → re-read entities → recalculate Needs Attention.  
No manual “Complete” on derived tasks.  
Sequential dependencies: one block at a time; recalculate between steps.

---

## UNSUPPORTED capability gaps

### `evaluate_expired_plan` — missing Apply block

| Field | Value |
|-------|-------|
| **Entity** | `TradePlan` (`plan.outcome`) |
| **Missing mutation** | Persist `outcome.recordedAt` + reason / strategyStillValid / lesson |
| **Today** | Planning UI → `recordPlanOutcomeAction` → `recordPlanOutcome` |
| **Required validation** | Status ∈ failed\|expired\|skipped; required strategyStillValid; never invent market facts |
| **Required persistence** | Plan store upsert + LO/OBS side-effects (already in `recordPlanOutcome`) |
| **Required verification** | Re-read plan; `outcome.recordedAt` present; attention item gone |
| **Completion condition** | `!planNeedsStrategyReview(plan)` |
| **Smallest future block** | `plan-outcome` (Apply) wrapping existing `recordPlanOutcome` — do not force-fit `decision-update` |

### Other UNSUPPORTED

| Task | Why |
|------|-----|
| `playbook_samples` | Needs more closed trades — Apply cannot invent samples |
| `monthly_loss_limit` / `monthly_loss_warning` | Calendar / risk room — not an Apply mutation |

---

## Acceptance (checklist)

1. Dashboard snapshot purpose unchanged  
2. Every current item audited in matrix above  
3. Supported items: Copy for AI  
4. Task snapshot references Dashboard snapshot without duplicating it  
5. Readiness diagnosis required before JSON  
6. Non-invention rule in every task paste  
7. Existing Apply block types only  
8. Unsupported types marked  
9. Apply via Control drawer  
10. Recalculation after Apply (existing revalidate paths)  
11. Item disappears only when source condition false  
12. Tests cover builders / IDs / allowed blocks  

Code: `lib/needs-attention-ai.ts` · UI: Dashboard Needs Attention rows.
