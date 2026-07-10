# Trading lab — experiment rules

**Status:** Runtime truth (2026-07-10)  
**Supersedes:** Fixed H001–H030 / max 30 trade cap (removed — was a misinterpretation).

---

## What the lab is

MatrixTrade is a **conductual trading lab** — not a fixed 30-trade experiment.

- **No trade-count limit.** All closed trades accumulate; use as much data as is useful.
- **Trade IDs** use `H` + digits (`H001`, `H031`, `H999999`) — labels only, not a hard range.
- **Monthly cap** and **per-ticker cap** are the real hard gates (account protection).

H001–H030 was a **starting sample** for early inflection analysis — not permanent product truth.

---

## Hard rules (persist)

| Rule | Source | Blocks trading? |
|------|--------|-----------------|
| Monthly loss cap + carryover | `data/rules.json` → `/system` | Yes — new trades when monthly cap hit |
| Per-ticker cumulative loss | `data/rules.json` | Yes — new trades on that ticker |
| Human inbox approval | Inbox flow | N/A — writes require confirm |
| Valid trade fields | `lib/validation.ts` | Yes — create/close validation |

---

## Soft metrics (informational)

| Metric | Purpose |
|--------|---------|
| Closed trade count | Lab size — grows without limit |
| Net P/L, win rate, PF | Performance — all closed trades |
| Mistakes cost | Conductual patterns |
| Playbook stats | Strategy comparison over available N |
| Planning outcomes | Pre-trade vs result |

Use any subset of history for inflection analysis — you choose N in ChatGPT or stats, not the app.

---

## Validation

- **ID:** `^H[0-9]{1,8}$` (case-insensitive)
- **No max trade count** on create
- Stop below entry (long), positive shares, monthly + ticker caps

---

## Config (`data/rules.json`)

```json
{
  "monthlyLossLimit": -300,
  "maxLossPerTicker": -250,
  "carryoverEnabled": true,
  "obsidianVault": "TradingVault",
  "obsidianVaultPath": "vault",
  "tradesFolder": "Trades"
}
```

`maxTrades` in old files is **ignored** if present (legacy).

---

## Related

- Monthly risk: [monthly-risk-vs-experiment.md](monthly-risk-vs-experiment.md)
- Deferred: lab segmentation by `experimentId` — [../concepts/deferred-matrixtrade.md](../concepts/deferred-matrixtrade.md)
