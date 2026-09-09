# 30-2C — Insights Pipeline Performance (architecture)

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


## Existing Insights tabs (`/stats`)

| Tab | Component | Data |
|-----|-----------|------|
| Statistics | `PreviewStats` | Trades, experiment, monthly risk, playbook stats (`loadStatsPageData`) |
| Journal | `PreviewJournal` | Closed trades + playbooks |
| Mistakes | `PreviewMistakes` | `computeMistakeStats(trades)` |

## Reusable aggregators / stores

- Trades: `getTrades` (`lib/storage`)
- Plans: `getPlans` (`lib/plans`)
- Learning Outcomes: `getLearningOutcomes` (`lib/learning-outcome-store`)
- Observations: `getObservations` (`lib/observation-store`)
- MAF: `getMafExperiments` (`lib/maf-store`, JSON file — no new table)
- Scout LO aggregates: `computeScoutLearningAggregates` (`lib/learning-scout-aggregates`)
- Plan aggregates: `computeLearningPlanAggregates` (`lib/learning-plan-aggregates`)
- MAF components: `MAF_COMPONENT_IDS` / `primaryDragComponent` (`lib/maf-types`)

## Missing connections (before 30-2C)

Insights never loaded LO / OBS / MAF / Plans. Pipeline Performance wires them into a new hub tab only.

## Canonical field gaps

| Datum | Status |
|-------|--------|
| Executed win/loss, missed, UPL, cancelled, expired | Present on Learning Outcome `kind` |
| Counterfactual vs realized R/P/L | Present on LO (`counterfactualR` vs `realizedR` / `realizedPnL`) |
| Pipeline components | Present on MAF attributions + `primaryDragComponent` |
| Pending observations | `ObservationRecord.status === "observing"` |
| Cancelled plan status | Plans use `skipped` (no `cancelled`); LO kind `cancelled` is authoritative when present |
| MAF durable Supabase table | Absent (JSON store). **Not required** for this tab — reuse file store. No new table. |

## Future simplification note

Mistakes may become a cross-tab filter on Insights rather than a full tab. Journal and Mistakes are preserved unchanged for now.

## Implementation

New pure selector `computePipelinePerformance` composes LO + plans + OBS + MAF. No new route, no schema/Apply changes.
