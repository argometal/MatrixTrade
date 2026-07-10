# Monthly risk vs experiment cycle

**Status:** Runtime truth (Phase 1 + carryover toggle, 2026-07-10)

MatrixTrade tracks **two independent risk dimensions**. They must not be conflated.

---

## 1. Monthly loss cap (hard gate)

**Purpose:** Protect the account. Never lose more than the configured amount in a calendar month.

| Field | Meaning | Example |
|-------|---------|---------|
| `monthlyLossLimit` | Base cap (positive USD in rules; negative in legacy) | `300` |
| `carryoverEnabled` | Toggle on `/system` — include prior month unused budget | `true` |
| `carryoverIn` | Unused budget after prior gross losses ($300 − $202 ≈ $98) | `97.56` |
| `monthlyRoomCap` | **Display:** budget + carryover (not minus spent) | `510.36` |
| `lossUsedThisMonth` | Gross losses closed this calendar month | `0` |
| `monthlyLossRoom` | **Risk gate:** allowance minus spent (blocks new trades) | `510.36` |
| `monthlyRealizedPnL` | Net P/L closed this month (display) | `0` |

### Formulas

```
monthKey            = YYYY-MM from trade.closedAt (UTC)
lossUsedThisMonth   = sum(|result|) for losing trades closed this month  [gross]
priorGrossLosses    = sum(|result|) for losing trades closed in all months before current month
carryoverIn         = max(0, baseCap - priorGrossLosses)   if any closed trades before this month, else 0
                      (ignored when carryoverEnabled = false)
monthlyAllowance    = baseCap + carryoverIn
monthlyRoomCap      = monthlyAllowance                    [dashboard tile]
monthlyLossRoom     = monthlyAllowance - lossUsedThisMonth [validation / alerts]
monthlyCapBreached  = lossUsedThisMonth >= monthlyAllowance

perTickerPnL        = sum(closed results for same ticker, all experiment)
tickerCapBreached   = perTickerPnL <= maxLossPerTicker (-250)
```

### Carryover toggle

| Setting | Allowance | Dashboard *Monthly room left* |
|---------|-----------|-------------------------------|
| **Enabled** | `baseCap + carryoverIn` | Shows budget + carryover |
| **Disabled** | `baseCap` only | Shows base cap only |

Persisted in `data/rules.json` as `carryoverEnabled` (default `true`).

### Close date (`closedAt`)

Monthly bucketing uses **`closedAt`**, not entry date.  
Editable on `/trades/[id]` — correct month assignment if a trade was closed on the wrong date.

### Example (July 2026 — H001 Jan + H002 Jun)

| | Amount |
|---|--------|
| Base cap | $300 |
| Prior gross losses (all months before July) | $202.44 |
| Carryover | **$97.56** ($300 − $202.44 ≈ **$98**) |
| July gross loss | $0 |
| **Monthly room left (display)** | **$397.56** ($300 + $97.56) |

If there are **no closed trades before this month**, carryover = **$0**.

### Rules

- Resets automatically on the **1st of each calendar month** (UTC month key `YYYY-MM`).
- **Blocks new trades** when `monthlyCapBreached` is true.
- Closing existing open trades is still allowed.
- Does **not** end the experiment.

### Dashboard labels

| Tile | Value |
|------|-------|
| Monthly budget | Base cap |
| Carryover | `carryoverIn` (or hidden effect when disabled) |
| Spent this month | Gross losses this month |
| Monthly room left | `monthlyRoomCap` (budget + carryover) |
| This month P/L | Net realized P/L this month |

---

## 2. Lab metrics (informational)

**Purpose:** Track performance across all closed trades. No sample-size cap.

| Field | Meaning |
|-------|---------|
| `closedTrades` | Total closed in lab |
| `realizedPnL` | Net P/L all closed trades |
| `maxLossPerTicker` | Per-symbol cumulative loss gate |

### Rules

- Lab **never stops** at a trade count — you use as much history as is useful.
- P/L and stats are **informational** — monthly cap blocks new risk, not data accumulation.
- Trade IDs (`H001`, `H031`, …) are labels only.

### Optional future: lab segments

See `md/concepts/deferred-matrixtrade.md` — tag subsets (`experimentId`) for inflection reviews without limiting total trades.

---

## 3. What was wrong before

The old model used a single `cycleLossLimit = -300` tied to the experiment:

```
remainingLossBudget = cycleLossLimit - realizedPnL   // all-time experiment P/L
```

Problems:

1. Treated experiment loss budget as if it were monthly — it never reset.
2. Conflated “stop losing money this month” with “finish H001–H030 sample”.
3. `maxTrades = 30` was hard-coded in docs and not editable in UI.
4. Wrong `closedAt` attributed losses to the wrong month.
5. Carryover could not be disabled.

---

## 4. Implemented

- [x] `monthlyLossLimit` in `data/rules.json`
- [x] `carryoverEnabled` toggle on `/system`
- [x] `computeMonthlyRisk()` — filters by `closedAt` month
- [x] `monthlyRoomCap` display separate from `monthlyLossRoom` gate
- [x] Validation blocks on **monthly** cap only
- [x] Dashboard monthly tiles + experiment progress
- [x] Close date edit on trade detail
- [x] Bridge snapshot includes `monthly` block

---

## 5. Deferred (concepts)

See `md/concepts/deferred-matrixtrade.md`:

- [ ] `experimentId` + “Start new experiment”
- [ ] Monthly history chart (last 6 months)
- [ ] Optional soft warning when experiment sample complete but monthly room remains

---

## 6. Config (`data/rules.json`)

```json
{
  "monthlyLossLimit": -300,
  "maxLossPerTicker": -250,
  "maxTrades": 30,
  "carryoverEnabled": true,
  "obsidianVault": "TradingVault",
  "obsidianVaultPath": "vault",
  "tradesFolder": "Trades"
}
```

`cycleLossLimit` is deprecated; on read it maps to `monthlyLossLimit`.
