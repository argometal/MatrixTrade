# Library alignment backlog — Matrix strategic vision

**Status:** Partial (updated 2026-07-22).  
**V2 docs:** **Done** as target architecture — see [v2-engine-architecture.md](v2-engine-architecture.md).  
**Program truth:** [runtime-truth.md](runtime-truth.md) · **Queue:** [building-backlog.md](building-backlog.md).

---

## Done (2026-07-22)

- `md/matrix/README.md` — Participation Phase A, MAF/LO/OBS, Control IA status (no longer “docs first” / “Learning pending”)
- `md/matrix/v2-engine-architecture.md` — program progress on Learning / Attribution / phased build (no “late Phase 0”)
- Control IA primary labels + forensic evidence-only already in `control-panel-ia.md` / `runtime-truth.md` / `snapshot-catalog.md`

---

## Done (2026-07-21)

- `md/matrix/runtime-truth.md` refreshed to Scout war room / Trades ledger / Control IA
- `md/matrix/control-panel-ia.md` + `md/rules/ui-naming.md` (Mechanics · Stock Files · Apply · Library; forensic on trade only)
- `md/matrix/snapshot-catalog.md` aligned with Control + trade forensic home

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
| [`md/architecture/data-flow.md`](../architecture/data-flow.md) | Inbox / Control → Apply patch flow for profile |

---

## Priority 2 — Deferred until post-Phase-B code

| Doc | Action |
|-----|--------|
| [`md/protocols/chat-handoff-trading-book.md`](../protocols/chat-handoff-trading-book.md) | Mark superseded by `ai-engineering.md` |
| [`md/design/stock-thesis-proposal.md`](../design/stock-thesis-proposal.md) | Redirect to `stock-profile-design.md` |
| [`md/research/trading-journal-product-research.md`](../research/trading-journal-product-research.md) | Add “Matrix V2 ≠ journal” section |

---

## Code phases (V2 labels — status vs program)

| Phase | Item | Program |
|-------|------|---------|
| B | `MarketEvidence` append + profile synthesis read | Partial |
| C | `Decision` on Scout + Probe | **Shipped** |
| D | Learning outcomes + missed | **Foundation shipped** (`LO-xxx`); Observation UX NEXT |
| E | Attribution + Statistics | **MAF V1 shipped**; Statistics/Coach **not** built |

Also shipped: MTAE + Participation Phase A; Control IA. Do not re-open “docs first” for those.
