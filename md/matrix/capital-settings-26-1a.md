# Capital Settings (26-1A)

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

## Opt-in snapshot

`capital-settings-snapshot` is available only from Settings → Capital.  
It is never auto-attached to Scout / Stock File / Trade / MTAE / Learning packages.

## Neutrality

No hard-coded issuer, ticker, balance, or account number in infrastructure.
