# Matrix Trading Analytics — Gap Analysis 001

**Status:** Library proposal — **no implementation**  
**Date:** 2026-08-15  
**Audience:** Agents and humans formalizing the MTA Analytics layer  
**Rule:** Repository truth wins. This document maps a target architecture onto what already exists. It does not invent fields, dashboards, or metrics that are not in code.

| Related | Role |
|---------|------|
| [maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md) | MAF V1 — component attribution |
| [adr-0004-maf.md](adr-0004-maf.md) | ADR — deferred aggregated expectancy dashboards |
| [metrics-analysis-planteamiento-handoff.md](metrics-analysis-planteamiento-handoff.md) | Three ledgers: Trade · Scout · Pipeline |
| [plan-outcome-learning-001.md](plan-outcome-learning-001.md) | plan-outcome → LO / OBS sync |
| [scout-learning-circuit-audit-handoff.md](scout-learning-circuit-audit-handoff.md) | Scout Learning circuit + P0/P1 |
| [runtime-truth.md](runtime-truth.md) | What ships vs EVALUATION / NEXT |
| [../insights/pipeline-performance-30-2c.md](../insights/pipeline-performance-30-2c.md) | Pipeline Performance tab |

---

## 1. Problem statement (agreed)

Execution and object capture in MTA are relatively advanced.

The deeper gap is not “better prediction of one ticker.” It is the missing **Analytics motor** that turns stored evidence into **statistical knowledge about the process**.

**Edge of MTA (target):**

> Learn which components of our process produce expectancy and which destroy it.

That is different from a trade journal (TradeZella-class: Setup A WR / avg R).  
MTA should eventually say things like: *Family B works, but expectancy falls when we wait for confirmation after geometry is already valid; deep entries have higher potential R but lower capture; the component that most destroys expectancy is Entry/Decision — not ticker selection.*

---

## 2. Target architecture (four pieces)

```text
                 MATRIX TRADING ANALYTICS
                         EDGE
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    OPPORTUNITY        EXECUTION      ATTRIBUTION
          │               │               │
    Did we find it?   Did we take it?  Why did we
                                      gain/lose it?
          │               │               │
      Scout unit       Capture R          MAF
      Hit / expire     Capture %          Components
      Invalidated      Missed             Playbooks
          │               │               │
          └───────────────┬───────────────┘
                          │
                    SAMPLE QUALITY
                          │
                    N / coverage / confidence
```

| Engine | Question | Statistical unit |
|--------|----------|------------------|
| **Opportunity** | Did we find good opportunities? | Scout / plan-outcome (not Trade) |
| **Execution** | Did we capture them? | Scout → decision → Trade |
| **Attribution (MAF)** | Where did we gain/lose edge? | Full experiment → components |
| **Sample Quality** | Is the claim mature? | N, coverage, missing outcomes, confidence |

**Central metric (conceptual — not a shipped field):**

```text
Expectancy available  →  Expectancy captured
Expectancy lost       →  Attribution (why)
```

Working name in discussion: **Expectancy Capture**.  
Do **not** treat Win Rate, account P/L, or raw R as the Analytics north star.

**Segmentation** (Playbook, Family, ticker, timeframe, entry type, confirmation, regime, R band, decision type) only after sufficient N — Sample Quality gates claims.

---

## 3. How existing objects map (do not rebuild)

```text
Playbook
    ↓
Stock File
    ↓
ScoutPlan
    ↓
plan-outcome ──────→ Opportunity Engine (primary corpus)
    ↓
Trade ─────────────→ Execution Engine (realized path)
    ↓
LO / OBS / MAF ────→ Attribution Engine
```

This matches sealed MAF intent ([maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md)) and the three-ledger handoff ([metrics-analysis-planteamiento-handoff.md](metrics-analysis-planteamiento-handoff.md)).

**Do not reconstruct MTA.** Formalize Analytics on top of what we store.

---

## 4. Inventory — what exists today

### 4.1 Opportunity (Scout unit)

| Capability | Status | Where |
|------------|--------|--------|
| Plan outcome kinds / statuses | **Stored** | `lib/plan-outcome-types.ts` — `entry_not_triggered`, `theoretical_*`, `invalidated_before_entry`, `inconclusive`; Apply kinds `unexecuted_plan_loss`, `duplicate_creation` |
| Counterfactual R / dollars | **Derived + stored** | `lib/plan-outcome-derive.ts` (UPL: realizedR=0, counterfactualR=-1 when applicable) |
| LO kinds for Scout | **Stored** | `lib/learning-outcome-types.ts` — `missed_opportunity`, `expired`, `cancelled`, `unexecuted_plan_loss`, … |
| Scout LO aggregates | **Computed (read-time)** | `lib/learning-scout-aggregates.ts` — evaluated count, UPL count, sum counterfactual R, triggered-without-trade, thesis fail rate (from MAF) |
| Plan-outcome aggregates | **Computed (read-time)** | `lib/learning-plan-aggregates.ts` — triggered/untriggered, theoretical W/L/BE, `theoreticalPlanR` vs `realizedTradeR`, execution omission |
| Scout Learning queue UI | **Shipped (P0)** | Planning — needs outcome / Retry Sync |
| Dedicated Opportunity / Scout Learning dashboard | **Missing** | Aggregates not first-class on `/stats` (P1 deferred) |

