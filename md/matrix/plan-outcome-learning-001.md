# Plan Outcome · Counterfactual Learning (CURSOR-MTA-PLAN-OUTCOME-LEARNING-001)

## Distinction

| Layer | Measures |
|-------|----------|
| **Plan outcome** | What happened to the *approved setup* (entry/stop/target triggers, theoretical R) |
| **Realized trade result** | Account performance from real fills only |
| **MAF** | Which decision components were responsible (explicit attribution) |
| **Learning aggregates** | Deterministic sums across those layers — **without mixing** theoretical plan R into `realizedTradeR` |

Automatic execution remains **disabled** (`automaticExecutionEnabled = false` in `lib/plan-outcome-types.ts`).  
`armed` means alerts/order parameters are prepared — **not submitted**. Human confirmation remains mandatory.

Pipeline:

```
Plan → Plan Outcome → Counterfactual Observation → MAF Attribution → Learning Aggregates
```

Neutral label for unexecuted triggered plans: **`triggered_unexecuted_plan`** (not “missed loss”).

---

## Apply block: `plan-outcome`

One mutation only. Validate → preview → Accept before persistence.

```json
{
  "type": "plan-outcome",
  "proposal": {
    "planId": "PLAN-001",
    "status": "theoretical_loss",
    "tradeExecuted": false,
    "entryTriggered": true,
    "stopTriggered": true,
    "targetTriggered": false,
    "theoreticalResultR": -1,
    "realizedResultR": 0,
    "outcomeSource": "counterfactual_observation",
    "evidenceStatus": "verified",
    "notes": "...",
    "evidenceRefs": []
  }
}
```

Also available from Planning → **Record Outcome** for terminal/expired plans.

### Validation rules

- `theoretical_loss` ⇒ `entryTriggered:true` + `stopTriggered:true`
- `theoretical_win` ⇒ `entryTriggered:true` + `targetTriggered:true`
- `tradeExecuted:false` ⇒ `realizedResultR:0`
- `invalidated_before_entry` ⇒ `entryTriggered:false`
- Contradictory combinations fail validation
- Never invent prices, fills, event order, or R from free text
- UI requires explicit human confirmation for entry/stop/target triggers
- A theoretical loss must **not** create a real Trade or modify account P&L

After save: persist `outcome.recordedAt`, close `evaluate_expired_plan`, seed counterfactual OBS / LO when required. Derived MAF tasks may remain open independently.

---

## Learning metric formulas

Implemented in `lib/learning-plan-aggregates.ts`.

| Metric | Formula |
|--------|---------|
| `evaluatedPlanCount` | Plans with `outcome.recordedAt` |
| `triggeredPlanCount` | Evaluated with `entryTriggered === true` |
| `untriggeredPlanCount` | Evaluated with `entryTriggered === false` or `status === entry_not_triggered` |
| `theoreticalPlanWins` | `status === theoretical_win` |
| `theoreticalPlanLosses` | `status === theoretical_loss` |
| `theoreticalPlanBreakevens` | `status === theoretical_breakeven` |
| `theoreticalPlanR` | Sum of `theoreticalResultR` across supported evaluated plans |
| `realizedTradeR` | Sum R from **real executed trades only** — never counterfactual plan R |
| `thesisEvaluationCount` | MAF records with conclusive `thesis_quality` |
| `thesisFailureCount` | MAF where `thesis_quality === failure` |
| `thesisFailureRate` | `thesisFailureCount / thesisEvaluationCount` |
| `triggeredPlansWithoutTrade` | `entryTriggered === true` and `tradeExecuted === false` |
| `executionOmissionCount` | MAF `execution_quality` weak/failure **and** tag `approved-plan-not-staged` (or controlled equivalent) |

Do **not** infer execution omission solely because there was no trade.

### Segmentation filters

`ticker`, `playbookId`, `stockFileId`, date range (`recordedAt` / `closedAt`), thesis classification, `tradeExecuted`, outcome status.

---

## Ops SQL

- `supabase/observations-counterfactual.sql` — counterfactual OBS columns
- `supabase/trade-plans-execution-readiness.sql` — readiness enum column
- `supabase/learning-outcomes.sql` — durable Learning Outcomes (required on Vercel)

Plan outcome itself persists in existing `trade_plans.outcome` jsonb.  
Learning Outcomes: Supabase in production; JSON local; memory in tests.  
Migrate: `npm run migrate:learning-outcomes-to-supabase` (dry-run default).  
Existing plans without outcome and historical trades are unchanged.

---

## Tests

`npm run test:plan-outcome-learning` → `tools/test-plan-outcome-learning-001.ts`

Covers: theoretical loss without trade; entry_not_triggered; real trade loss (no double count); MAF thesis failure; plan metrics without MAF thesis update.

---

## Remaining limitations

- Learning aggregates are computed in code; no dedicated Control Learning dashboard surface yet
- `execution_readiness` Supabase column requires running the SQL migration before remote writes include it
- Counterfactual OBS columns require `observations-counterfactual.sql` on Supabase
- No automatic broker fills; `automaticExecutionEnabled` stays false
- MAF component classifications are never derived automatically from outcome status
