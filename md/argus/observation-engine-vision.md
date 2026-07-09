# ARGUS — Observation Engine Vision

**Status:** Vision Document (Canonical)  
**Purpose:** Product philosophy and long-term architectural direction.  
**Product identity:** [`evidence-organization-vision.md`](evidence-organization-vision.md) — ARGUS is an **Evidence Organization System** (receive → organize → correlate → retrieve → deliver). This document explains *how* that system behaves.  
**Related:** [`ai-charter.md`](ai-charter.md) · [`knowledge-model-v01.md`](knowledge-model-v01.md) · [`knowledge-execution-model.md`](knowledge-execution-model.md) · [`vision-review-protocol.md`](vision-review-protocol.md)

**AI rule:** Re-read this document at the cadence defined in [`vision-review-protocol.md`](vision-review-protocol.md) before proposing product direction, new object types, or features that ask users for subjective input.

---

## Product identity (read first)

ARGUS is not a note-taking application. It does not compete with Word, OneNote, Evernote, or Obsidian — those are **authoring** tools.

ARGUS is an **Evidence Organization System**: receive information from anywhere, organize and correlate it, retrieve it by context, and deliver defensible packages. Authoring happens elsewhere; registration and connection happen in ARGUS.

Full framing: [`evidence-organization-vision.md`](evidence-organization-vision.md).

---

## The Discovery

ARGUS is not a productivity application.

It is not a checklist manager.

It is not a statistics dashboard.

It is not a habit tracker.

It is not an AI assistant that tells the user what to do.

Those may become applications built on ARGUS, but they are not its identity.

The identity of ARGUS is much simpler.

**ARGUS is an observation engine.**

Its purpose is to preserve objective reality with the least possible friction and allow useful patterns to emerge from accumulated evidence.

---

## First Principle

Reality exists independently of interpretation.

People forget.

People misremember.

People simplify.

People reinterpret.

Evidence does not.

The responsibility of ARGUS is therefore not to judge reality.

Its responsibility is to preserve it.

Everything else comes afterwards.

---

## Evidence Before Interpretation

Every conclusion should originate from observable evidence.

Not opinions.

Not assumptions.

Not ratings.

Not self-assessments.

Not manually entered productivity scores.

Evidence is the only permanent asset of the system.

Interpretations are temporary.

As intelligence improves, interpretations may change.

Evidence should never need to.

---

## Observation Instead of Questionnaires

Most productivity systems continuously ask the user questions.

- How productive were you?
- How focused were you?
- Rate today’s performance.
- How motivated did you feel?

These questions introduce human bias into the dataset.

Memory is imperfect.

Emotion changes perception.

People tend to justify their own behavior.

ARGUS should avoid collecting subjective information whenever objective observation is possible.

The fundamental rule becomes:

> **Never ask the user for information that can already be objectively observed.**

Observation has priority over questionnaires.

---

## Minimal User Friction

The system should interfere with the user’s work as little as possible.

The objective is not to create additional work.

The objective is to quietly observe work that is already happening.

Whenever possible, ARGUS should learn through existing interactions:

- Writing
- Meetings
- Emails
- Documents
- Projects
- Conversations

Evidence should naturally accumulate while the user performs normal work.

---

## Reality Over Productivity

ARGUS does not measure productivity.

It reconstructs reality.

Productivity becomes one possible interpretation of that reality.

Professional growth becomes another.

Knowledge reuse becomes another.

Career evidence becomes another.

Legal reconstruction becomes another.

All originate from the same evidence.

**Reality is the product.**

**Insights are applications.**

---

## Observation Layer

The Observation Layer is the foundation of the system.

Its purpose is extremely simple:

1. Observe.
2. Record.
3. Preserve.

Nothing more.

It should avoid reasoning whenever possible.

It should avoid conclusions whenever possible.

Its responsibility ends once reality has been faithfully captured.

---

## Correlation Layer

Once evidence exists, relationships naturally appear.

Different pieces of evidence become connected through:

- People
- Projects
- Organizations
- Topics
- Events
- Time
- Documents
- Communication

The purpose of the Correlation Layer is not to explain these relationships.

Its responsibility is only to identify that they exist.

---

## Insight Layer

Insights are never entered.

They emerge.

The system should not attempt to tell the user how to work.

Instead it should surface observations such as:

- “This sequence of events appears repeatedly.”
- “This behavior consistently precedes completed projects.”
- “These topics frequently appear together.”
- “This type of meeting often generates follow-up work.”

