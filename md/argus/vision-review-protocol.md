# ARGUS — Vision Review Protocol

**Status:** Canonical (process)  
**Purpose:** Cadence and checklist for humans and AI to re-align product work with ARGUS vision documents.

---

## Documents in the vision stack (read in this order)

| # | Document | Role |
|---|----------|------|
| 1 | [observation-engine-vision.md](observation-engine-vision.md) | **Why** — observation engine, four verbs, layers |
| 2 | [ai-charter.md](ai-charter.md) | **AI rules** — evidence before conclusions |
| 3 | [knowledge-model-v01.md](knowledge-model-v01.md) | **Target ontology** — Evidence graph |
| 4 | [knowledge-execution-model.md](knowledge-execution-model.md) | **Knowledge vs Execution** — Runbook, entities |
| 5 | [timeline-vision.md](timeline-vision.md) | **Timeline UX** — scope and placement |
| 6 | [correlation-guide.md](correlation-guide.md) | **Linking** — capture once, correlate everywhere |
| 7 | [design-matrix-stage.md](design-matrix-stage.md) | **Lenses** — org, project, person rules |

Supporting (not vision, but check when UI changes): [v2-design-checklist.md](v2-design-checklist.md), [checklist-protocol.md](checklist-protocol.md).

---

## When to run a vision review

### Mandatory (AI + human)

1. **Before** proposing a new ARGUS object type, domain, or major UX paradigm.
2. **Before** features that ask users for subjective ratings, productivity scores, or mandatory workflows.
3. **When** the user says: *“review vision”*, *“does this fit ARGUS?”*, or *“observation engine”*.
4. **At the start** of a multi-session ARGUS product iteration (new Home layout, new Create flow, Timeline redesign, etc.).

### Recommended cadence

| Cadence | Action |
|---------|--------|
| **Each significant feature PR** | Skim § Vision alignment checklist (below) in PR description or agent summary |
| **Monthly** (or after ~4 deploys) | Full re-read of [observation-engine-vision.md](observation-engine-vision.md) + [timeline-vision.md](timeline-vision.md); update gap table in this file |
| **Quarterly** | Reconcile vision stack with [model-alignment-audit.md](model-alignment-audit.md) |

### Cursor automation

Rule: [`.cursor/rules/argus-vision-review.mdc`](../../.cursor/rules/argus-vision-review.mdc) — applies when editing ARGUS product code or vision docs. Agent should load vision stack and run checklist before suggesting direction changes.

---

## Vision alignment checklist

Answer **yes** or explain exception:

| # | Question |
|---|----------|
| 1 | Does this **observe** objective reality rather than ask subjective questionnaires? |
| 2 | Is new data **evidence** or **correlation** — not interpretation stored as fact? |
| 3 | Can every surfaced insight trace to **evidence IDs**? |
| 4 | Does the feature map to **Observe, Correlate, Hypothesize, or Reconstruct**? |
| 5 | Does it **reduce friction** (use existing work: email, journal, meetings)? |
| 6 | If Execution (Runbook, etc.): optional, no forced compliance, no task ownership theater? |
| 7 | If Timeline-related: entity-scoped depth, not inbox clone on Home? |
| 8 | Are **entities** (lenses) the primary navigation — not activity feeds? |

If **three or more** answers are “no” or unclear → stop and revise design before coding.

---

## Gap log (update on each review)

| Date | Reviewer | Gap | Action |
|------|----------|-----|--------|
| 2026-07-07 | Product + AI | Home Timeline feels inbox-only | See [timeline-vision.md](timeline-vision.md) §7 |
| 2026-07-07 | Product + AI | Recent Activity duplicated Timeline | Removed from Home; Entities primary |
| 2026-07-07 | Product + AI | Observation Engine vision not in repo | Added observation-engine-vision.md |

---

## How to request a review in chat

User prompts that should trigger full vision stack read:

- “Review ARGUS vision”
- “Does X fit the observation engine?”
- “Vision check before we build Y”
- “Re-read observation-engine-vision”

Agent response should cite: four verbs, evidence permanence, and specific doc section — not generic productivity advice.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-07-07 | Initial protocol + gap log |
