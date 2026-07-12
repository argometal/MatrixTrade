# Risk-Weighted Layered Entry — architectural proposal

**Status:** Playbook experiment (2026-07-12)  
**Layer:** Playbook — `risk-weighted-layered-entry`  
**Scope:** Execution only — NOT stock-specific, NOT engine rule  
**Related:** [execution-experiments-layered-entry.md](execution-experiments-layered-entry.md) (capital-split layered entry)

> **Experimento de Playbook — no regla del motor.**  
> Esta hipótesis vive solo en el Playbook Lab. No modifica Stock File, Tesis, invalidación estructural, decisión Scout ni Trade review.

---

## Executive summary

**Risk-Weighted Layered Entry** allocates a fixed **1R risk budget** across multiple entry layers by **expectancy weight**, not equal capital split. A **single common stop** (structural invalidation) governs all layers. Position sizing per layer is computed so that, if stopped with all layers filled, total loss equals exactly **1R**. If only Layer 1 fills, realized risk is only **0.30R**.

This differs from the existing `layered-entry` experiment, which splits **100% capital** across limits to improve **average entry price** while keeping total dollar risk constant. Risk-weighted entry optimizes **where risk is consumed** — more R at higher-expectancy locations — not average price.

---

## Hypothesis (execution only)

| Concept | Value |
|---------|-------|
| Total risk budget | **1R** fixed per trade |
| Layer 1 (operational support) | **0.30R** risk allocation |
| Layer 2 (structural support) | **0.70R** risk allocation |
| Stop | **One common stop** — structural invalidation (e.g. 228–230) |
| Sizing | Engine (or manual worksheet) computes shares per layer from stop distance |
| Partial fill | Only Layer 1 filled → trade risks **0.30R** only |
| Objective | Allocate more risk to higher-expectancy locations — **not** improve average price |

**Must NOT modify:** Stock File, Thesis, Structural invalidation, Scout decision, Trade review.

---

## Architectural questions

### 1. Playbook-only vs Scout Plans supporting layered execution?

**Recommendation: Playbook-only for this experiment phase.**

| Approach | Pros | Cons |
|----------|------|------|
| **Playbook-only** (recommended now) | Zero Scout contract changes; no apply-pipeline risk; documents hypothesis + sizing math for human/AI reference; matches `structural-pullback-entry` and `multi-timeframe-hierarchy` pattern | Practitioners map `riskAllocation` manually when filling `layeredEntry{}` in Apply blocks; no automated share calculator in engine |
| **Scout Plan extension** | First-class `riskAllocation` per limit; engine computes shares deterministically; partial-fill risk tracked automatically | Touches `layered-entry-types.ts`, apply pipeline, plan UI; conflates two layered-entry paradigms (capital-split vs risk-weight) |

**Decision:** Ship as Playbook experiment. Scout Plans continue using existing `layeredEntry.limits[].allocationPercent` (capital %). During this experiment, practitioners document risk weights in playbook notes and size shares manually per the sizing formula below. A future engine extension (`riskAllocationR` on limits) is optional and gated on 20–30 trade sample.

**Pairing:** Use with `structural-pullback-entry` (zone selection) or `asymmetric-support-entry` (strategy). Execution variable = risk-weighted layers vs equal capital split.

---

### 2. Can Scout contract remain unchanged? Minimum extension if not?

**Yes — Scout contract remains unchanged.**

The hard contract (`plannedEntry`, `stopPrice`, `targetPrice`) answers: *"Is this setup quantifiable and executable?"* Risk-weighted layering is **how** capital is deployed after GO — execution detail, not scout validity.

| Field | Change needed? | Rationale |
|-------|----------------|-----------|
| `plannedEntry` | No | Remains the primary/reference entry for R:R and scout contract. Use Layer 1 price or weighted reference — document in playbook checklist. |
| `stopPrice` | No | Common structural stop — same for all layers. |
| `targetPrice` | No | Unchanged — thesis target. |
| `layeredEntry` (optional) | No schema change | Existing `limits[].allocationPercent` can hold risk weights **as convention** during experiment (30/70) with playbook note that `%` means **R allocation**, not capital %. |

