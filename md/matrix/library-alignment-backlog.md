# Library alignment backlog — Matrix strategic vision

**Status:** Partial (2026-07-10).  
**V2 docs:** **Done** — see [v2-engine-architecture.md](v2-engine-architecture.md).

---

## Done (2026-07-10)

- `md/matrix/v2-engine-architecture.md`
- `md/matrix/stock-profile-design.md`
- `md/matrix/scout-execution-model.md`
- `md/matrix/runtime-truth.md`
- `md/matrix/ai-engineering.md` + unified `lib/ai-context.ts`
- Design UI checklists **removed**
- Scouting Desk naming; AI scout-assessment / file-update

---

## Priority 1 — Still pending

| Doc | Action |
|-----|--------|
| [`MATRIX-v2-VISION.md`](../../MATRIX-v2-VISION.md) | Point to V2 engines; demote journal framing |
| [`md/architecture/system-overview.md`](../architecture/system-overview.md) | Evidence → Profile → Scout → Trade diagram |
| [`md/architecture/matrixtrade-app.md`](../architecture/matrixtrade-app.md) | Map routes to engines |
| [`md/architecture/data-flow.md`](../architecture/data-flow.md) | Inbox patch flow for profile |

---

## Priority 2 — Deferred until post-Phase-B code

| Doc | Action |
|-----|--------|
| [`md/protocols/chat-handoff-trading-book.md`](../protocols/chat-handoff-trading-book.md) | Mark superseded by `ai-engineering.md` |
| [`md/design/stock-thesis-proposal.md`](../design/stock-thesis-proposal.md) | Redirect to `stock-profile-design.md` |
| [`md/research/trading-journal-product-research.md`](../research/trading-journal-product-research.md) | Add “Matrix V2 ≠ journal” section |

---

## Code phases (documented in V2 — implement after sign-off)

| Phase | Item |
|-------|------|
| B | `MarketEvidence` append + profile synthesis read |
| C | `Decision` on Scout + Probe |
| D | Learning outcomes + missed |
| E | Attribution + Statistics |
