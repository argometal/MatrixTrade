# MXT — Experimental Learning Foundations (studied)

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
If conflict or ambiguity exists, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
Verify the result.


**Status:** Library foundations — studied analogues we can apply or already embody  
**Date:** 2026-09-04  
**Scope:** Market-method references for the Diagnosis → Improvement → Verification loop  
**Mode:** Documentation only — **not** an implementation authorization · **does not reopen** sealed Core

**Sealed pillars remain primary** (NASA RIDM/PRA · FOQA · NTSB Case Learning · process safety).  
This note adds **complementary trading-method** foundations for how MXT should test Improvements without inventing a second architecture.

**Case equation authority:** [mxt-case-family-equations-016a.md](mxt-case-family-equations-016a.md)

---

## Verdict

We do **not** need to invent the experimental method from scratch.  
MXT already combines mature ideas; the missing piece for 026 is mainly **linking future Cases to an Improvement under test** — not new KPIs or a parallel learning engine.

Emulation stack for 026:

```text
Pardo        → experimental cycle (forward proof)
Tharp        → measure in R / expectancy (existing units)
López de Prado → anti-self-deception (no in-sample crowning)
MXT T0/MAF/A–D → attribution + Case behavior
```

Do **not** add SQN or exotic metrics yet. Small samples → **insufficient evidence**.

---

## 1. Robert Pardo — Walk-Forward Analysis

**Studied idea:** formulate → test → optimize → test forward → evaluate → refine.  
A change is not “good” because it explains the past better; it must show **subsequent** behavior.

**MXT mapping (principle, not full quantitative WFA clone):**

```text
Diagnosis → Improvement Candidate → new Cases → Reality → Verification
```

| Already in MXT | Role |
|----------------|------|
| T0 | Prospective freeze (decision-time evidence) |
| Reality / OBS | Out-of-sample observation |
| Comparison / Diagnosis | Evaluation |
| `suggestedImprovement` (MAF) | Hypothesis |
| Future Cases | Forward sample |

**Apply:** freeze the Improvement as a hypothesis; only **later** Cases can support or reject it.

---

## 2. Van Tharp — R distributions / Expectancy

**Studied idea:** a system is a **distribution of results in R**; expectancy is the mean of that distribution — not merely win rate.

**MXT mapping:**

| Already in MXT | Role |
|----------------|------|
| Realized R / counterfactual R | Same risk unit |
| Statistics / LO ledgers | Sample accounting |
| A/B/C/D | Case *behavior* — **not** expectancy itself |

**Apply:** OLE (or any technique) is **not** validated by A/B/C/D alone.  
Observe jointly:

```text
Case migration + realized R + expectancy + Profit
```

Keep current R. No new unit. With few Cases, report **insufficient evidence** rather than a fake “pass.”

Tharp also stresses that expectancy needs a **reasonable sample** before it means much — aligns with MXT’s Insufficient Evidence stance.

---

## 3. Bailey / López de Prado — backtest overfitting / self-deception

**Studied idea:** trying many historical variants and crowning the best **in-sample** produces overfitting; spectacular in-sample configs often fail out-of-sample.

**MXT mapping:**

> PLAN-009 may **suggest** Optimized Layered Entry, but PLAN-009 **cannot demonstrate** OLE.

OLE must be frozen as a hypothesis and faced with **posterior** information.

**Apply:** no technique backfill from reasoning text; no crowning Improvement from the Case that generated the Diagnosis.

---

## 4. Outcome bias (Baron & Hershey lineage)

**Studied idea:** people rate decision quality higher when outcomes are good — experimentally replicated.

**MXT mapping (already built correctly):**

```text
T0 → Reality → Decision Quality → Outcome
```

Profit is the **economic** judge. Profit must **not** retrospectively rewrite Decision Quality.

016a encodes this: outcome polarity feeds A vs C for **entry** families; it is **isolated** from no-entry Over-Optimization.

---

## Infrastructure already present (reuse — do not rebuild)

| Piece | Role |
|-------|------|
| **T0** | Prospective freeze |
| **Reality** | Observed out-of-sample path |
| **Comparison / Diagnosis** | Evaluation |
| **MAF** | Responsible component |
| **`suggestedImprovement`** | Hypothesis (empty = empty; never manufacture) |
| **A/B/C/D + Good Filter / Over-Opt** | Case behavior ([016a](mxt-case-family-equations-016a.md)) |
| **R / P&L** | Economic result |
| **Insights / Snapshot** | Aggregation + AI-readable export |
| **Playbook + Technique** | Where it occurred (Technique wiring may still be pending) |
| **Ticker / Universe** | Scopes (Stock → many Cases → each Case may have its own Playbook) |

---

## Missing relation (026 — conceptual)

What future Cases were **testing which Improvement**?

```text
PLAN-009
→ OVER_OPTIMIZATION
→ MAF.entry_quality
→ suggestedImprovement = OLE   (only if genuinely recorded — not invented)
→ Accepted for testing
→ future Case X / Y / Z
→ A/B/C/D + R
→ evidence accumulates
→ Improvement supported / unsupported / insufficient evidence
```

That is a **walk-forward experimental loop** on top of existing infrastructure.

**Correction of language:** Profit does **not** “accept” the Improvement directly.  
**Accumulated evidence** accepts or rejects it; Profit / R / expectancy are a **fundamental part** of that evidence — not a retrospective rewrite of DQ.

---

## Non-goals (for this foundation)

- No second learning architecture
- No SQN / sophisticated score packs yet
- No declaring technique success from a single Case
- No store migration or fabricated history
- No reopen of sealed NASA/FOQA/NTSB/process-safety Core

---

## References (studied)

1. Pardo — walk-forward / strategy evaluation & optimization (Wiley; DOI [10.1002/9781119196969.ch1](https://doi.org/10.1002/9781119196969.ch1))
2. Van Tharp Institute — R / expectancy concepts ([Tharp Think](https://vantharpinstitute.com/tharp-think-trading-concepts/); sample-size caution on mistakes)
3. Bailey / López de Prado — statistical overfitting & backtest performance ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/B9781785480089500204))
4. Outcome bias replications — e.g. Baron & Hershey lineage ([PMC12372742](https://pmc.ncbi.nlm.nih.gov/articles/PMC12372742/))

---

## Related

- [mxt-case-family-equations-016a.md](mxt-case-family-equations-016a.md) — A/B/C/D principles  
- [mxt-core-learning-adaptation-doctrine.md](mxt-core-learning-adaptation-doctrine.md) — sealed Core (primary pillars)  
- [mxt-edge-learning-mission-governance.md](mxt-edge-learning-mission-governance.md) — sealed mission  
- [maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md) — component attribution  
- [../research/trading-journal-product-research.md](../research/trading-journal-product-research.md) — product-journal research (different scope)
