# War Menu (PROMPT 15-06)

**Status:** Canonical.  
**Predicate:** `isWarReadyScoutPlan` in `lib/plan-helpers.ts`.

## Ontology

| Concept | Meaning |
|---------|---------|
| Stock File | Strategic target (survives closed battles) |
| Scout Plan | Individual battle / tactical window |
| **War Menu** | Currently fightable battles (Case + allocation) |
| Outcome | Result of that battle (`outcome.recordedAt`) |
| Learning | Archive / Insights after the fight |

## Rule

War-ready iff `status ∈ {watching, ready}` **and** `outcome.recordedAt` is absent.

Terminal outcomes (`missed_opportunity`, `unexecuted_plan_loss`, …) leave the War Menu automatically. Data is not deleted.

## Consumers

Must use `isWarReadyScoutPlan` — Case dropdown, allocation board, active scout monetary table, trade prospects, Control activePlanCount, Stock File active plan select, AI “active_scouts” snapshots / focus pick.

Must **not** use it — Learning queue, Insights LO aggregates, Trades Review, plan-outcome derive, scout-plan-repair linked-active (`entered`), apply-verify.
