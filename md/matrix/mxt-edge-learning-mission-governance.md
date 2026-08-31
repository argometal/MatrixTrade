# MXT — Edge Learning Mission & Governance

**Status:** SEALED PRODUCT GOVERNANCE  
**Sealed:** Prompt #9G (product owner + reasoning system agreement)  
**Scope:** MXT product objective and evaluation criterion  
**Mode:** Documentation only — not an implementation authorization

**Companion (what class of system MXT is):**  
[mxt-core-learning-adaptation-doctrine.md](mxt-core-learning-adaptation-doctrine.md) — Core Learning & Adaptation Doctrine · `SEALED CORE GOVERNANCE`

---

## Authority

This document is the **canonical product governance** for MXT.

Future MXT features, metrics, and “success” claims must be evaluated against this mission.

Historical Library documents that describe Matrix/MatrixTrade identity, risk posture, or gatekeeping remain useful architecture context. Where they **conflict** with this sealed mission, **this document prevails** for purpose and success criteria. Conflicts are listed below — they are **not** silently rewritten here.

**Not authorized by this seal:**

- Autonomous trading
- Silent Playbook / rule mutation
- Skipping measurement to jump to automated optimization
- Treating T0 / Case reconstruction as the end goal
- Treating Blind / Reveal as a required product workflow (DEPRECATED — see Role of T0 / Case below)

---

## Primary mission

MXT exists to help convert the user's ability to formulate or detect market theses into **measurable trading edge**.

Its purpose is **not** merely to:

- store trades
- document analyses
- generate reasons not to enter
- enforce increasingly restrictive rules
- create more dashboards
- accumulate market commentary

MXT must ultimately answer:

1. Are our theses actually predictive?
2. Are our decisions preserving or destroying that edge?
3. Where between thesis and realized result are we losing value?
4. What recurring evidence suggests that the process should improve?
5. After a controlled change, did the process actually improve?

### Canonical learning chain

```text
THESIS
→ MXT DECISION
→ EXECUTION / NO EXECUTION
→ MARKET REALITY
→ MEASUREMENT
→ CROSS-CASE LEARNING
→ FAILURE / BOTTLENECK HYPOTHESIS
→ CONTROLLED CHANGE
→ NEW CASES
→ DID WE IMPROVE?
```

---

## Foundational principle

The user's thesis-generation ability and MXT's decision process must be evaluated **separately**.

- A good thesis does not imply a good trade.
- A bad outcome does not imply a bad decision.
- A profitable trade does not prove a good thesis.
- A no-trade decision can be correct.
- Repeated failure to participate in correctly anticipated moves may itself become evidence of a **process** problem.

Therefore:

```text
THESIS QUALITY
≠ DECISION QUALITY
≠ EXECUTION QUALITY
≠ OUTCOME QUALITY
```

MXT must preserve these distinctions.

---

## Edge must survive the process

**Risk control alone is not sufficient evidence of success.**

MXT may successfully reject poor trades while becoming so restrictive that it prevents profitable participation.

Example: across 15 theses, if directional theses are frequently correct, MXT repeatedly returns WAIT/PASS, few trades occur, and expected moves frequently complete without participation — MXT must **not** simply conclude “discipline worked.”

The system must investigate whether the bottleneck lies in (hypothesis until cross-case evidence supports it):

- entry geometry
- maximumEntry
- required pullback depth
- confirmation requirements
- timing
- invalidation geometry
- risk constraints
- another identifiable process component

---

## Learning from multiple cases

Individual outcomes are weak evidence.

MXT should accumulate cases and look for repeated relationships. After 4, 15, 30 or more sufficiently comparable cases, evidence may suggest e.g.:

- directional thesis process performing well, but opportunity capture poor; or
- relaxing entry requirements increased participation but also increased stop-outs and reduced expectancy.

The purpose is **not** maximum entry frequency.

The purpose is to improve **expected value** while preserving acceptable risk.

---

## Measurement before attribution

MXT must **measure before explaining**.

