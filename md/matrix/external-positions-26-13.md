# External Positions (26-13)

**Status:** Implemented (domain + Capital Planner surface + Apply).  
**Canonical name:** External Position  
**Surface:** Scouting Desk → Capital Planner (`/planning/capital`)

## Ontology

- External Position is **not** a Trade, Scout, or Stock File.
- It may share a ticker with normal MTA objects without merging identities.
- `experimentEligible = false`, `scoutLinked = false` always.
- Selling / reducing does **not** create MAF attribution or a Trade record.
- A later MTA purchase of the same ticker remains a separate Trade.

## Capital Planner

External Positions contribute to:

- `investedExternalCapital` (open cost basis)
- total invested capital views
- potential future capital release (market value informational)

They do **not** contribute to:

- monthly risk used / authorizedRiskAmount / Scout R
- Playbook win/loss, MAF, missed Scout statistics

Market value is never available cash. Only realized proceeds from reduction/close increase `settledCash` / deployable capital.

## Apply types

Control → Apply → Validate → Accept only:

- `external-position-create`
- `external-position-update`
- `external-position-reduction`
- `external-position-exit-plan-update`

## Ops

1. Run `supabase/external-positions.sql` in Supabase SQL Editor (prod).
2. Local JSON: `data/external-positions.json`.
3. Test: `npm run test:external-positions`.

## Neutral language

Use: External Position · Acquired outside MTA · Excluded from experiment metrics · Capital currently invested · Potential capital release.

Do not use employment / compensation share labels.