**Minimum future extension (not in this deliverable):**

```text
layeredEntry.limits[].riskAllocationR?: number  // sum = 1.0
layeredEntry.commonStop?: number                // explicit if differs from stopPrice (should not)
layeredEntry.riskBudgetR?: number               // default 1
```

---

### 3. `executionMethod` vs `executionPlan` vs `layeredEntry` vs other abstraction

| Abstraction | Role today | Fit for risk-weighted |
|-------------|------------|----------------------|
| **`executionMethod`** | Enum on Plan: `single_limit` \| `layered_limits` \| `market` | Sufficient — use `layered_limits` |
| **`layeredEntry`** | Plan artifact: limits[], status, fill metrics | **Best fit** — already on `decision-update` and `layered-entry-update`. Extend playbook docs to clarify risk-weight semantics; defer schema extension. |
| **`executionPlan`** | Not a current type | Would duplicate `layeredEntry`; avoid new abstraction |
| **Playbook `riskWeightedLayeredEntryExperiment`** | New playbook schema block | **Correct home** for hypothesis, sizing math, outcomes — mirrors `structuralPullbackExperiment` |

**Pros of reusing `layeredEntry`:** Apply pipeline, UI panels (`LayeredEntryPanel`, `PlanLevelsBoard`), inbox types already work.  
**Cons:** `allocationPercent` name implies capital %; risk-weight experiment needs playbook-level disambiguation.  
**Mitigation:** Playbook experiment documents that during `risk-weighted-layered-entry`, allocation fields represent **R weight**, not dollar split.

---

### 4. Mathematics — deterministic position sizing

**Given:**

- `R$` = dollar value of 1R (e.g. $100 fixed experimental control)
- `r_i` = risk allocation for layer *i* (sum = 1.0)
- `E_i` = entry price for layer *i*
- `S` = common stop price
- Long setup: `d_i = E_i - S` (stop distance per share)

**Shares per layer:**

```text
shares_i = (r_i × R$) / d_i
```

**Verification — full build stopped:**

```text
Loss = Σ shares_i × d_i = Σ (r_i × R$) = R$ × Σ r_i = R$ × 1.0 = 1R ✓
```

**Verification — Layer 1 only (0.30R), stopped:**

```text
Loss = shares_1 × d_1 = (0.30 × R$) / d_1 × d_1 = 0.30R ✓
```

**Example (illustrative — not stock advice):**

| Layer | Entry | r_i | d_i | shares (R$=$100) | $ at risk if stopped alone |
|-------|-------|-----|-----|------------------|----------------------------|
| L1 operational | 260 | 0.30 | 31 | 0.30×100/31 ≈ 0.97 | $30 |
| L2 structural | 240 | 0.70 | 11 | 0.70×100/11 ≈ 6.36 | $70 |

Common stop S = 229. If both fill and stop: $30 + $70 = $100 = 1R.

**Key property:** Deeper layers (closer to stop) receive **more shares per R** because stop distance is smaller — but **more R budget** is allocated there because expectancy is higher. The two effects are intentional.

---

### 5. Partially filled scouts — Scout state vs Trade state?

| State | Owner | Partial-fill semantics |
|-------|-------|------------------------|
| **Scout / Plan** | `layeredEntry.status`: `partial` \| `full` \| `missed` | Tracks which limits filled; `fillPercent` = capital/R weight filled. Scout remains active until all limits resolve or no-chase triggers. |
| **Trade** | Execution record | Created when **first limit fills** (or on full GO with market). `shares` = sum of filled layer shares. `stop` = common stop. Realized risk at stop = sum of (filled_shares_i × d_i). |

**First-class partial fills:**

