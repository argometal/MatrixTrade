# External Positions (26-13 / hardened 26-14)

**Status:** Implemented + hardened (domain + Capital Planner surface + Apply).  
**Canonical name:** External Position  
**Surface:** Scouting Desk → Capital Planner (`/planning/capital`)

## Ontology

- External Position is **not** a Trade, Scout, or Stock File.
- It may share a ticker with normal MTA objects without merging identities.
- `experimentEligible = false`, `scoutLinked = false` always.
- Selling / reducing does **not** create MAF attribution or a Trade record.
- A later MTA purchase of the same ticker remains a separate Trade.

## Cost basis

- Declared `costBasisMethod`: **`average_cost` only**.
- FIFO / specific-lot support is **not implemented**.
- Do not imply tax-lot accuracy. Room for lots later without forcing them here.

## Settlement lifecycle

- Sale / reduction creates proceeds with `settlementStatus: pending_settlement`.
- Cash credit requires `external-position-settle` → `settled`.
- A fully sold position may be `closed` while proceeds remain pending settlement (`capitalTreatment: pending_release`).
- After all reductions settle, closed positions move to `capitalTreatment: released`.
- `cumulativeSaleProceeds` is informational only — **never** auto-added into `settledCash` on each snapshot.

## Capital Planner (partial)

Completeness: `partial_external_only`.

Connected (known):

- `investedExternalCapital` (open cost basis)
- `externalMarketValue`
- `pendingSettlementProceeds` / `settledExternalProceeds` (ledger, counted once)

Unconfigured until wired (shown as unconfigured, **not** known zero):

- Scout reservations / reserved capital
- committed capital
- invested Scout capital
- total capital / base equity (unless explicitly supplied)
- deployable / available when prerequisites missing

Pending settlement does **not** increase settled cash.

## Valuation provenance

- `valuationSource` + `lastValuationAt` stored explicitly.
- Updating notes / `reviewAt` does **not** refresh `lastValuationAt`.
- Only a newly supplied `currentPrice` refreshes valuation time.
- UI indicates manual / stale valuation.

## Apply types

Control → Apply → Validate → Accept only:

- `external-position-create`
- `external-position-update`
- `external-position-reduction` — requires `reductionId` or `executionReference` (idempotent)
- `external-position-settle` — settlement credit (once)
- `external-position-exit-plan-update` — `targetShares` ≤ remaining shares; closed ≠ active plan

## Ops

1. Run `supabase/external-positions.sql` in Supabase SQL Editor (prod) — includes 26-14 columns.
2. Local JSON: `data/external-positions.json`.
3. Test: `npm run test:external-positions`.

## Neutral language

Use: External Position · Acquired outside MTA · Excluded from experiment metrics · Capital currently invested · Potential capital release · Pending settlement.

Do not hard-code issuer tickers or employment-share labels in infrastructure, samples, fixtures, or docs. Placeholders: EXT, ABC, XYZ, TEST, EXAMPLE.

Neutrality scan: `tools/scan-external-position-neutrality.ts` (run via `npm run test:external-positions`).
