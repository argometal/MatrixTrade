# Matrix — product vision & strategic core

**Start here for MatrixTrade identity** (not ARGUS).

---

## Reading order

| # | Document | Role |
|---|----------|------|
| 1 | [strategic-planning-vision.md](strategic-planning-vision.md) | Mission — four layers |
| 2 | [v2-engine-architecture.md](v2-engine-architecture.md) | **V2 target** — five engines + Probe |
| 3 | [stock-profile-design.md](stock-profile-design.md) | Suspect dossier — append, light, chat patches |
| 4 | [scout-execution-model.md](scout-execution-model.md) | Scout vs Trade vs Probe |
| 4a | [asymmetric-entry-confirmation-cost.md](asymmetric-entry-confirmation-cost.md) | **Expectancy & asymmetry** — Playbook layer only |
| 4a2 | [execution-experiments-layered-entry.md](execution-experiments-layered-entry.md) | **Layered entry** — strategy vs execution, no chase |
| 4a3 | [risk-weighted-layered-entry.md](risk-weighted-layered-entry.md) | **Risk-weighted layered entry** — R budget by expectancy, common stop |
| 4b | [adr-0001-trade-lifecycle-v1.md](adr-0001-trade-lifecycle-v1.md) | **ADR** — dual financial + analytical lifecycle (concept) |
| 4b2 | [adr-0002-trade-evaluation.md](adr-0002-trade-evaluation.md) | **ADR** — `TradeEvaluation` entity (**implemented**) |
| 4b3 | [adr-0003-mtae.md](adr-0003-mtae.md) | **ADR** — Matrix Technical Analysis Engine |
| 4b4 | [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md) | **MTAE** — multi-TF technical module (not Scout) |
| 4c | [monday-nflx-experiment.md](monday-nflx-experiment.md) | First live test — ops note, not Stock File |
| 4d | [external-ai-policy.md](external-ai-policy.md) | **No vendor brands** — external AI + Apply-only mutations |
| 4e | [thesis-ownership.md](thesis-ownership.md) | Thesis on Stock Profile, not Playbook |
| 4f | [snapshot-catalog.md](snapshot-catalog.md) | **Snapshot menu** — one button per window + Apply path |
| 4g | [control-panel-ia.md](control-panel-ia.md) | **Control IA** — descriptive labels; forensic on trade only |
| 5 | [runtime-truth.md](runtime-truth.md) | **What works in prod today** (refreshed 2026-07-21) |
| 6 | [ai-engineering.md](ai-engineering.md) | Single AI fleet |
| 7 | [scoped-ai-access.md](scoped-ai-access.md) | Temporal links for one Stock Profile |
| 8 | [ai-evolution.md](ai-evolution.md) | Protocol over provider; low-budget rules |
| 9 | [building-backlog.md](building-backlog.md) | **Active build queue** — priorities, ON HOLD items |
| 10 | [library-alignment-backlog.md](library-alignment-backlog.md) | Remaining doc debt |

---

## One sentence

> Expectation database + decision-learning architecture — Playbook → Evidence → Stock Profile → Scout/Decision → Execution (layered entry experiments; Probe legacy) → Learning.

Recording trades is necessary; **not the mission**.

---

## Code vs vision

| Layer | Route | Today |
|-------|-------|-------|
| Playbook | `/playbook` | Sparse |
| Stock Profile | `/stock-theses/[id]` | TSLA pilot; partial save |
| Scouting | `/planning` | PLAN + Decision + Probe + AI package |
| Assistant | `/exchange` | Same AI engine |
| Trade | `/trades` | Execution + **TradeEvaluation** on close |

**Coding:** Probe→Trade and TradeEvaluation shipped 2026-07-11 (ADR-0002). Missed-opportunity / Learning Engine still pending.
