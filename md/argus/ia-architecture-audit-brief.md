# IA architecture audit — access brief

**Status:** Proposed — ready for external IA review  
**Date:** 2026-08-06  
**Repo:** [argometal/MatrixTrade](https://github.com/argometal/MatrixTrade)  
**Branch (docs + latest handoff):** `cursor/ia-event-topic-signals-handoff-e1a0`  
**PR:** https://github.com/argometal/MatrixTrade/pull/162  

This file is the **front door** for an architecture-level audit. It points at the live Argus MD library and the current product handoff — not repository metadata alone.

---

## Addresses to open (copy/paste)

### 1. Argus MD library (full folder)

| What | URL |
|------|-----|
| **Browse library (branch)** | https://github.com/argometal/MatrixTrade/tree/cursor/ia-event-topic-signals-handoff-e1a0/md/argus |
| **Library index (README)** | https://github.com/argometal/MatrixTrade/blob/cursor/ia-event-topic-signals-handoff-e1a0/md/argus/README.md |
| **Same on `main` (if branch merged later)** | https://github.com/argometal/MatrixTrade/tree/main/md/argus |
| **Download whole branch as ZIP** | https://github.com/argometal/MatrixTrade/archive/refs/heads/cursor/ia-event-topic-signals-handoff-e1a0.zip |
| **Then open inside ZIP** | `md/argus/` |

### 2. Latest handoff (signals / aliases / topic metrics)

| What | URL |
|------|-----|
| **Current product handoff** | https://github.com/argometal/MatrixTrade/blob/cursor/ia-event-topic-signals-handoff-e1a0/md/argus/event-topic-signals-metrics-ia-handoff.md |
| **Vocabulary (Alias vs Signal)** | https://github.com/argometal/MatrixTrade/blob/cursor/ia-event-topic-signals-handoff-e1a0/md/argus/vocabulary-policy.md |
| **Tag Patterns rules** | https://github.com/argometal/MatrixTrade/blob/cursor/ia-event-topic-signals-handoff-e1a0/md/argus/tag-patterns-vision.md |
| **Draft PR carrying these docs** | https://github.com/argometal/MatrixTrade/pull/162 |

### 3. Architecture companions (same repo, not under `md/argus` only)

| What | URL |
|------|-----|
| Design principles | https://github.com/argometal/MatrixTrade/blob/cursor/ia-event-topic-signals-handoff-e1a0/md/integrations/argus-design-principles.md |
| Architecture | https://github.com/argometal/MatrixTrade/blob/cursor/ia-event-topic-signals-handoff-e1a0/md/integrations/argus-architecture.md |
| Storage | https://github.com/argometal/MatrixTrade/blob/cursor/ia-event-topic-signals-handoff-e1a0/md/integrations/argus-storage.md |
| ChatGPT / external AI entry | https://github.com/argometal/MatrixTrade/blob/cursor/ia-event-topic-signals-handoff-e1a0/md/integrations/argus-chatgpt-handoff.md |
| Parent MD index | https://github.com/argometal/MatrixTrade/blob/cursor/ia-event-topic-signals-handoff-e1a0/md/README.md |

### 4. Running product (runtime, not docs)

| What | URL |
|------|-----|
| Production Argus | https://matrix-trade-theta.vercel.app/argus |
| Topics browse | https://matrix-trade-theta.vercel.app/argus/v2/browse/topics |
| Events browse | https://matrix-trade-theta.vercel.app/argus/v2/browse/events |

Auth required for app data; docs above are public if the repo is visible to the reviewer.

---

## How to pull the library locally (optional)

```bash
git clone https://github.com/argometal/MatrixTrade.git
cd MatrixTrade
git fetch origin cursor/ia-event-topic-signals-handoff-e1a0
git checkout cursor/ia-event-topic-signals-handoff-e1a0
# Argus MD library:
ls md/argus
# Latest handoff:
open md/argus/event-topic-signals-metrics-ia-handoff.md   # or cat / editor
```

Admin access to the repo is enough — no special upload package required. Prefer the **branch** URLs above until PR #162 is merged to `main`.

---

## Requested audit scope (please cover all six)

Use the MD library + handoff as primary evidence. Code under `app/argus/` and `lib/argus/` may be cited when docs and runtime disagree (see README “When code and docs disagree”).

### 1. Architecture
- Domain consistency
- Ontology violations
- Duplicate concepts
- Technical debt
- Missing abstractions  

**Start here:** `README.md` (reading order Track A) → `evidence-organization-vision.md` → `observation-engine-vision.md` → `knowledge-model-v01.md` → `model-alignment-audit.md` → `vocabulary-policy.md` → `v2-hierarchy-implementation-report.md`

### 2. Metrics
- Existing metrics
- Missing metrics
- Metrics that cannot be computed
- Leading vs lagging indicators
- Decision usefulness  

**Start here:** `tag-patterns-vision.md` → `event-topic-signals-metrics-ia-handoff.md` → `intelligence-viz-plan.md` → `network-intelligence-thesis.md` → topic/event loader behavior described in the handoff

### 3. Pipeline
- Missing stages
- Broken flows
- Circular dependencies
- Dead-end states  

**Start here:** `product-flow-proposal.md` (Receive → Organize → Correlate → Retrieve → Deliver) → `correlation-guide.md` → `event-chronicle-v2.md` → `register-capture-redesign.md` → `export-delivery-handoff.md` / `deliver-formats-plan.md`

### 4. Gaps
- Features implied but not implemented
- Missing entities / relationships / validation  

**Start here:** `model-alignment-audit.md` → `v2-checklist-solutions.md` → `phase-0-1-stabilization-audit.md` → current handoff Decision block

### 5. Performance review (of the work / system maturity)
Score objectively across: architecture quality, product thinking, consistency, execution speed, scope control, complexity management, technical debt generation, strategic decisions, overall maturity.

### 6. Frank assessment
Not motivational. Include: what is exceptionally strong; where the team slows itself; design mistakes; blind spots; highest-ROI improvements; whether MatrixTrade/Argus is converging on a robust operating system or drifting into unnecessary complexity.

---

## Immediate product question already framed in the latest handoff

Before / as part of the audit, the open decisions in  
[`event-topic-signals-metrics-ia-handoff.md`](event-topic-signals-metrics-ia-handoff.md)  
should be answered or overridden:

1. Keep **Aliases** (Topic) ≠ **Signals** (Event), or unify labels?  
2. After event↔topic link: widen topic metric/Pattern scope, co-link writes, both, or UX-only?  
3. Bidirectional link discovery?  
4. Events count pill on topic?  
5. Aliases still never become Patterns?

Suggested default in that doc: keep labels; widen topic Patterns + volume to linked-event evidence (bidirectional); add Events pill.

---

## Deliverable expected from IA

A single written audit with:

1. Findings under sections 1–4 (prioritized).  
2. Performance grades (section 5).  
3. Frank assessment (section 6).  
4. Prioritized recommendations (P0 / P1 / P2) with explicit “do / don’t build yet.”  
5. Confirmation or rewrite of Decisions D1–D5 from the signals/metrics handoff.

Please post the audit as a PR comment on #162, a new `md/argus/` doc (e.g. `ia-architecture-audit-YYYY-MM-DD.md`), or both.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-08-06 | Access brief for external IA: library URLs, latest handoff, six-part audit charter |