### 4.2 Execution (Scout → decision → Trade)

| Capability | Status | Where |
|------------|--------|--------|
| Scout decision | **Stored** | `lib/scout-decision-types.ts` — verdict, confidence, confirmationCost, thesis/opportunity quality |
| Plan ↔ Trade link | **Stored** | `plan.linkedTradeId`, trade `planId` |
| Layered fill % / miss | **Stored / evidence** | layered entry + `maf-evidence.ts` |
| Non-execution reasons | **Stored** | plan-outcome |
| Triggered without trade | **Computed** | plan + scout aggregates; Pipeline |
| Named **capture rate** / **available R vs captured R** | **Missing** | No product metric pair |
| Funnel go/probe → staged → filled → closed as one engine | **Partial** | Pieces exist; not one Analytics product |

### 4.3 Attribution (MAF)

| Capability | Status | Where |
|------------|--------|--------|
| MAF components V1 | **Shipped schema** | `lib/maf-types.ts` — thesis, zone, entry, stop, execution, trade_management, timing, capital_allocation |
| Evidence assembly | **Computed** | `lib/maf-evidence.ts` |
| Apply `attribution` block | **Shipped** | Control → Apply |
| Rule hints | **Shipped** | `lib/maf-inference.ts` (not accepted attribution) |
| Pipeline component drag | **UI** | `/stats` → Pipeline Performance |
| Aggregated expectancy by component / Playbook | **Deferred** | ADR-0004 + runtime-truth EVALUATION — wait for corpus |
| Durable MAF store (Supabase) | **Missing** | JSON `data/maf-experiments.json` (seed often empty) |
| User chain stages as components | **Gap** | Confirmation / Decision / Stock selection / Exit are **not** MAF component ids (confirmation lives on `ScoutDecision.confirmationCost`) |

### 4.4 Sample Quality

| Capability | Status | Where |
|------------|--------|--------|
| Trade N / playbook closedCount | **Computed** | Statistics / review |
| Scout evaluated counts | **Computed** | scout aggregates |
| Missing LO / OBS / orphans | **Diagnostics** | `lib/learning-outcome-diagnostics.ts`, `lib/learning-attention.ts` |
| Hard gates | **Partial** | e.g. `MIN_PLAYBOOK_SAMPLES = 3`, Kelly `minimumCalibrationSample: 30` |
| Unified Sample Quality panel (coverage %, completed outcomes, confidence band) | **Missing** | No single engine / UI |

### 4.5 Surfaces that mix or omit ledgers

| Surface | Behavior |
|---------|----------|
| `/stats` → **Statistics** | Closed **Trade** lens only (survivorship if read as “system” performance) |
| `/stats` → **Pipeline** | Correctly separates realized vs counterfactual; closest shipped Analytics UI |
| `/trades` | Includes never-executed plan rows (partial anti-survivorship) |
| Desk `/planning` | Ex-ante potential R — not outcome Analytics |

---

## 5. Gap matrix (target vs repo)

| Target claim | Can compute today? | Blocker |
|--------------|--------------------|---------|
| Thesis produced a valid opportunity | **Partial** | Needs completed `plan-outcome` coverage for terminal Scouts |
| Entry reached / how far after | **Partial** | Fields exist on outcome; not all Scouts closed |
| Potential R / theoretical result | **Partial** | Stored on outcomes; UPL path dominates Apply UX |
| Invalidated / expired / escaped | **Partial** | Statuses + LO kinds exist; population incomplete |
| Valid opportunities → executed → missed | **Partial** | Aggregates exist; no named Opportunity/Execution product |
| Opportunity capture % | **No (as product)** | Need defined denominators + complete outcomes |
| Available R vs Captured R | **No (as product)** | Need formal definition + consistent counterfactual vs realized pairing |
| Expectancy Capture waterfall (100→34) | **No** | Conceptual; needs Attribution maturity + Sample Quality |
| Component that destroys expectancy | **Thin** | Pipeline drag only where MAF rows exist; corpus often empty |
| Family B / confirmation / deep entry claims | **Unsafe at low N** | Sample Quality not productized; segmentation deferred |
| “N=4 — insufficient evidence” | **Partial** | Counts exist; no first-class confidence/maturity object on every claim |

