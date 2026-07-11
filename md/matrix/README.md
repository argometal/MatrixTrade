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
| 5 | [runtime-truth.md](runtime-truth.md) | **What works in prod today** |
| 6 | [ai-engineering.md](ai-engineering.md) | Single AI fleet |
| 7 | [scoped-ai-access.md](scoped-ai-access.md) | Temporal links for one Stock Profile |
| 8 | [ai-evolution.md](ai-evolution.md) | Protocol over provider; low-budget rules |
| 9 | [library-alignment-backlog.md](library-alignment-backlog.md) | Remaining doc debt |

---

## One sentence

> Expectation database + decision-learning architecture — Playbook → Evidence → Stock Profile → Scout/Decision → Execution (incl. Probe) → Learning.

Recording trades is necessary; **not the mission**.

---

## Code vs vision

| Layer | Route | Today |
|-------|-------|-------|
| Playbook | `/playbook` | Sparse |
| Stock Profile | `/stock-theses/[id]` | TSLA pilot; partial save |
| Scouting | `/planning` | PLAN + Decision + Probe + AI package |
| Assistant | `/exchange` | Same AI engine |
| Trade | `/trades` | Frozen |

**Coding starts only after library sign-off on V2 docs.**