1. **Scout** records `filledThroughIndex` via `layered-entry-update` — unchanged pipeline.
2. **Trade** reflects **actual** filled shares, not planned full size.
3. **Risk accounting:** Monthly risk consumes **actual loss at stop**, not planned 1R — until L2 fills, only 0.30R is at risk.
4. **Playbook statistics:** Track `PartialFillRiskR` (e.g. 0.30 vs 1.0) as experiment metric.

**Scout terminal states (unchanged):** `filled` (any execution), `missed` (no chase), `expired`, `cancelled`.  
**Trade lifecycle (unchanged):** open → closed. Partial scout fill does not require new Trade status.

---

### 6. Backward compatibility & Matrix v2 feel

| Concern | Mitigation |
|---------|------------|
| Existing `layered-entry` playbook | Unchanged — capital-split entry optimization remains separate experiment |
| Scout contract | Untouched |
| Apply pipeline | No new inbox types; optional `layeredEntry` on `decision-update` as today |
| `allocationPercent` semantics | Default unchanged; risk-weight playbook documents alternate reading |
| UI | New `PlaybookRiskWeightedLayeredEntryPanel` in Playbook Lab — same pattern as structural pullback |
| Mechanics brief | Revision bump; playbook listed as experiment, not engine rule |
| Matrix v2 five engines | Belongs to **Execution Engine** experiment slot — one variable isolated |

**Matrix v2 alignment:** Strategy (Playbook + Stock File + Scout GO) constant. Execution variable = risk-weighted vs equal-split layering. Thesis, structural invalidation, stop, target unchanged.

---

## Three outcomes (experiment observables)

| Outcome | Label (ES) | Max risk if stopped | Learning question |
|---------|------------|---------------------|-------------------|
| **A** | Rebote solo L1 — solo capa operativa llena | **0.30R** | ¿La capa operativa captura suficiente asimetría sin exponer 1R? |
| **B** | Construcción completa L1+L2 | **1.00R** | ¿La asignación 30/70 mejora expectativa vs 50/50 o capital-split? |
| **C** | Ruptura estructural — stop común | **0.30R–1.00R** (según capas llenas) | ¿El stop único invalida correctamente sin sobre-riesgo en parciales? |

---

## Experiment metrics

- `RiskAllocationEfficiency` — realized R vs planned R per outcome  
- `PartialFillPercent` — trades stopping at L1 only  
- `FullBuildPercent` — both layers filled  
- `AverageRiskConsumed` — mean R at risk when stopped  
- `ExpectancyByOutcome` — A vs B vs C  
- `MissedTradePercent` — no chase if L2 limit missed (if applicable)  
- Standard execution metrics: `AverageRR`, `TradeOutcome`, `Expectancy`

**Sample size:** 20–30 trades before promote/retire decision.

---

## What this does NOT do

- Does not change Entry Solver order (Target → Stop → Max Entry)  
- Does not merge zone selection with execution  
- Does not add independent stops per layer  
- Does not justify chasing if limits miss  
- Does not modify Stock File or thesis invalidation  

---

## Code artifacts (this deliverable)

| Artifact | Location |
|----------|----------|
| Design doc | `md/matrix/risk-weighted-layered-entry.md` (this file) |
| Playbook | `risk-weighted-layered-entry` in `data/playbooks.json` |
| Types | `PlaybookRiskWeightedLayeredEntryExperiment` in `lib/playbook-types.ts` |
| UI | `PlaybookRiskWeightedLayeredEntryPanel` in `PreviewPlaybook.tsx` |
| Mechanics | `MATRIX_MECHANICS_REVISION` bump in `lib/matrix-mechanics-snapshot.ts` |

**Engine changes:** None in this phase — playbook schema + documentation only.

---

## Related

- [execution-experiments-layered-entry.md](execution-experiments-layered-entry.md) — capital-split layered entry  
- [structural-pullback-entry](structural-pullback-entry) playbook — zone selection before entry  
- [scout-execution-model.md](scout-execution-model.md) — Scout vs Trade vs partial fill
