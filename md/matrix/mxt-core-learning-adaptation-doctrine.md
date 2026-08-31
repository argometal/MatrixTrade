# MXT — Core Learning & Adaptation Doctrine

**Status:** SEALED CORE GOVERNANCE  
**Sealed:** Prompt #9H (product owner + reasoning system agreement)  
**Scope:** What class of system MXT is, and which external methodological pillars guide its evolution  
**Mode:** Documentation only — not an implementation authorization

**Companion (what MXT must achieve):**  
[mxt-edge-learning-mission-governance.md](mxt-edge-learning-mission-governance.md) — Edge Learning Mission & Governance · `SEALED PRODUCT GOVERNANCE`

---

## Authority

This document seals **Core product identity** and **methodological lineage**.

| Layer | Document | Question |
|-------|----------|----------|
| **Mission** | Edge Learning Mission & Governance | What must MXT achieve? |
| **Doctrine (this)** | Core Learning & Adaptation Doctrine | What kind of system is MXT, and from what disciplines does it learn to evolve? |

Together they form the sealed **MXT Core**. Architecture, features, and future Cross-Case work must remain compatible with both unless the product owner explicitly reopens this governance.

**Not authorized by this seal:**

- Autonomous trading
- Uncontrolled self-modification of Playbook / rules
- Literal cloning of NASA, FOQA, NTSB, or process-safety products
- Implementing Edge Retention as a KPI in this documentation task
- Skipping real-case validation to jump to automated optimization

---

## Sealed identity

> **MXT is not fundamentally a trading application.**  
> **MXT is a learning and adaptation engine operating in a market decision environment.**  
>  
> Its purpose is to discover where decision edge exists, where it is lost, and whether controlled adaptations improve future results.

This is a **CORE PRODUCT IDENTITY** statement.

Charts, journals, screeners, trade statistics, and execution records may **serve** MXT.  
They do **not** define MXT.

Trading is the **current domain** in which the engine operates — not the deepest definition of the product.

---

## Deeper problem

How can a decision system operating under uncertainty:

- preserve what was known at decision time,
- compare decisions with subsequent reality,
- learn from repeated cases,
- identify where expected value is created or destroyed,
- propose controlled adaptations,
- and determine whether those adaptations actually improved future results?

Therefore MXT must **not** be evaluated merely by conventional trading-software standards.

---

## Core mission loop

MXT must progressively become capable of:

```text
OBSERVE
→ DECIDE UNDER UNCERTAINTY
→ PRESERVE DECISION-TIME KNOWLEDGE
→ OBSERVE REALITY
→ MEASURE
→ COMPARE CASES
→ DETECT RECURRING RELATIONSHIPS
→ FORM LEARNING HYPOTHESES
→ PROPOSE CONTROLLED ADAPTATION
→ TEST
→ MEASURE AGAIN
```

Applied to the current market domain:

```text
THESIS
→ PLAN
→ DECISION
→ EXECUTION / NO EXECUTION
→ MARKET REALITY
→ OUTCOME
→ CROSS-CASE LEARNING
→ ADAPTATION HYPOTHESIS
→ CONTROLLED CHANGE
→ NEW CASES
→ DID WE IMPROVE?
```

This doctrine **complements** and must remain **consistent** with Edge Learning Mission & Governance.

---

## Core external pillars

MXT will learn from and evolve principles used by mature systems **outside** conventional trading software.

These are **design and learning analogues** — not products to copy literally.

### Pillar 1 — NASA · Risk-Informed Decision Making / PRA

**What MXT emulates:**

- explicit decision-making under uncertainty
- separation of available evidence from future knowledge
- evaluation of alternatives
- explicit treatment of uncertainty and risk
- preservation of assumptions and decision basis
- comparison of expected versus observed reality

**MXT translation:**

T0 exists because future knowledge must not contaminate evaluation of past decisions. A decision must be judged first according to what could reasonably have been known when it was made. Outcome information may subsequently evaluate the process, but must not rewrite T0.

**Core lesson:** PRESERVE THE EPISTEMIC STATE OF THE DECISION.

---