---

## 6. Expectancy Capture — conceptual mapping only

Illustrative waterfall (not literal shipped numbers):

```text
Available opportunity expectancy   100
  Stock selection                    …
  Thesis                             …
  Entry geometry                     …
  Confirmation                       …
  Decision                           …
  Execution                          …
  Exit                               …
REALIZED                              …
```

| Stage (discussion) | Closest repo artifact today |
|--------------------|-----------------------------|
| Stock selection | Weak — no MAF component; ticker filters only |
| Thesis | MAF `thesis_quality` + Stock File |
| Playbook / Family | Playbook id on plan/trade; Family B evidence hints |
| Entry geometry | MAF `entry_quality` / `zone_quality`; layered entry |
| Confirmation | `ScoutDecision.confirmationCost` — **not** MAF component |
| Decision | `ScoutDecision.verdict` — **not** MAF component |
| Execution | MAF `execution_quality` + fill/miss |
| Exit | MAF `trade_management_quality` / `timing_quality` |

**Implication:** Attribution Engine today is **MAF V1 components**, not the full discussion chain. Bridging confirmation/decision into Analytics may mean (a) extend MAF components later, or (b) keep them on Opportunity/Execution engines and only attribute via MAF where evidence exists. **Do not invent attribution without evidence.**

---

## 7. Sample Quality — minimum claim envelope

Before any Analytics claim like “Family B has +X R expectancy,” the product must be able to expose something equivalent to:

| Field | Purpose |
|-------|---------|
| **N** | Sample size of the stratum |
| **Observed period** | From / to |
| **Coverage** | % of eligible Scouts/Trades included |
| **Completed outcomes** | With `plan-outcome` / LO as required |
| **Missing outcomes** | Still open or never recorded |
| **Confidence / maturity** | Explicit “insufficient” vs “usable” |

Repo already has pieces (counts, diagnostics, MIN samples). Missing: **one Sample Quality contract** attached to every Analytics output.

Corpus note (runtime): measuring **Scouts**, not only Trades, enlarges N — but only after outcomes are closed and sync’d. Incomplete `plan-outcome` is the main operational undercount.

---

## 8. Explicit deferred / wait-for-corpus (repo truth)

Do not treat these as forgotten — they are **named deferrals**:

- ADR-0004: aggregated expectancy dashboards; ScoutEvaluation-only objects; confidence calibration; MAF Supabase  
- `runtime-truth.md`: MAF expectancy aggregation by component/Playbook **only if enough attributed rows**  
- Metrics handoff: Scout Learning UI P1; Coach / dimensional export P3 with corpus  
- Pipeline doc: MAF JSON OK for tab; Mistakes may become filter later  

This gap analysis **aligns** with those deferrals; it names the motor they were waiting for.

---

## 9. What can be demonstrated first (still no implementation mandate)

Order that respects “three engines + sample quality,” not fifty metrics:

1. **Prove denominators** — population of Scouts with/without completed plan-outcome (Sample Quality / coverage).  
2. **Surface Opportunity aggregates already in code** — `computeLearningPlanAggregates` / scout aggregates on a Scout Learning / Analytics surface (P1-shaped).  
3. **Define Execution Capture metrics** from existing fields (triggered-without-trade, theoreticalPlanR vs realizedTradeR) — product names + formulas, then UI.  
4. **Attribution** only where MAF rows exist; keep “insufficient corpus” visible.  
5. **Expectancy Capture waterfall** only after 1–4 are honest.

No implementation is authorized by this document alone.

---

## 10. Verdict

| Question | Answer |
|----------|--------|
| Do we rebuild MTA? | **No** |
| Is the Analytics motor missing? | **Yes — as a formal product layer** |
| Do objects exist? | **Yes — plan-outcome, LO, OBS, MAF, Pipeline, aggregates** |
| Are they one engine? | **No — pieces; Pipeline is the closest UI** |
| Biggest bias risk today? | Reading **Trade Statistics** as system expectancy while Scout outcomes incomplete |
| Differentiator vs TradeZella? | Process expectancy + Scout counterfactual + MAF attribution — **not** setup WR alone |

**Matrix Trading Analytics = Opportunity + Execution + Attribution + Sample Quality.**  
Formalize that layer; then compute. Do not start with fifty metrics.

---

## Document control

| Field | Value |
|-------|--------|
| Id | `MTA-ANALYTICS-GAP-001` |
| Path | `md/matrix/matrix-trading-analytics-gap-001.md` |
| Implementation | **None** |
| Next | Explicit Analytics design / metric definitions brief before code |
