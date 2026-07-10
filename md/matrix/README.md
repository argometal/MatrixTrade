# Matrix — product vision & strategic core

**Start here for MatrixTrade identity** (not ARGUS).

MatrixTrade is more than trade recording. Its core is **strategic planning**: method → target profile → go/no-go decision → execution.

---

## Reading order

| # | Document | Role |
|---|----------|------|
| 1 | [strategic-planning-vision.md](strategic-planning-vision.md) | **Product identity** — what MatrixTrade is, four layers, mission |
| 2 | [library-alignment-backlog.md](library-alignment-backlog.md) | **Pending** — docs to update so the whole Library points here |
| 3 | [../architecture/matrixtrade-app.md](../architecture/matrixtrade-app.md) | Runtime routes and modules (what ships today) |
| 4 | [../design/stock-thesis-proposal.md](../design/stock-thesis-proposal.md) | Phase 0 implementation notes (Stock File + Planning) |

**ARGUS** has its own stack: [`../argus/README.md`](../argus/README.md).

**Legacy north star:** [`../../MATRIX-v2-VISION.md`](../../MATRIX-v2-VISION.md) — knowledge-base + experiment framing; strategic core superseded by this folder.

---

## One-sentence identity

> **MatrixTrade is a strategic planning system for discretionary trading** — Playbook (method), Stock File (target profile), Decision Lab (go/no-go + risk), then Trade (execution).

Recording (trades, journal, stats) is necessary but **not the mission**.

---

## Code vs vision (today)

| Vision layer | Working name (target) | Route today | Status |
|--------------|----------------------|-------------|--------|
| Playbook | Playbook | `/playbook` | Exists; few strategies loaded |
| Stock File | Stock File (code: Stock Thesis) | `/stock-theses/[id]` | TSLA pilot shipped |
| Decision Lab | **Naming open** (was Planning Lab) | `/planning` | Partial — tactical plans; gatekeeper logic TBD |
| Trade | Trade | `/trades` | Recording layer — mature |

See [strategic-planning-vision.md § Naming](strategic-planning-vision.md#naming-open-decision-lab) for Decision Lab name candidates.
