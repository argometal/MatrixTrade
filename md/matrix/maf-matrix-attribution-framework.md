# Matrix Attribution Framework (MAF)

**Status:** Canonical (2026-07-21)  
**ADR:** [adr-0004-maf.md](adr-0004-maf.md)  
**Code:** `lib/maf-types.ts`, `lib/maf-evidence.ts`, `lib/maf-validate.ts`, `lib/maf-store.ts`, `lib/maf-apply.ts`, `data/maf-experiments.json`

---

## Objective

Transform raw outcomes into **component attribution**.

| Not the goal | The goal |
|--------------|----------|
| Better journals | Which pipeline component changes expectancy |
| Win / Loss as the lesson | Evidence → Attribution → System improvement |
| AI inventing prices | Deterministic evidence + AI hypotheses |

**Financial result ≠ quality of the process.**

---

## Pipeline position

```text
Playbook
  → Stock File
  → Scout Plan
  → Trade
  → Attribution Engine (MAF)
```

MTAE feeds Stock File (technical observation).  
Scout owns capital.  
MAF owns post-experiment learning attribution.

---

## Unit of analysis

Minimum evidence unit is **not** a trade alone. It is the complete experiment:

```text
Scout
  → Trade (or Missed Fill)
  → Trade Close
  → Post-Trade Observation
  → Attribution
```

Stored as `MafExperiment` (id `MAF-{TICKER}-NNN` or linked by `tradeId` / `planId`).

---

## Component structure (uniform)

Every component follows:

1. **Observable Evidence** (deterministic where possible)
2. **Inference Rules** (AI + human)
3. **Attribution** (classification + confidence)
4. **Suggested Improvement** (Playbook / Scout / process)

### Initial components

| Id | Focus |
|----|--------|
| `thesis_quality` | Did the thesis hold / fail for structural reasons? |
| `zone_quality` | Was the battle zone correctly selected? |
| `entry_quality` | Timing and location of entry vs plan / better available |
| `stop_quality` | Strategy stop too tight / too wide / appropriate |
| `execution_quality` | Fill, slippage, discipline vs plan |
| `trade_management_quality` | Management after entry (exits, adjustments) |
| `timing_quality` | Horizon / early-late relative to thesis |
| `capital_allocation_quality` | Size / risk room consumption vs opportunity |

Additional components may be added later without redesigning the architecture.

---

## Roles (non-negotiable)

| Owner | Responsible for |
|-------|-----------------|
| **Deterministic code** | Prices, dates, R, event ordering, MFE/MAE when supplied as numbers, risk, observation windows, evidence assembly |
| **AI** | Structure conversations → fields; detect missing info; attribution hypotheses; explain reasoning; suggest improvements; ask minimal clarifications |
| **Human** | Approve strategic interpretation; correct ambiguous classifications; modify Playbooks when needed |

AI is **not** the source of truth.

---

## Version 1 — measurable evidence

V1 prioritizes fields that can be derived or explicitly supplied (never invented):

| Evidence field | Typical source |
|----------------|----------------|
| `fillStatus` | Trade present / plan skipped|failed / layered miss |
| `plannedEntry` / `executedEntry` | Plan + Trade |
| `plannedStop` / `executedStop` | Plan + Trade |
| `plannedTarget` / `executedTarget` | Plan + Trade |
| `targetReachedAfterStop` | `PostStopStudy` |
| `thesisInvalidated` | `PostStopStudy` / evaluation |
| `timeUntilTargetHours` | Opened → close when exitReason=target (or supplied) |
| `timeUntilInvalidationHours` | Supplied or observation |
| `mfe` / `mae` | Observation supplement (required if claimed) |
| `rAchieved` | `computeRMultiple(trade)` |
| `exitReason` | Trade close |
| `betterEntryAvailable` | Observation (boolean + optional price) |

This is enough to begin component attribution.

---

## Attribution record shape

```json
{
  "component": "entry_quality",
  "classification": "weak",
  "tag": "premature_entry",
  "aiInterpretationConfidence": 72,
  "reasoning": "Fill occurred above planned zone; MFE after stop suggests thesis later worked.",
  "suggestedImprovement": "Wait for zone retest; do not chase confirmation."
}
```

`aiInterpretationConfidence` describes how confidently the AI believes **current evidence** supports the classification. It is **not** a statistical probability. Calibrate later as the corpus grows.

---

## AI Block — `attribution`

```json
{
  "type": "attribution",
  "proposal": {
    "tradeId": "H001",
    "planId": "PLAN-001",
    "components": [
      {
        "component": "stop_quality",
        "classification": "weak",
        "tag": "stop_too_tight",
        "aiInterpretationConfidence": 80,
        "reasoning": "…",
        "suggestedImprovement": "…"
      }
    ],
    "summary": "Primary drag: stop tightness; thesis later validated in post-stop study.",
    "primaryDragComponent": "stop_quality",
    "observation": {
      "mfe": 12.5,
      "mae": 3.2,
      "betterEntryAvailable": true,
      "betterEntryPrice": 178.4
    }
  }
}
```

Apply stores/updates `data/maf-experiments.json`. Deterministic evidence is rebuilt from Trade + Plan + PostStopStudy + TradeEvaluation; `observation` only merges explicitly supplied numeric/boolean fields.

---

## Relationship to existing entities

| Entity | Role vs MAF |
|--------|-------------|
| `Trade` | Financial truth (P/L, fill) |
| `trade-review` | Human journal scores / mistakes — **not** MAF |
| `TradeEvaluation` | Observation window / coarse outcomes (ADR-0002) |
| `PostStopStudy` | Shadow path after stop — feeds MAF evidence |
| **MAF** | Component attribution + improvement suggestions |

---

## Long-term questions MAF should answer

After many completed experiments:

- Which component reduces expectancy the most?
- Which Playbook produces positive expectancy?
- Are stops systematically too tight?
- Is Entry Solver degrading expectancy?
- Are Battle Zones correctly selected?
- Is Capital Allocation responsible for poor performance?

Matrix should optimize the **decision pipeline**, not merely report historical trading performance.

---

## Out of scope (V1)

- Aggregated expectancy dashboards / Coach UI
- Automatic Playbook mutation
- Scout-only missed-opportunity object without a plan/trade link
- Supabase persistence for MAF rows
- Confidence calibration curves
