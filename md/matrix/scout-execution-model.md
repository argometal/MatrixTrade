# Scout & execution model

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
A-Iteration Anchors are constraints, not complete implementation specifications.
Everything not constrained by an Anchor remains available for AI reasoning, design, simplification, implementation, and improvement.
The AI has an objective obligation to improve the system within those remaining degrees of freedom.
Do not treat absence of explicit human instruction as a prohibition on improvement.
If proceeding requires changing an Anchor or inventing unresolved semantics necessary to satisfy it, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
UI may simplify, hide, reorganize, or derive presentation from canonical data when this does not change meaning.
When genuinely blocked, isolate the smallest unresolved question.
Verify the result.

## A-Iteration Anchors

`AIT-A — Snapshot`: Snapshot must be one. It automatically represents the current context, including the selected Case and relevant Insights when applicable.

`AIT-T0 — Simplify T0`: Simplifica T0: debe permitir corregir cualquier T0. Mantenerlo sencillo.

`AIT-CASE-1`: No stop → mismo caso.

`AIT-CASE-2`: Stop → caso cerrado.

`AIT-CASE-3`: Nueva oportunidad posterior → nuevo caso.

Only `AIT-A`, `AIT-T0`, `AIT-CASE-1`, `AIT-CASE-2`, and `AIT-CASE-3` are defined here as Scout A-Iteration Anchors.

Research/completion A-Iteration Anchors for MXT 033 live in [`mxt-033-handoff-70-points.md`](mxt-033-handoff-70-points.md).


**Status:** Canonical design (2026-07-10).  
**Purpose:** One clear picture of what a **Scout** is vs **Trade** vs **Probe** — today and V2.

> **2026-07-22 — R / risk layered participation:** Scout `layeredEntry` supports `stopModel`, `sizingMode`, `authorizedRiskAmount`, per-layer R, and fill-state projections. Human/AI propose levels; Matrix calculates. Prefer `risk_percent` so allocation % is risk share. See [execution-experiments-layered-entry.md](execution-experiments-layered-entry.md) · [risk-weighted-layered-entry.md](risk-weighted-layered-entry.md).
>
> **2026-07-11 — Entry optimization:** For improving average entry on an **already-approved** thesis, prefer **Layered Entry** (execution experiment) over Probe. Probe remains in the model for scaling-after-confirmation; layered limits isolate one execution variable with a hard no-chase rule.

---

## The question you asked

> “I need a better view of the trade we try to design on scout.”

**Scout is not a trade.** Scout is a **decision episode** about whether and how to engage a suspect (ticker) under a Playbook.

---

## Three objects (V2)

```text
┌─────────────────────────────────────────────────────────────┐
│  STOCK PROFILE  (suspect dossier — slow, versioned)         │
│  TSLA · zones · invalidation · evidence-backed confidence   │
└───────────────────────────┬─────────────────────────────────┘
                            │ informs
┌───────────────────────────▼─────────────────────────────────┐
│  SCOUT  (decision episode — fast, one window)               │
│  “Do we act on TSLA this week in 340–355 with 3R?”          │
│  Decision: wait | probe | go | no                           │
│  planningRisk ≠ executionRisk                               │
└───────────────────────────┬─────────────────────────────────┘
                            │ may spawn
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
     (nothing)            PROBE              FULL TRADE
     Missed /            info position      H00x execution
     Expired              0.05–0.10R         main size
```

---

## Scout lifecycle (target)

| Stage | Meaning |
|-------|---------|
| `open` | Watching for trigger |
| `decided_wait` | Explicit wait — conditions documented |
| `decided_probe` | Probe authorized |
| `decided_go` | Full entry authorized |
| `decided_no` | Pass / reject |
| `probe_active` | Small position on |
| `converted` | Probe → full |
| `executed` | Trade linked |
| `missed` | Trigger hit but we did not act — **learning gold** |
| `expired` | Window ended |
| `cancelled` | User cancelled |

Every terminal state feeds **Learning Engine**.

---

## Execution states (target)

```text
WAIT ──(Decision: probe)──► PROBE ──(confirm)──► FULL
  │                              │
  │                              └── stop → -0.10R (bounded)
  └──(Decision: no)──► CLOSED SCOUT (missed or rejected)
```

**Probe rules:**

- Predefined max risk (e.g. 0.10R), not “add because convinced.”
- Must have `expires` and `trigger`.
- Convert requires explicit **confirmation level** — not automatic scale-in.

---

## What “Scout” is in code TODAY (honest)

| Concept | Code reality |
|---------|--------------|
| Scout | `TradePlan` in `data/plans.json` (`PLAN-xxx`) |
| Decision | `ScoutDecision` on plan — `decision`, `decisionHistory`, `scoutLifecycle` |
| Verdict | `wait` \| `probe` \| `go` \| `no` — stored; UI falls back to thesis.status when absent |
| Probe | `probe` object — authorize / active / converted / cancelled / stopped |
| Probe → trade | **Built** — convert active probe creates trade + `linkedTradeId` |
| Trade evaluation | **Built** — `TradeEvaluation` after close (ADR-0002) |
| Missed opportunity | **Does not exist** as outcome |
| Link to trade | `linkedTradeId` optional on plan |
| AI decision path | `decision-update` inbox block → Apply on plan |

Pilot: `PLAN-001` (TSLA) in `data/plans.json` with sample `wait` decision.

---

## Field mapping: your ideas → owner

| Your field | V2 owner | In code today? |
|------------|----------|----------------|
| `expectedProbability` | Decision (Scout) | No |
| `expectedValue` | Decision | No |
| `decisionConfidence` | Decision | No |
| `opportunityQuality` | Decision | No |
| `planningRisk` | Decision | Partial (stop, RR on plan) |
| `executionRisk` | Decision | No |
| `probeAllowed` | Decision | No |
| `probeAllocation` / `probeStop` / `probeTrigger` | Probe object | No |
| `fullEntryTrigger` / `confirmationLevel` | Decision + Scout | No |
| `missedTradeTracking` | Learning | No |
| `thesisConfidence` | Stock Profile | No |
| `thesisDrift` | Profile + Evidence history | No (only `version++`) |
| Bayesian prior/posterior | Decision chain | No |

---

## Scout minimal schema (V2 target — light)

Keep first implementation **small**:

```text
Scout
 ├ id                 SCOUT-001
 ├ stockProfileId
 ├ playbookId
 ├ status             // lifecycle above
 ├ window             // validFrom / validUntil
 ├ levels             // entry, stop, target, support
 ├ decision           // nested Decision object (not free text)
 ├ probe?             // nested Probe if authorized
 ├ linkedTradeId?
 └ learningOutcome?
```

Do **not** put 20 top-level fields on Scout in pass 1 — nest under `decision` and `probe`.

---

## AI loop (unchanged fleet)

```text
Copy scouting context → paste in external AI → import scout-assessment | file-update
→ Inbox Apply → append to profile notes / patch hypothesis
```

V2 extends inbox types to **`decision-update`** and **`evidence-add`** — same fleet, new block types.

**Canonical scout decision:** `decision-update` on `planId`. `scout-assessment` remains for Stock File note append.

---

## Related

- [v2-engine-architecture.md](v2-engine-architecture.md)
- [stock-profile-design.md](stock-profile-design.md)
- [runtime-truth.md](runtime-truth.md)
