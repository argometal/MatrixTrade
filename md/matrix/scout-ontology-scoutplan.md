# Scout Ontology — ScoutPlan aggregate (milestone)

**Status:** Conceptual milestone — **no UI redesign · no persistence redesign**  
**Related:** `md/matrix/execution-instruction-architecture-follow-up.md` · PR #132

---

## Goal

**One domain model. Multiple UI projections.**

Canonical aggregate name: **`ScoutPlan`** (today’s runtime type: `TradePlan`).

---

## Aggregate

```text
ScoutPlan
├── Identity: id, ticker, stockFileId, playbookId(s), window
├── Thesis link: Stock File (strategic) ≠ Scout (tactical)
├── Geometry (structured — Matrix-owned math)
│     entry | layeredEntry | stop | target | authorizedRisk | sizingMode
├── Decision (judgment snapshot)
│     verdict, confidence, challenges, reasoning, Family B / probe if any
├── OperationalAssessment (confirmed OA — monitoring / review)
├── ExecutionReadiness (arming — ≠ broker submit)
├── ExecutionInstruction (AI explanation — Plan Map sentence)
└── Outcome / Learning (terminal — plan-outcome, LO/OBS)
```

---

## Projection map

| Surface | Reads |
|---------|--------|
| Scout / Planning detail | Full aggregate |
| Plan Map | Geometry + `executionInstruction` (+ fill projection) |
| Needs Attention | `PlanStatus` / window / outcome (OA optional later) |
| Dashboard monitoring | OA + `executionReadiness` |
| Learning | Outcome → LO / OBS / MAF |
| Trade transition | Geometry + readiness + human execute — Scout ≠ Trade until fill |

---

## Naming notes

| Persist / domain | View / legacy alias |
|------------------|---------------------|
| `executionInstruction` | `operationalParagraph` (Plan Map model) |
| LayeredEntry | Probe = legacy entry experiment |
| `ScoutPlan` (concept) | `TradePlan` (code type — rename later, not this milestone) |

---

## Overlaps to keep distinct

- `PlanStatus` ≠ `DecisionVerdict` ≠ OA ≠ `executionReadiness` ≠ lifecycle  
- Fill labels: Plan Map vs MAF vs `limit.filled` — do not conflate  
- Stock File thesis ≠ Scout tactical result  

---

## Belongs elsewhere

Capital / External Positions · MAF attribution detail · Stock File strategic thesis.

---

## Next (when authorized)

Doc-only adoption in Mechanics / CHAT-HANDOFF. Code rename `TradePlan` → `ScoutPlan` is **out of scope** until a dedicated rename task.
