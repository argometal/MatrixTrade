# Operational Scout states + monitoring and review workflow (29-27 / 29-28 / 29-29)

## Diagnosis
`plannedRR` and decision verdict answered different questions but were being displayed as if they were the same operational status. This made stale or expired Scouts still look attractive.

## Selected architecture
- Keep **decision verdict** (`wait|probe|go|no`) separate
- Add **operational assessment** as the confirmed/manual classification
- Detect a separate **system-derived assessment** through a pure engine
- Persist confirmed operational state inside the latest decision snapshot so it remains Apply-gated without introducing a second write path

## Scope shipped
- Canonical operational types, reason codes, policy constants, alerts
- Pure evaluation engine and monitoring grouping
- `decision-update.operationalAssessment` validation + persistence
- Scout selector/detail now shows operational state / action / executable R
- Quick operational updates prepare Apply JSON only
- Dashboard monitoring surface added
- Trades: stronger non-executed / review framing

## Important boundaries
- No automatic Scout mutation from Dashboard
- No fake market prices, ATR, fills, or missed inference without history
- `plannedRR` remains the original geometry
- `currentExecutableRR` is distinct and may be unavailable
- Prepared updates still require Control → Apply → Validate → Accept

## Known limitations
- No historical market provider yet, so many live cases remain `unassessed` unless date/readiness/history evidence exists
- Replacement-plan lineage fields are runtime/domain-only for now; no new durable top-level DB columns were added in this pass
- Dashboard actions link/copy into existing flows; they do not create a new dedicated workflow surface
