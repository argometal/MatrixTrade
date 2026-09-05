# MXT — Case Family Equations (016a + 028 Case D)

**Status:** Library runtime principles (documentation of shipped engine)  
**Authority:** `lib/case-diagnosis.ts` · presentation labels `lib/insights-case-labels.ts`  
**Scope:** What A / B / C / D / ? mean, Case D subtypes D1–D6, Good Filter vs Over-Optimization, realized vs counterfactual R  
**Mode:** Documentation — not an implementation authorization and **not** a reopen of sealed Core

---

## Purpose

Insights Case accounting and Playbook Learning rest on deterministic **016a** equations, extended by **028** Case D subtypes for plan/execution divergence with symmetric counterfactual R.  
This document puts those principles in the Library so agents and humans do not reinvent or dilute them.

Canonical loop they serve:

```text
T0 → Reality → Decision Quality / Execution Quality → Outcome
→ Case family (A|B|C|D|?) → (if B) no-entry diagnosis
→ (if D) Case D subtype D1–D6 when plan-path CF R is evaluable
```

Hard rules (engine + product):

> **Outcome alone never drives OVER_OPTIMIZATION or Decision Quality.**  
> Profit / R may judge economic results; they must not rewrite the epistemic state of the decision.

> **Realized R and counterfactual / planned R are separate ledgers.**  
> Counterfactual R must **never** be added to actual portfolio P/L.  
> Missed upside = **+R CF**; avoided planned loss = **−R CF** (symmetric).

> **Case D does not determine MAF attribution.**  
> Component diagnosis (`thesis_quality`, `entry_quality`, `execution_quality`, …) remains an independent layer.

---

## Case families (entry vs no-entry)

| Id | Label | Principle |
|----|-------|-----------|
| **A** | A · Good Entry / Profit | Valid participation + supported decision + respected execution + **favorable** outcome facts. A is **not** “profit alone.” |
| **B** | B · No Entry | No participation (`wait` / `no`) when Case D subtypes do not apply. B is **not** automatically a missed entry — see no-entry diagnosis. |
| **C** | C · Good Entry / Loss | Valid participation + supported decision + respected execution + **adverse** outcome. Loss ≠ bad decision. |
| **D** | D · Execution / Plan Divergence | Actual execution differs materially from an evaluable planned path (no fill or deficient execution). See D1–D6. |
| **?** | ? · Insufficient Evidence | Not enough frozen evidence (typically missing T0 and/or unclear DQ/EQ/outcome polarity). |

**Code equations (A/C + legacy entry D):**

| Family | `equationId` | Rough inputs |
|--------|--------------|--------------|
| A | `EQ-016A-ENT-A` | T0 present · DQ supported/weak · EQ respected/n.a. · outcome favorable |
| C | `EQ-016A-ENT-C` | Same as A but outcome adverse |
| Entry ? | `EQ-016A-ENT-INDETERMINATE` | Missing T0 or incomplete DQ/EQ/polarity |
| Probe | `EQ-016A-PROBE-INDETERMINATE` | Probe — no sealed family equation yet |

---

## Case D subtypes (028)

| Id | Label | Actual | Planned / CF |
|----|-------|--------|----------------|
| **D1** | No Entry / Would Profit | No fill · realized R = 0 | CF R > 0 |
| **D2** | No Entry / Would Loss | No fill · realized R = 0 | CF R < 0 |
| **D3** | No Entry / Indeterminate | No fill · realized R = 0 | CF R unknown / Reality unclear |
| **D4** | Deficient Execution / Would Profit | Material plan divergence | CF R > 0 |
| **D5** | Deficient Execution / Would Loss | Material plan divergence | CF R < 0 |
| **D6** | Deficient Execution / Indeterminate | Material plan divergence | CF R unknown |

| Subtype | `equationId` |
|---------|--------------|
| D1 | `EQ-028-D1-NO-ENTRY-WOULD-PROFIT` |
| D2 | `EQ-028-D2-NO-ENTRY-WOULD-LOSS` |
| D3 | `EQ-028-D3-NO-ENTRY-INDETERMINATE` |
| D4 | `EQ-028-D4-DEFICIENT-EXEC-WOULD-PROFIT` |
| D5 | `EQ-028-D5-DEFICIENT-EXEC-WOULD-LOSS` |
| D6 | `EQ-028-D6-DEFICIENT-EXEC-INDETERMINATE` |

