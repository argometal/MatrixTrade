# ADR-0003 — Matrix Technical Analysis Engine (MTAE)

**Status:** Accepted (2026-07-21)  
**Decision date:** 2026-07-21  
**Parent:** [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)

---

## Context

MatrixTrade mixed **chart observation** (structure, zones, targets, invalidation) with **capital decisions** (Entry Solver, minimum R, Scout go/wait/no) inside the same chat improvisation. That produced inconsistent Stock Files and Scouts across tickers.

We need a **reproducible technical procedure** that any external AI can execute, that Matrix can Accept into a Stock File, and that humans can calibrate — without the engine allocating capital.

---

## Decision

1. Introduce **MTAE** as a first-class module: multi-timeframe technical assessment → structured JSON only.
2. **MTAE does not decide capital.** Scout / Matrix rules consume MTAE output later.
3. Timeframe **roles are configurable** (`strategic_tf`, `opportunity_tf`, `refinement_tf`, `execution_tf`) — not hard-coded to 6M→3M→1M→1W.
4. Ship AI Block `technical-assessment` (Apply → store assessment + patch Stock File synthesis). Optional `technical-calibration` stores human procedure corrections.
5. Optimize for **consistency** (same charts ≈ same schema-shaped conclusions), not agreement with a preferred trade.

---

## Consequences

| Change | Effect |
|--------|--------|
| New types + JSON stores | `lib/mtae-*.ts`, `data/mtae-*.json` |
| New AI blocks | `technical-assessment`, `technical-calibration` |
| Stock File | Levels / invalidation / historicalAnalysis can be filled from assessment Accept |
| Mechanics brief | Documents MTAE vs Scout boundary |
| Scope deferred | No chart OCR, no auto Scout GO, no Entry Solver inside MTAE |

---

## Alternatives considered

| Option | Why rejected |
|--------|--------------|
| “Better TA prompt” only | No schema, no Accept path, no calibration loop |
| Fold TA into Scout decision | Recouples observation and capital |
| Hard-code 6M-3M-1M-1W | Couples engine to one trading style |

---

## Related

- [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)
- [stock-profile-design.md](stock-profile-design.md)
- [scout-execution-model.md](scout-execution-model.md)
- [control-panel-ia.md](control-panel-ia.md)