It must not automatically claim from isolated examples that Scout was wrong, entries are too conservative, stops are too tight, confirmations are excessive, or thesis generation is strong.

Instead:

```text
OBSERVE
→ MEASURE
→ FIND RECURRING PATTERN
→ FORM HYPOTHESIS
→ TEST CONTROLLED CHANGE
→ MEASURE AGAIN
```

---

## Controlled learning

MXT must **not** silently mutate its own Playbook or trading rules.

Learning produces evidence and hypotheses. Material process changes remain controlled:

```text
Evidence
→ Pattern
→ Proposed improvement
→ Human review / authorization
→ Controlled implementation
→ New sample
→ Comparison
```

This preserves accountability and prevents reward-hacking one metric while damaging the actual objective.

---

## Important example (illustrative)

Suppose 15 theses evaluated; 11 correctly anticipated direction; 9 WAIT/PASS; only 2 entries. Of missed opportunities, repeated evidence shows price never reached required entry geometry before completing the expected move.

That may support:

> Thesis generation has edge, but participation rules may be suppressing opportunity capture.

That does **not** authorize immediately loosening entries. A controlled adjustment must be tested. If capture rises (e.g. 20% → 55%) but stop-outs increase materially or expectancy deteriorates, the correct learning may be that simply entering earlier does **not** improve the system.

MXT must be capable of discovering this distinction.

---

## Computational value

MXT complexity must justify itself.

A computationally expensive decision system that repeatedly produces only “do not enter” is not automatically successful.

- If avoiding trades demonstrably preserves capital **and** expectancy → useful edge.
- If excessive filtering systematically prevents participation in correct theses → lost edge.

MXT must eventually distinguish these outcomes **empirically**.

---

## Role of T0 / Case (temporal integrity ≠ hiding)

T0 and Case reconstruction are **infrastructure** serving this mission — not the final objective.

| Piece | Purpose |
|-------|---------|
| **T0** | Preserve what was known, believed, planned, and decided at decision time — without retrospective rewriting |
| **Case** | Learning unit that assembles Thesis → Plan → Decision → Execution/No-execution → Reality → Outcome |
| **Reality + Outcome** | Information the system possesses or acquires — must remain visible to evaluation/learning where relevant |
| **Evaluation** | Measure and compare evidence (e.g. Edge Decomposition) without inventing root cause |
| **Cross-Case** | What repeatedly happens across decisions? |
| **Learning** | Where is edge created, preserved, or lost? |

**Canonical learning direction:**

```text
Thesis + Plan → Reality + Outcome → Evaluation → Learning → Future Improvement
```

**T0 is VALID. Blind as a required product state is NOT.**

- Historical integrity means: **preserve what we knew then**.
- It does **not** mean: **hide what we know now**.
- Preserving historical evidence must **not** require hiding later evidence.
- **Blind** as a required product workflow = **DEPRECATED**.
- **Reveal** as a required ceremony = **DEPRECATED**.
- Market Reality must not be withheld merely because a Reveal ceremony has not occurred.
- Do **not** replace Blind/Reveal with another ceremony.
- Do **not** delete T0, horizons, anti-retrospective-mutation protections, observations, or outcomes merely because they were previously associated with Blind/Reveal.

They exist so MXT can learn from historical decisions **without contaminating or rewriting decision-time evidence** — while still using Reality and Outcome for evaluation.

---

## Role of human and system

The product owner is not expected to manually duplicate analysis of every historical Case.

MXT and its reasoning layer should carry the analytical burden: reconstruct evidence, compare cases, measure outcomes, identify recurring relationships, propose hypotheses, and test whether controlled changes improve results.

**Human role (primarily):**

- establish intent
- provide theses/context where necessary
- supervise
- challenge conclusions
- authorize material changes

The system must **reduce** analytical burden, not transfer it back to the user.

---

## Success criterion

MXT succeeds when it can increasingly answer with evidence:

- WHERE IS OUR EDGE?
- WHERE ARE WE LOSING IT?
- WHAT SHOULD WE TEST NEXT?
- DID THE CHANGE IMPROVE EXPECTED RESULTS?

