# ADR-0005 — MTAE Participation Layer

**Status:** Accepted — Phase A **coded** (optional schema fields + validation) (2026-07-22)  
**Decision date:** 2026-07-22  
**Parent:** [mtae-participation-layer.md](mtae-participation-layer.md)  
**Extends:** [adr-0003-mtae.md](adr-0003-mtae.md)

---

## Context

MTAE V1 (ADR-0003) ships multi-TF **geometry**: trend, structure, ranked levels, battle zones, probable vs extended targets, structural invalidation.

That is necessary but incomplete. Charts with similar level maps can hide opposite participation regimes (accumulation vs distribution, confirmed advance vs hollow rally, orderly correction vs squeeze-like thrust).

We need a second MTAE dimension — **participation** — without collapsing MTAE into Scout capital decisions or requiring Level 2 / heatmap vendors.

---

## Decision

1. Add **Participation Layer** as additive optional MTAE schema: per-TF `participation{}` + integrated `participationSynthesis{}`.
2. Keep language probabilistic and anti-overclaim: no `whalesAreBuying`, no absolute candle rules, squeeze/correction as classifications with confidence.
3. **Phase A coded:** volume, wicks, movement character, historical reaction zones, small candle-signal set, large-participant footprint — validate + protocol + sample block.
4. Heatmap and Level 2 remain **deferred to a future Execution Microstructure Engine**.
5. Participation fields are **optional** for backward compatibility; when present they must validate.

---

## Consequences

| Change | Effect |
|--------|--------|
| Types / validate | `lib/mtae-types.ts`, `lib/mtae-validate.ts` |
| Protocol / Mechanics | `lib/mtae-brief.ts`, Mechanics **rev 20** |
| Calibration errorTypes | volume_behavior, movement_character, wick_hierarchy, candle_signal_context, historical_reaction_rank, participant_footprint_overclaim |
| Boundary | MTAE still forbids Entry Solver / RR / Scout verdict / whale identity |
| Scope deferred | Volume profile, AVWAP, heatmap, L2 |

---

## Alternatives considered

| Option | Why rejected |
|--------|--------------|
| Fold participation into Scout | Recouples observation and capital |
| Require heatmap/L2 for V1 | Blocks visual extraction from current chart packs |
| Large Japanese pattern catalog | Noise; low repeatability |
| “Whales buying” boolean | Charts cannot identify actors |

---

## Related

- [mtae-participation-layer.md](mtae-participation-layer.md)
- [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)
- [adr-0003-mtae.md](adr-0003-mtae.md)
- [maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md)
