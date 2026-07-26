# Capital Settings (26-1A / 26-1C)

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

### Updates (26-1C)

`capital-configuration-update` proposals include:

- `id`
- only fields the user actually changed (dirty-field tracking)

Changing settled cash or total equity requires a matching fresh as-of timestamp.  
Timestamps are never invented automatically.  
Explicit clearing of optional as-of fields emits `null` only when that field is dirty.

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