Every insight must remain traceable to supporting evidence.

**No insight should exist without evidence.**

---

## Hypothesis Rather Than Advice

Traditional assistants provide recommendations.

ARGUS should instead formulate hypotheses.

Examples:

- “There appears to be a relationship between early project documentation and successful completion.”
- “This sequence appears more frequently in successful projects than unsuccessful ones.”

A hypothesis is not a recommendation.

It is an invitation to observe further.

The system remains intellectually honest.

Confidence increases only through accumulated evidence.

---

## Scientific Thinking

ARGUS should behave more like a researcher than a coach.

Researchers observe.

Researchers collect evidence.

Researchers identify relationships.

Researchers formulate hypotheses.

Researchers validate or reject hypotheses.

This scientific process should become the natural evolution of the product.

---

## Evidence Is Permanent

Evidence is the only irreplaceable asset.

Algorithms will improve.

Language models will improve.

Statistical techniques will improve.

Graph analysis will improve.

Inference engines will improve.

The evidence remains valuable regardless of how future intelligence evolves.

Therefore the system should prioritize evidence quality above analytical sophistication.

---

## Intelligence Is Replaceable

Observation is part of the product.

Inference is an implementation.

Statistics.

Machine learning.

Large language models.

Graph algorithms.

Future reasoning systems.

These are interchangeable modules.

The Observation Layer should remain stable regardless of how inference evolves.

---

## Human Judgment

ARGUS never replaces professional judgment.

It never determines who is right.

It never determines who is wrong.

It never assigns blame.

It never decides.

It provides evidence.

It reconstructs chronology.

It exposes relationships.

The human remains responsible for interpretation.

---

## The Four Core Verbs

Every future feature should belong to one of four verbs.

| Verb | Meaning |
|------|---------|
| **Observe** | Capture objective reality. Preserve evidence. Reduce user friction. |
| **Correlate** | Identify relationships between pieces of evidence. Connect reality. Do not explain it. |
| **Hypothesize** | Generate evidence-backed hypotheses. Express uncertainty honestly. Allow confidence to evolve over time. |
| **Reconstruct** | Rebuild events. Recover chronology. Support professional memory. Support factual reporting. |

If a proposed feature cannot be classified under one of these verbs, it probably does not belong in ARGUS.

---

## Product Evolution

ARGUS should evolve by increasing its observational capability.

Not by increasing the number of forms.

Not by increasing the number of manual metrics.

Not by increasing the number of required checklists.

Every evolution should improve one of the following:

1. Ability to observe.
2. Ability to correlate.
3. Ability to formulate hypotheses.
4. Ability to reconstruct reality.

Nothing else should become a primary development objective.

---

## Architectural Principle

```
Observation  →  generates evidence
Evidence     →  generates relationships
Relationships →  generate hypotheses
Hypotheses   →  generate understanding
Understanding →  belongs to the user
```

---

## Long-Term Vision

The ultimate objective of ARGUS is not to organize information.

It is to preserve reality with enough fidelity that valuable knowledge naturally emerges.

Years later, the system should be capable of:

- Reconstructing what happened.
- Demonstrating professional contribution.
- Supporting career development.
- Recovering forgotten knowledge.
- Showing how relationships evolved.
- Explaining how decisions were reached.
- Identifying repeatable behaviors associated with desired outcomes.

All without requiring users to manually rate themselves, justify themselves, or continuously feed artificial metrics into the system.

**Reality should remain the source of truth.**

**Observation should remain the foundation.**

**Everything else should emerge from evidence.**

---

## Relationship to other canonical docs

| Doc | Role |
|-----|------|
| [evidence-organization-vision.md](evidence-organization-vision.md) | **Product identity** — Evidence Organization System; not authoring |
| [ai-charter.md](ai-charter.md) | Operational rules for AI-assisted work |
| [knowledge-model-v01.md](knowledge-model-v01.md) | Target data ontology (Evidence graph) |
| [knowledge-execution-model.md](knowledge-execution-model.md) | Evidence registration; entities; Execution |
| [timeline-vision.md](timeline-vision.md) | Timeline UX — evidence stream, not inbox clone |
| [correlation-guide.md](correlation-guide.md) | Capture once, link everywhere |

**Evidence Organization System** (what ARGUS is) and **Observation Engine** (how it behaves) are complementary. This document defines **how**. [`evidence-organization-vision.md`](evidence-organization-vision.md) defines **what**. Implementation docs define **build** (today and target).