Ultimate objective is **not** maximum prediction accuracy, maximum trade frequency, or maximum risk avoidance.

It is:

> **Measurable, improving decision edge with controlled risk.**

**Governance implication:** “Avoided losses” / “discipline worked” is **insufficient** as a standalone definition of success. MXT must show whether it is preserving and improving edge across the full chain from thesis to realized result.

---

## Governance rule (feature filter)

Future MXT features must be evaluated against this mission.

A feature that adds complexity but does not materially improve:

- temporal integrity
- measurement
- decision quality
- opportunity capture understanding
- risk understanding
- cross-case learning
- controlled improvement

must justify why it belongs in MXT.

Do not allow MXT to evolve into a complex trading journal whose primary achievement is recording decisions after the fact.

**MXT is intended to become a learning decision system.**

---

## Relation to current work

| Stage | Role |
|-------|------|
| **Prompt #8** — T0 + finite horizon | Trustworthy temporal evidence (preserve what was known) |
| **Prompt #9** — Case reconstruction | Individual-case assembly substrate (Blind/Reveal UI ceremony = **DEPRECATED**) |
| **NEXT** — Real cases + Evaluation | Validate Reality + Outcome → Evaluation (e.g. Edge Decomposition) |
| **THEN** — Cross-case learning | Test whether MXT can discover where edge is created, preserved, or lost |

Do **not** skip directly to automated optimization.

---

## Naming note

Product surface name: **MXT** (under ArgusForge host routing).  
Library paths and many docs still say Matrix / MatrixTrade — same product lineage; this sealed mission applies to that product under the MXT name.

---

## Conflicts with existing Library docs (reported, not silently reconciled)

These are **tensions / supersessions** relative to this sealed mission. Do not treat the older wording as equal authority for success criteria.

| Document | Conflict / tension |
|----------|--------------------|
| [`strategic-planning-vision.md`](strategic-planning-vision.md) | States that **product mission lives in that document** and centers identity on strategic planning / **gatekeeper that can “stop you.”** Compatible as architecture layers; **insufficient** as sealed success criterion (under-weights opportunity capture, measurement, and controlled improvement of edge). **This sealed doc supersedes it for mission/success.** |
| [`README.md`](README.md) (Matrix index one-sentence / reading order historically led with strategic vision) | Reading order previously treated strategic vision as mission #1. **Sealed Edge Learning Mission is now #0 / primary governance.** |
| [`../rules/investment-principles.md`](../rules/investment-principles.md) | Absolute framing: **“Capital preservation has priority”** / losses more valuable than gains. Compatible as risk constraint; **conflicts** if read as “avoidance alone = success.” Under this seal, capital preservation is necessary but not sufficient — edge across thesis→result must also be measurable and improvable. |
| Vision alignment checklist in strategic-planning-vision (“quantify risk or gate before trade”) | Incomplete filter vs this seal (omits opportunity-capture understanding, cross-case measurement, controlled improvement). |

No other sealed ArgusForge / Alexandria governance docs are treated as MXT mission substitutes.

---

## Related infrastructure (non-governance)

| Doc / work | Relation |
|------------|----------|
| Prompt #8 T0 + horizon | Temporal integrity substrate |
| Prompt #9 Case reconstruction | Individual-case assembly substrate (Blind/Reveal ceremony deprecated) |
| [`maf-matrix-attribution-framework.md`](maf-matrix-attribution-framework.md) | Component attribution after experiment — measurement aid, not auto-root-cause |
| [`asymmetric-entry-confirmation-cost.md`](asymmetric-entry-confirmation-cost.md) | Thesis quality ≠ opportunity quality (Playbook layer) — aligned distinction |

---

**SEALED.** Product-owner re-seal required for mission changes — not feature drift.

**MTA 012 correction (this re-seal):** Blind/Reveal as required product workflow is deprecated. T0 temporal preservation remains valid. Canonical direction: Thesis + Plan → Reality + Outcome → Evaluation → Learning → Future Improvement.