**Assignment notes:**

- No-entry + T0 + Reality Good Filter (`condition_not_met` / `invalidated`) stays **B / GOOD_FILTER** even if CF R is present.
- No-entry + T0 + Reality `condition_met` + known CF polarity → **D1** or **D2** (not bare Over-Opt).
- No-entry + T0 + Reality `condition_met` + unknown CF → **B / OVER_OPTIMIZATION**.
- No-entry + unclear Reality → **D3** when CF unknown.
- Entry with DQ `not_supported` or EQ `violated` → **D4 / D5 / D6** by CF polarity (replaces bare `EQ-016A-ENT-D` in the engine).

---

## No-entry diagnosis (only under family B)

| Class | Label | Principle |
|-------|-------|-----------|
| **GOOD_FILTER** | Good Filter | Frozen T0 conditions later **not met** or **invalidated** in Reality — filter consistent with Reality. |
| **OVER_OPTIMIZATION** | Possible Over-Optimization | Frozen T0 participation conditions later **met** in Reality, but CF planned R is not reliably evaluable. Later price/PnL alone does **not** prove a missed entry. |
| **INDETERMINATE** | Insufficient Evidence | Cannot distinguish (typically **missing T0**). |

**Code equations:**

| Class | `equationId` | Gate |
|-------|--------------|------|
| Missing T0 | `EQ-016A-NE-MISSING-T0` | No usable T0 freeze → always INDETERMINATE for B |
| Good Filter | `EQ-016A-NE-GOOD-FILTER` | Reality `condition_not_met` or `invalidated` |
| Over-Opt | `EQ-016A-NE-OVER-OPT` | Reality `condition_met` and CF R unknown |
| NE ? | `EQ-016A-NE-INDETERMINATE` | Unhandled residual |

Outcome facts are **recorded** on the diagnosis evidence trail but marked **ignored for no-entry Over-Opt class**.

**T0 integrity:** Plan-specific freeze binding only — never inherit another Plan’s T0 via shared `stockThesisId`.

---

## What A/B/C/D do **not** prove

- **A/B/C/D alone do not validate a technique or Improvement** (e.g. Optimized Layered Entry).  
  They classify Case *behavior*. Economic validation needs **Case migration + R / expectancy / P&L** over **prospective** Cases linked to the hypothesis.
- **High B rate alone ≠ conservatism success.** Without T0, many B rows collapse to Insufficient Evidence.
- **Over-Optimization is a diagnosis, not an accepted Improvement.**  
  Example: PLAN-009 may **suggest** OLE; PLAN-009 cannot **demonstrate** OLE.
- **D2 does not prove good `execution_quality`.** Avoided −1R CF is accounting, not MAF.

---

## Aggregates that reuse these equations

| Surface | Role |
|---------|------|
| Insights → Pipeline · Case accounting | Counts A/B/C/D/? on filtered Case spine |
| No-entry filter quality | Good Filter / Over-Opt / Insufficient over B denominator |
| Playbook Learning | Same families × Playbook (`aggregatePlaybookDiagnosis`) |
| Insights Snapshot | Same builders — no parallel metrics |
| False Virtuous Loop / Condition | `EQ-016A-FVL-1` · `EQ-016A-CONDITION-1` (population signals — not Case family) |
| Pipeline Realized vs CF R | Separate sums — CF never in portfolio P/L |

---

## Related Library docs

- Sealed Core: [mxt-edge-learning-mission-governance.md](mxt-edge-learning-mission-governance.md) · [mxt-core-learning-adaptation-doctrine.md](mxt-core-learning-adaptation-doctrine.md)
- Experimental foundations (Pardo / Tharp / López de Prado): [mxt-experimental-learning-foundations.md](mxt-experimental-learning-foundations.md)
- MAF: [maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md)
- Insights Pipeline architecture: [../insights/pipeline-performance-30-2c.md](../insights/pipeline-performance-30-2c.md)
