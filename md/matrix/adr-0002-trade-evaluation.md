# ADR-0002 — TradeEvaluation (analytical lifecycle)

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
If conflict or ambiguity exists, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
Verify the result.


| Field | Value |
|-------|-------|
| **Status** | Accepted — **implemented** |
| **Date** | 2026-07-11 |
| **Supersedes** | [ADR-0001](adr-0001-trade-lifecycle-v1.md) *implementation approach* (dual fields on `Trade`) |
| **Scope** | MatrixTrade execution + learning boundary |

---

## Context

ADR-0001 correctly identified the problem: **financial close ≠ analytical conclusion**.

Implementing `analysisStatus`, `observationUntil`, and outcome fields **on `Trade`** would pollute every trade query, dashboard, and P/L path with analytical state.

## Decision

Split responsibilities:

### Trade (financial execution)

| Field | Role |
|-------|------|
| `status` | `pending` \| `open` \| `closed` |
| `openedAt` | Position open timestamp |
| `closedAt` | Position flat — P/L frozen |
| `exitReason` | Why the position closed |
| `planId` | Optional link to scout (`PLAN-xxx`) |

### TradeEvaluation (analytical lifecycle)

| Field | Role |
|-------|------|
| `tradeId` | 1:1 with closed trade case |
| `planId` | Inherited from trade when present |
| `expectedHorizonDays` | From playbook (default 90) |
| `observationEndsAt` | `closedAt + maximumObservationDays` |
| `status` | `pending` \| `observing` \| `concluded` |
| `thesisOutcome` | `validated` \| `invalidated` \| `inconclusive` |
| `timingOutcome` | `on_time` \| `early` \| `late` \| `inconclusive` |
| `executionOutcome` | `clean` \| `acceptable` \| `poor` \| `inconclusive` |
| `finalLesson` | Structured learning artifact |

**Storage:** `data/trade-evaluations.json` (local mode).

### Playbook horizons

| Field | Default |
|-------|---------|
| `expectedHorizonDays` | 90 |
| `maximumObservationDays` | 120 |

---

## Lifecycle rules

1. **Probe convert → Trade** — `createTradeFromProbePlan()` creates open trade, links `planId`, sets scout `linkedTradeId`.
2. **Trade close** — `closeTrade()` sets financial close, then `startObservationForTrade()` creates evaluation with `status: observing`.
3. **Manual conclude** — analyst submits outcomes before window ends.
4. **Auto-conclude** — on read, if `now >= observationEndsAt` and still `observing`, status becomes `concluded` with `inconclusive` defaults.

A trade is a **finished learning case** only when its `TradeEvaluation.status === "concluded"`.

---

## Code map

| Piece | Location |
|-------|----------|
| Types | `lib/trade-evaluation-types.ts` |
| Storage + hooks | `lib/trade-evaluation.ts` |
| Probe → trade | `lib/probe-to-trade.ts` |
| Close hook | `lib/storage.ts` → `startObservationForTrade` |
| UI — conclude | `PreviewTradeDetail.tsx` |
| UI — probe convert | `PreviewPlanning.tsx` |
| Actions | `convertProbeAction`, `concludeTradeEvaluationAction` |

---

## Not in scope (v1)

- `ScoutEvaluation` / missed-opportunity object
- Learning Engine aggregation
- Supabase persistence for evaluations (JSON only)
- MFE/MAE post-exit tracking

---

## Related

- [scout-execution-model.md](scout-execution-model.md)
- [runtime-truth.md](runtime-truth.md)
- [adr-0001-trade-lifecycle-v1.md](adr-0001-trade-lifecycle-v1.md) — conceptual dual lifecycle (design reference)
