# ADR-0004 — Matrix Attribution Framework (MAF)

**Status:** Accepted (2026-07-21)  
**Decision date:** 2026-07-21  
**Parent:** [maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md)

---

## Context

Matrix already closes the financial loop (`Trade`) and starts an analytical window (`TradeEvaluation`, ADR-0002). Human review (`trade-review`) captures quality scores and mistakes.

None of that answers: **which component of the decision pipeline is responsible for long-term expectancy change?**

P/L alone is not process quality. A losing trade may still have a correct thesis and zone with a premature entry or a stop that was too tight. A winning trade does not validate every component.

We need a learning subsystem that sits after Trade:

```text
Playbook → Stock File → Scout Plan → Trade → Attribution Engine (MAF)
```

---

## Decision

1. Introduce **MAF** as a first-class module: measurable evidence → component attribution → suggested improvement.
2. The **atomic learning record** is the full experiment lifecycle (Scout → Trade or Missed Fill → Close → Observation → Attribution), not a lone P/L row.
3. **Deterministic code** owns prices, dates, R, event order, and derived evidence fields. **AI** proposes attributions and explanations; humans approve strategic interpretation.
4. Ship AI Block `attribution` (Apply → store experiment + component rows). Optional evidence supplements via the same block when observation metrics are supplied (never invented).
5. Initial components are fixed and extensible without redesign: thesis, zone, entry, stop, execution, trade management, timing, capital allocation.
6. Each AI attribution includes `aiInterpretationConfidence` (0–100) — confidence in interpreting available evidence, **not** a statistical probability.

---

## Consequences

| Change | Effect |
|--------|--------|
| New types + JSON store | `lib/maf-*.ts`, `data/maf-experiments.json` |
| New AI block | `attribution` |
| Extends ADR-0002 | Links to `tradeId` / `TradeEvaluation`; does not replace financial Trade or human review scores |
| Mechanics brief | Documents MAF vs journal vs TradeEvaluation |
| Scope deferred | Aggregated expectancy dashboards, ScoutEvaluation-only objects, confidence calibration, Supabase for MAF |

---

## Alternatives considered

| Option | Why rejected |
|--------|--------------|
| Enrich `trade-review` quality scores only | Still journals process feelings; no component attribution architecture |
| Put attribution fields on `Trade` | Pollutes P/L paths (same reason ADR-0002 split evaluation) |
| AI as source of truth for MFE/MAE/R | Violates Matrix external-AI policy; invents numbers |

---

## Related

- [maf-matrix-attribution-framework.md](maf-matrix-attribution-framework.md)
- [adr-0002-trade-evaluation.md](adr-0002-trade-evaluation.md)
- [adr-0001-trade-lifecycle-v1.md](adr-0001-trade-lifecycle-v1.md)
- [runtime-truth.md](runtime-truth.md)