### Pillar 2 — Aviation FOQA · Flight Operational Quality Assurance

**Central analogue for future Cross-Case Learning.**

FOQA-style systems learn from repeated normal operations and deviations rather than waiting exclusively for catastrophic failures.

MXT must similarly learn from **all** meaningful Cases:

- trades entered
- trades rejected
- WAIT
- PASS
- missed opportunities
- avoided losses
- thesis invalidations
- correct theses without execution
- favorable outcomes
- unfavorable outcomes

Absence of a trade does **not** mean absence of learning evidence.

The future system should search across multiple Cases for repeated relationships that are difficult for a human to identify reliably case-by-case.

**Core lesson:** LEARN FROM THE POPULATION OF OPERATIONS, NOT ONLY FAILURES.

---

### Pillar 3 — NTSB · Case investigation and system learning

MXT emulates the disciplined progression:

```text
CASE
→ EVIDENCE
→ PROBLEM / CONTRIBUTING FACTOR
→ RECOMMENDATION
→ ACTION
→ FOLLOW-UP
```

But MXT must avoid becoming purely retrospective.

- A loss is not automatically evidence of process failure.
- A profitable result is not automatically evidence of process quality.
- Root cause must not be invented merely because an undesirable outcome occurred.
- Repeated evidence is required before structural attribution.

**Core lesson:** TURN CASE EVIDENCE INTO TRACEABLE IMPROVEMENT WITHOUT HINDSIGHT STORYTELLING.

---

### Pillar 4 — Process safety / barrier management

Safety systems study not only accidents but also:

- near misses
- successful barriers
- failed barriers
- degraded controls
- recurring precursor conditions

MXT must develop the equivalent concept.

Examples:

| Pattern | Possible learning reading (hypothesis until evidenced) |
|---------|--------------------------------------------------------|
| Correct thesis + no participation + expected move occurs | Missed-opportunity / near-miss learning case |
| WAIT + subsequent invalidation/collapse | Successful risk-barrier behavior |
| ENTER + stop | Does **not** by itself establish barrier failure |

The question is: **Which layer created, preserved, degraded, or destroyed the available edge?**

**Core lesson:** STUDY BOTH FAILURE AND SUCCESS OF CONTROLS.

---

## Secondary market-specific analogues

Trading applications remain useful as specialized references. Examples already identified:

| Analogue | Useful idea |
|----------|-------------|
| **TradeZella** | Cross-case trading analytics and performance decomposition |
| **TrendSpider** | Strategy testing and counterfactual experimentation |
| **TradingView** | Historical / replay mechanisms |
| **Kinfo / verified execution systems** | Ground truth from actual execution |

These provide **tools and implementation ideas**.

They do **not** provide MXT's primary intellectual architecture.

MXT's deeper methodological lineage is closer to:

```text
NASA
+ Aviation FOQA
+ NTSB
+ Process safety / barrier learning
```

applied to market decision-making.

---

## The Case is the learning unit

The fundamental learning unit must **not** be restricted to TRADE.

It is **CASE**.

A Case can represent (among other evidence-supported states):

- ENTER → WIN / LOSS / INCONCLUSIVE
- WAIT → OPPORTUNITY MISSED / RISK AVOIDED / STILL INCONCLUSIVE
- PASS → CORRECT REJECTION / MISSED OPPORTUNITY
- THESIS → INVALIDATED
- THESIS → CORRECT BUT NEVER ACTIONABLE

If MXT studies only executed trades, it systematically deletes evidence about decisions that prevented execution — making it impossible to determine whether the system is **protecting** edge or **suppressing** it.

---

## Edge Retention (research direction — not a KPI here)

**Edge Retention** is an important conceptual research direction.

**Do not** implement it as a metric or KPI in this documentation task.

The question:

> Of the apparent predictive/decision edge available at the thesis layer, how much survives the complete decision pipeline?

Conceptually:

```text
THESIS EDGE
    ↓
PLAN
    ↓
SCOUT / DECISION
    ↓
ENTRY GEOMETRY
    ↓
RISK CONTROL
    ↓
EXECUTION
    ↓
REALIZED RESULT
```

