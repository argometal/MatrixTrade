# Unexecuted Plan Loss (CURSOR-MTA-PLAN-OUTCOME-UPL-25-29)

## Canonical distinction

| Layer | Measures |
|-------|----------|
| **Trade** | Financial truth (fills, account P/L) |
| **Scout outcome** | Tactical plan truth (entry/stop/target event order) |
| **Learning Outcome** | Normalized Scout/Trade result (`unexecuted_plan_loss`) |
| **Observation** | Measurable path evidence after the event |
| **MAF** | Accepted component attribution (never automatic from UPL) |
| **Stock File** | Strategic thesis — **not** invalidated by one Scout loss |

## Apply: `plan-outcome`

```json
{
  "type": "plan-outcome",
  "proposal": {
    "planId": "PLAN-001",
    "outcomeKind": "unexecuted_plan_loss",
    "entryReached": true,
    "stopReachedBeforeTarget": true,
    "targetReachedBeforeStop": false,
    "nonExecutionReason": "order_not_staged",
    "notes": "..."
  }
}
```

### Server-derived (never trust AI)

- `realizedR = 0`
- `realizedPnL = 0`
- `counterfactualR = -1`
- `counterfactualDollarResult = -authorizedRiskAmount` only when persisted; else `null`

### Validation

- Plan exists, terminal/eligible, no linked Trade/fill
- Geometry: plannedEntry + stopPrice + targetPrice persisted
- Event-order booleans as above + `nonExecutionReason`
- Reject contradictory combinations and nonzero realized without Trade
- Idempotent re-Accept of the same outcome; reject conflicting duplicate

### After Accept

- `plan.outcome.recordedAt` set → closes `evaluate_expired_plan`
- LO `unexecuted_plan_loss`, `concluded`, `planId` only (no `tradeId`)
- No fictitious Trade; Trade metrics unchanged
- Observation may seed; **MAF is a separate later action**

## Scout metrics (`lib/learning-scout-aggregates.ts`)

| Metric | Formula |
|--------|---------|
| `evaluatedScoutCount` | Scout LOs excluding `excludedFromMetrics` |
| `unexecutedPlanLossCount` | `kind=unexecuted_plan_loss` && not excluded |
| `counterfactualScoutR` | Sum `counterfactualR` across eligible Scout LOs |
| `triggeredPlansWithoutTrade` | `entryReached` && no `tradeId` |

Thesis failure counts **only** from accepted MAF `thesis_quality=failure`.

## Non-execution reasons

`order_not_staged` · `discretionary_skip` · `operational_unavailable` · `alert_missed` · `broker_rejection` · `insufficient_buying_power` · `unknown`

Evidence for later MAF — not accepted `execution_quality`.

## Tests

`npm run test:plan-outcome-upl`
