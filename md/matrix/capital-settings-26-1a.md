# Capital Settings (26-1A / 26-1C / 26-1E)

**Route:** Settings → Capital (`/settings/capital`)  
**Role:** Configure and prepare account-level capital. Does not persist.

## Separation

| Surface | Role |
|---|---|
| Settings → Capital | Configure sources/policy; prepare Apply proposals; show provenance |
| Control → Apply | Validate and persist |
| Capital Planner (`/planning/capital`) | Consume configured capital; allocations / reservations / availability |
| Matrix Mechanics | Explain rules; point to Settings → Capital (no balances) |
| Ticker snapshots | Never include account balances |

## Mutation discipline

Settings may prepare `capital-configuration-create` / `capital-configuration-update` only.  
Persistence: Control → Apply → Validate → Accept.  
No direct Supabase writes from Settings. Administrative section is inspect-only.

### Create balance / as-of invariants (26-20)

Shared helper: `lib/capital-balance-asof.ts` (create + update).

On **create**:
- If `settledCashBase` is present → `settledCashAsOf` required
- If `settledCashAsOf` is present → `settledCashBase` required
- Same pairing for total equity
- At least one complete pair (cash+as-of **or** equity+as-of)
- `null` invalid; `0` valid; never invent timestamps; never infer cash↔equity

Domain `createCapitalConfiguration` enforces this independently of UI/Apply.

### Update field semantics (26-1E)

| Proposal value | Meaning |
|---|---|
| omitted (not dirty) | Leave persisted value unchanged |
| number (including `0`) | Replace with configured value |
| `null` | Explicitly clear optional field |
| `undefined` | Never emit — not a clear operation |

Applies to: `settledCashBase`, `totalEquityBase`, `liquidityBuffer`, and their as-of timestamps.

### Balance / as-of invariants

- Setting or changing a balance requires a fresh dirty as-of timestamp (never invented).
- Clearing a balance requires clearing its as-of — both emit `null`.
- Clearing only an as-of while the balance remains configured is rejected.
- Configured balance requires configured as-of.
- Liquidity buffer: `0` is valid; `null` means unconfigured (never coerce clear → zero).

## Snapshots (26-1C)

| ID | Mode | Contents |
|---|---|---|
| `capital-settings-status-snapshot` | Default | Status / configured flags only — **balances omitted** |
| `capital-settings-private-snapshot` | Explicit secondary | May include balances; requires UI confirmation |

Neither is auto-attached to Scout / Stock File / Trade / MTAE / Learning / Snapshot General packages.

## Isolated loading (26-1C)

Configuration, Capital Account, store mode, and SQL migration checks load independently.  
A single source failure must not crash the route or invent zero balances.

## Neutrality

No hard-coded issuer, ticker, balance, or account number in infrastructure.