Future Cross-Case analysis should eventually allow MXT to identify decompositions **resembling** (illustration only — not a claim about current MXT):

- Thesis layer: strong  
- Plan layer: adequate  
- Decision filtering: excessively restrictive  
- Opportunity capture: weak  
- Risk containment: strong  
- Realized edge: weak  

— or any other pattern **actually supported by evidence**.

---

## Adaptation, not uncontrolled self-modification

MXT is an **adaptation** engine.

That does **not** mean autonomous uncontrolled mutation.

The system may: detect patterns, identify anomalies, quantify relationships, formulate hypotheses, compare alternatives, propose experiments, and evaluate subsequent evidence.

Material rule changes remain controlled:

```text
EVIDENCE
→ PATTERN
→ HYPOTHESIS
→ PROPOSED CHANGE
→ HUMAN AUTHORIZATION
→ CONTROLLED TEST
→ NEW EVIDENCE
→ COMPARISON
→ KEEP / MODIFY / REJECT
```

Objective: **disciplined adaptation** — not self-modification for its own sake.

---

## Computational purpose

MXT should use computational power primarily where humans are weak:

- preserving large amounts of temporal evidence
- comparing many Cases
- detecting recurring relationships
- calculating distributions
- testing alternatives
- identifying interactions between variables
- maintaining consistent evaluation criteria
- remembering previous experiments and outcomes

The human should not be required to manually reproduce this work.

The system should amplify human thesis generation and judgment with systematic evidence processing.

---

## Core product test

When considering a future MXT feature, ask:

Does this help MXT:

1. preserve what was known?
2. make a better decision under uncertainty?
3. observe reality more accurately?
4. learn from more Cases?
5. identify where edge was preserved or lost?
6. test a learning hypothesis?
7. determine whether an adaptation improved results?

If the answer to all seven is **NO**, the feature is probably peripheral to MXT Core and requires explicit justification.

---

## Relationship to current foundation

| Component | Role in the learning engine |
|-----------|-----------------------------|
| **T0** | Epistemic integrity — preserve decision-time knowledge (not a hide-later-evidence rule) |
| **Evaluation Horizon** | Finite observation boundary |
| **Case** | Learning unit |
| **Reality + Outcome → Evaluation** | Use possessed/acquired evidence for measurement (Edge Decomposition substrate); Blind/Reveal ceremony **DEPRECATED** |
| **Thesis → Reality** | Observation chain |
| **Future Cross-Case Learning** | FOQA-like population learning |
| **Future controlled experimentation** | Adaptation loop |

These components are **infrastructure for the learning engine** — not isolated features.

---

## Conflicts with existing Library docs (reported, not silently reconciled)

| Document | Conflict / tension |
|----------|--------------------|
| [`strategic-planning-vision.md`](strategic-planning-vision.md) | Frames MatrixTrade as a **strategic planning system** / gatekeeper and claims **product mission lives there**. Compatible as layer architecture; **incomplete** as Core identity vs sealed **learning and adaptation engine**. Mission/success already superseded by Edge Learning Mission; **identity class** superseded by this doctrine. |
| [`v2-engine-architecture.md`](v2-engine-architecture.md) | Identity: **“expectation database” + feedback-driven decision loop**. Narrower than sealed Core identity (learning & adaptation engine / FOQA-like population learning / barrier study). Treat as historical V2 framing, not equal Core seal. |
| Older “not a trading journal” formulations (strategic vision, V2, research backlog) | Correctly reject journal-as-mission, but still evaluate too often against **trading-app** categories. This doctrine elevates **non-trading methodological pillars** as primary lineage. |

**Not a conflict:** [`mxt-edge-learning-mission-governance.md`](mxt-edge-learning-mission-governance.md) — complementary (mission/success vs identity/method). Both sealed Core.

---

**SEALED CORE GOVERNANCE.** Reopening requires explicit product-owner authorization — not feature drift.

**MTA 012 correction (this re-seal):** Blind/Reveal as required product workflow is deprecated. T0 remains valid. Do not interpret temporal integrity as authorization to hide Reality/Outcome from evaluation.
