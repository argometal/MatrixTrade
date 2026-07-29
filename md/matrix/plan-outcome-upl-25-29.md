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

### `expired_window` (PROMPT 29-02)

Closes only the tactical Scout Plan validity window when it ended without execution.
Does **not** imply loss, miss, cancellation, thesis invalidation, or opportunity termination.

```json
{
  "type": "plan-outcome",
  "proposal": {
    "planId": "PLAN-002",
    "outcomeKind": "expired_window"
  }
}
```

- Required: `planId`, `outcomeKind: expired_window`
- Do **not** require: `entryReached`, `stopReachedBeforeTarget`, `targetReachedBeforeStop`, `nonExecutionReason`
- Server: `realizedR=0`, no counterfactual loss, plan status stays `expired`, no Trade
- Learning Outcome kind: `expired` (label: Execution window expired) — not `missed_opportunity` / `cancelled` / `executed_loss`
- Needs Attention `evaluate_expired_plan` completes when `outcome.recordedAt` is set
- Stock File may remain active; a new Scout Plan may be created on the same Stock File
- Historical expired plans are **not** auto-mutated — only explicit Apply

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
- `learningSyncStatus` starts `pending`; `syncPlanOutcomeLearning` must reach `complete`
- LO `unexecuted_plan_loss`, `concluded`, `planId` only (no `tradeId`)
- No fictitious Trade; Trade metrics unchanged
- Observation linked; **MAF is a separate later action**
- If sync fails: Apply reports partial failure; Needs Attention `sync_plan_outcome_learning` + Planning **Retry Learning Sync**

### Learning Outcome durability

Prod/Vercel: Supabase `public.learning_outcomes` (`supabase/learning-outcomes.sql`).  
Local: `data/learning-outcomes.json`. Tests: memory.  
No silent JSON fallback when Supabase is selected.  
Migrate: `npm run migrate:learning-outcomes-to-supabase` (dry-run) · `-- --apply`.

### Execution readiness (unchanged)

`approved → armed → alert → human confirmation → submitted`  
Armed = parameters + alert prepared, **not transmitted**.  
`automaticExecutionEnabled = false`.

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
`npm run test:plan-outcome-expired-window`
