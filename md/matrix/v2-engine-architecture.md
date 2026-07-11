# Matrix V2 — Engine architecture

**Status:** Canonical target architecture (2026-07-10).  
**Rule:** Distill here before coding. Do not implement features verbatim from chat notes.

**Parent:** [strategic-planning-vision.md](strategic-planning-vision.md) · **Runtime today:** [runtime-truth.md](runtime-truth.md)

---

## Identity (unchanged mission)

MatrixTrade is an **expectation database** with a **feedback-driven decision loop** — not a trading journal.

One AI fleet (`lib/ai-context.ts`) talks to any chat. Humans Apply via Inbox. **Nothing is overwritten** — evidence, decisions, and profiles evolve by **append + version**.

---

## Pipeline (V2 spine)

```text
Playbook
   ↓
Market Evidence        ← observations only (no conclusions)
   ↓
Stock Profile          ← synthesized “suspect dossier” (derived + curated)
   ↓
Scout + Decision       ← go / wait / probe / no + confidence + risk split
   ↓
Execution              ← WAIT → PROBE → CONFIRM → FULL (trades)
   ↓
Learning + Attribution + Statistics
```

**Not ARGUS:** Matrix `MarketEvidence` ≠ ARGUS professional evidence. Same repo, different product, different schema prefix (`ME-` vs ARGUS ids).

---

## Five major engines (+ execution lane)

| # | Engine | Owns | Does not own |
|---|--------|------|--------------|
| 1 | **Evidence** | Atomic observations (timeframe, category, value, confidence, source) | Trades, verdicts, P/L |
| 2 | **Decision** | Scout record, verdict, EV, planning vs execution risk, Bayesian confidence | Fills, positions |
| 3 | **Learning** | Scout outcomes: executed, missed, cancelled, expired + lessons | Live prices |
| 4 | **Attribution** | Scores: thesis, scout, execution, risk vs outcome | Replacing review |
| 5 | **Statistics** | Dimensional queries (playbook, setup, regime, entry type…) | Single-ticker vanity stats |
| — | **Execution** (lane) | Probe, full entry, convert/cancel | Thesis authoring |

Coach (automatic patterns) is **output of Statistics + Learning** — not a sixth engine in v1.

---

## 1. Evidence Engine

**Purpose:** Separate observations from conclusions.

```text
MarketEvidence
 ├ id
 ├ stockProfileId
 ├ timeframe
 ├ category          // structure | volatility | relative_strength | volume | regime | catalyst
 ├ value             // normalized label or number
 ├ confidence        // 0-100
 ├ source            // human | ai | import
 ├ observedAt
 └ supersededBy?     // never delete — chain revisions
```

**Examples:** Weekly HH/HL, monthly support, ATR contraction, RS vs SPY, volume dry-up, earnings proximity.

**Rule:** Stock Profile **hypothesis is derived** from active evidence set — not a free-text substitute. Humans and AI **add evidence**; profile **synthesizes** (light summary fields + link to evidence ids).

---

## 2. Decision Engine (Scouting brain)

Replaces crude `go | wait | no` from thesis.status alone.

```text
Decision (per Scout)
 ├ verdict              // wait | probe | go | no
 ├ decisionConfidence   // 0-100
 ├ expectedValue        // optional R units
 ├ expectedProbability
 ├ opportunityQuality   // 0-100
 ├ planningRisk         // structure, support, stop, RR
 ├ executionRisk        // gap, spread, earnings, emotion, liquidity, late
 ├ reasoning            // short
 ├ challenges[]         // required — anti-rubber-stamp
 └ priorDecisionId?     // chain
```

**Planning risk** and **execution risk** are **different structs** — never one “risk” field.

**Bayesian (light):** Store `thesisConfidence` on profile + `priorConfidence` / `posteriorConfidence` on each Decision update — no emotional jumps without evidence refs.

---

## 3. Learning Engine

```text
Scout
  ↓
Trade? (probe | full | none)
  ↓
Terminal outcome:
  · Executed (won/lost)
  · Missed opportunity
  · Cancelled
  · Expired
  ↓
Learning record (append-only)
```

Matrix must learn from **trades never taken** — not only closed H00x.

Today `TradePlan.outcome` is a **partial** proto — missing `missed_opportunity` and probe path.

---

## 4. Attribution Engine

Post-close (or post-miss), score **independently**:

| Dimension | Question |
|-----------|----------|
| Thesis | Was the dossier right? |
| Scout | Was the decision right? |
| Execution | Did we execute the plan? |
| Risk | Was size/stop discipline ok? |
| Outcome | P/L or R (fact) |

Example: Thesis 93, Scout 91, Execution 46, Outcome +4R → “won despite bad execution.”

**Not** the same as trade `review` quality 1–5 today.

---

## 5. Statistics Engine

Dimensions (examples):

- Ticker, Playbook, Setup, Market regime, Timeframe, Sector, Execution type, Entry type

Target answer:

```text
Weekly Breakout · 43 trades · 61% · 3.8R avg
```

not `TSLA good`.

---

## Execution lane — Probe (highest-value wedge)

```text
WAIT → PROBE → CONFIRM → FULL POSITION
```

**Probe** = information trade, **not** averaging down.

```text
Probe
 ├ enabled
 ├ allocationPercent    // e.g. 5%
 ├ riskPercent          // e.g. 0.10R of monthly budget
 ├ shares / stop
 ├ reason
 ├ expires
 ├ trigger
 ├ converted → full
 └ cancelled
```

Stopped probe: `-0.10R`. Confirmed: convert to full per Decision triggers.

---

## Phased build (library contract — coding follows)

| Phase | Build | Freeze |
|-------|-------|--------|
| **A** | Docs + schema sketches (this folder) | Trade UI redesign |
| **B** | Evidence append API + Profile synthesis read model | Bayesian automation |
| **C** | Decision fields on Scout + probe state machine | Full attribution |
| **D** | Learning outcomes + missed scout | Statistics dimensions |
| **E** | Attribution + Coach readouts | — |

**Current code** = late Phase 0 (handwritten profile, PLAN scout, AI blocks). See [runtime-truth.md](runtime-truth.md).

---

## Coherence rules (for any chat / agent)

1. One engine, one owner — no mega JSON on `TradePlan`.
2. Append + version — no silent overwrite ([immutability](../rules/immutability-and-history.md)).
3. Extend `lib/ai-context.ts` + inbox types — no parallel export pipelines.
4. Read `md/matrix/` before coding.
5. Profile edits = **patch proposals** (AI Block or form), not wholesale replace.

---

## Related

- [scout-execution-model.md](scout-execution-model.md) — Scout vs Trade vs Probe diagram
- [stock-profile-design.md](stock-profile-design.md) — dossier UX, append model, stolen patterns
- [ai-engineering.md](ai-engineering.md) — current AI fleet (Phase 0)
