# Monthly risk vs experiment cycle

**Status:** Proposal + Phase 1 implementation (2026-07-09)

MatrixTrade tracks **two independent risk dimensions**. They must not be conflated.

---

## 1. Monthly loss cap (hard gate)

**Purpose:** Protect the account. Never lose more than the configured amount in a calendar month.

| Field | Meaning | Example |
|-------|---------|---------|
| `monthlyLossLimit` | Max loss allowed this month (negative USD) | `-300` |
| `monthlyRealizedPnL` | Accrued closed-trade P/L in the current month | `-202.44` |
| `monthlyLossRoom` | Dollars you can still lose before the cap | `97.56` |

### Formulas

```
monthlyRealizedPnL = sum(closed trade results where closedAt is in current calendar month)
unusedPrevMonth    = max(0, baseCap - losses_in_previous_calendar_month)
carryoverIn        = unusedPrevMonth
effectiveCap       = baseCap + carryoverIn          (e.g. 300 + 98 = 398)
monthlyLossRoom    = effectiveCap - losses_this_month
monthlyCapBreached = monthlyRealizedPnL <= -effectiveCap

perTickerPnL       = sum(closed results for same ticker, all experiment)
tickerCapBreached    = perTickerPnL <= maxLossPerTicker (-250)
```

### Example (started last month)

| Month | Base | Carryover | Effective cap | Loss that month | Room left |
|-------|------|-----------|---------------|-----------------|-----------|
| June | $300 | $300 (May unused) | $600 | -$202 | $398 unused |
| July | $300 | $398 (June unused) | $698 | $0 so far | $698 |

July **this month P/L** = $0 (trades closed in July only). Experiment **net P/L** = all closed trades ever.

### Rules

- Resets automatically on the **1st of each calendar month** (UTC month key `YYYY-MM`).
- **Blocks new trades** when `monthlyCapBreached` is true.
- Closing existing open trades is still allowed (realized P/L must be recorded).
- Does **not** end the experiment.

### Dashboard labels (plain English)

| Tile | Value |
|------|-------|
| Monthly accrued loss | `-$202.44` |
| Monthly loss room left | `$97.56` (positive — room remaining) |

---

## 2. Experiment cycle (strategy lab)

**Purpose:** Test a playbook or hypothesis in a bounded sample. Not a monthly risk control.

| Field | Meaning | Example |
|-------|---------|---------|
| `maxLossPerTicker` | Max cumulative loss per ticker in experiment | `-250` |

### Rules

- `maxTrades` is **arbitrary and editable** on `/system` → Experiment rules.
- Experiment **continues across months** until you complete the sample or start a new cycle.
- Experiment P/L is **informational** — it does not block trading (monthly cap does).
- Trade IDs (H001–H030 today) define the active experiment window.

### When the experiment cycle restarts

User action (future Phase 2): **Start new experiment**

- Assign new ID range (e.g. H031–H060) or `experimentId` tag.
- Reset `maxTrades` to a new target (e.g. 20, 50).
- Experiment stats reset; **monthly cap continues** from current month accrued loss.

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

---

## 4. Phase 1 (implemented)

- [x] `monthlyLossLimit` in `data/rules.json`
- [x] `computeMonthlyRisk()` — filters by `closedAt` month
- [x] Validation blocks on **monthly** cap only
- [x] Dashboard shows **monthly accrued** + **monthly room** + **experiment progress**
- [x] `/system` form to edit `monthlyLossLimit` and `maxTrades`
- [x] Bridge snapshot includes `monthly` block

## 5. Phase 2 (proposed)

- [ ] `experimentId` on trades + “Start new experiment” action
- [ ] Configurable ID range per experiment (not only H001–H030)
- [ ] Monthly history chart (last 6 months cap usage)
- [ ] Optional soft warning when experiment sample is complete but monthly room remains
- [ ] ChatGPT snapshot section: `=== MONTHLY RISK ===` separate from `=== EXPERIMENT ===`

---

## 6. Config (`data/rules.json`)

```json
{
  "monthlyLossLimit": -300,
  "maxLossPerTicker": -250,
  "maxTrades": 30,
  "obsidianVault": "TradingVault",
  "obsidianVaultPath": "vault",
  "tradesFolder": "Trades"
}
```

`cycleLossLimit` is deprecated; on read it maps to `monthlyLossLimit` for backward compatibility.
