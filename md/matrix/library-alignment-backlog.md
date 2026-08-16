# Library alignment backlog — Matrix strategic vision

**Status:** Partial (updated 2026-08-16).  
**V2 docs:** **Done** as target architecture — see [v2-engine-architecture.md](v2-engine-architecture.md).  
**Program truth:** [runtime-truth.md](runtime-truth.md) · **Queue:** [building-backlog.md](building-backlog.md).

**Metrics planteamiento (AI handoff):** [metrics-analysis-planteamiento-handoff.md](metrics-analysis-planteamiento-handoff.md) — tres ledgers Trade / Scout counterfactual / Pipeline.

**Scout → Trades pipeline (proposal):** [scout-trades-pipeline-001.md](scout-trades-pipeline-001.md) — Scouts as pipeline units; miss realized P/L = 0; sample-quality filter before expectancy.

**Scout Learning circuit audit + P0:** [scout-learning-circuit-audit-handoff.md](scout-learning-circuit-audit-handoff.md) — alcance acotado, evidencia obligatoria, PLAN P0 (aggregates + discovery + Retry Sync).

**Market data / Volume Profile (16-06 diagnosis):** [market-data-volume-profile-16-06.md](market-data-volume-profile-16-06.md) — **Now:** VP for MTA Swing (Alpaca Free candidate). **Future debt:** L2 / order book / heatmaps for scalping. No Alpaca code until review.

---

## Done (2026-08-16)

- `md/matrix/market-data-volume-profile-16-06.md` — full repo audit + Alpaca Free limits + minimal integration proposal (docs only)
- `md/matrix/building-backlog.md` — Now VP vs Future L2 branches separated
- `md/matrix/mtae-participation-layer.md` + ADR-0005 / MTAE engine — Phase B (VP) vs Phase C (microstructure) clarified against 16-06

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
