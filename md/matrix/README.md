# Matrix — product vision & strategic core

**Start here for MatrixTrade identity** (not ARGUS).

MatrixTrade is an **expectation database** for trading — fed to ChatGPT via one AI engine. Not a conventional journal.

---

## Reading order

| # | Document | Role |
|---|----------|------|
| 1 | [strategic-planning-vision.md](strategic-planning-vision.md) | **Product identity** — four layers, mission |
| 2 | [ai-engineering.md](ai-engineering.md) | **Single AI fleet** — `lib/ai-context.ts`, AI Blocks, inbox |
| 3 | [library-alignment-backlog.md](library-alignment-backlog.md) | Pending doc alignment |
| 4 | [../architecture/matrixtrade-app.md](../architecture/matrixtrade-app.md) | Runtime routes |

**ARGUS:** [`../argus/README.md`](../argus/README.md)

---

## One-sentence identity

> **Playbook → Stock File → Scouting Desk → Trade** — with one copy/import/apply loop for AI (`scout-assessment`, `file-update`).

---

## Code vs vision

| Layer | Route | Status |
|-------|-------|--------|
| Playbook | `/playbook` | Sparse content |
| Stock File | `/stock-theses/[id]` | TSLA pilot |
| Scouting Desk | `/planning` | AI package + inbox types shipped |
| Assistant | `/exchange` | Same `buildAiContextPackage` engine |
| Trade | `/trades` | Frozen for redesign |
