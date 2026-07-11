# Scout & execution model

**Status:** Canonical design (2026-07-10).  
**Purpose:** One clear picture of what a **Scout** is vs **Trade** vs **Probe** — today and V2.

> **2026-07-11 — Entry optimization:** For improving average entry on an **already-approved** thesis, prefer **Layered Entry** (execution experiment) over Probe. Probe remains in the model for scaling-after-confirmation; layered limits isolate one execution variable with a hard no-chase rule. See [execution-experiments-layered-entry.md](execution-experiments-layered-entry.md).

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
| Probe | `probe` object — authorize / active / converted / cancelled / stopped (no trade creation) |
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
