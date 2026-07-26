# Capital Planner foundation (26-15)

**Status:** Implemented (Model A cash-ledger foundation).  
**Surface:** `/planning/capital`

## Architecture audit (pre-26-15)

| Concept | Prior state |
|---|---|
| External Position ledger + settlement | Connected |
| Capital Account snapshot | Skeleton; `partial_external_only` |
| `totalCapital` → `settledCash` fallback | Incorrect — removed |
| Missing MV → cost basis fallback | Incorrect — removed |
| Scout reservations | Not persisted |
| Invested Scout capital | Not wired to open Trades |
| Capital configuration | None |
| Generic capital ledger | Only EP reduction settlement fields |
| Dashboard “Equity curve” | Experiment cumulative closed-trade P/L; monthly loss cap used for scale |

## Selected accounting model: Model A — `cash_ledger`

**Rationale:** When a Trade is funded, settled cash should already decline. Therefore:

- `availableCapital = deployableCapital`
- `investedScoutCapital` is **informational** (equity / allocation view), not a second cash subtraction
- `settledCash` never derives from `totalEquity`

### Canonical formulas

```
settledCash =
  settledCashBase
  + (externalCreditsIncludedInCash ? 0 : settled external ledger credits)

deployableCapital =
  max(0, settledCash - reservedCapital - committedCapital - liquidityBuffer)

availableCapital = deployableCapital   // Model A
```

Pending settlement never counts as cash. Potential external release never counts as available capital.

## Entities

- `CapitalConfiguration` — single active config (`accountingModel: cash_ledger`)
- `CapitalLedgerEvent` — idempotent ledger; settled amounts immutable; reversals are separate events
- `CapitalReservation` — Scout/Plan capital hold; Apply-only; does not create Trades

## Completeness

`CapitalAccountCompleteness.status`: `unconfigured | partial | operational | reconciled`

`operational` = cash source + liquidity buffer + reservation/committed/invested Scout sources allow funding evaluation.

## Neutrality

No issuer/ticker hard-coding in infrastructure. Placeholders: ABC, XYZ, EXT, EXAMPLE.  
Scan: `tools/scan-external-position-neutrality.ts` + capital-planner scan targets.

## Remaining unconfigured until wired

- Broker live cash / equity feeds (`source: broker_snapshot` not integrated)
- Automatic reservation on Scout approval (explicit Apply only)
- Multi-account support
- FIFO / tax-lot External Position basis
- Full ledger reconciliation workflow beyond `reconciled` flag
