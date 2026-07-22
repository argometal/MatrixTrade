# Execution experiments — layered entry

**Status:** Adopted (2026-07-11) · **Engine risk extension (2026-07-22)**  
**Layer:** Playbook — `expectancy-asymmetry` + `layered-entry` + Scout `layeredEntry`  
**Replaces (conceptually):** Probe as scaling-after-confirmation  
**Related:** [risk-weighted-layered-entry.md](risk-weighted-layered-entry.md)

---

## Matrix identity

> Matrix is a **statistical engine**, not a prediction engine. Every rule must improve long-term expectancy over a large sample — not make an individual trade feel more certain.

**Authorship split:** Human and AI propose entry prices, stops, target, roles, and allocation %. Matrix calculates R, monetary risk, quantities, and fill-state projections — and never invents technical levels.

---

## Allocation % vs monetary risk

| Concept | Meaning |
|---------|---------|
| `allocationPercent` | Share of the **complete planned position** — must sum to **100%** |
| `authorizedRiskAmount` | Monetary risk budget for the full plan (USD) |
| `sizingMode=risk_percent` | Preferred — allocation % is share of authorized risk |
| `sizingMode=position_percent` | Legacy — % is position/capital share; resulting risk share may differ |

`rules.defaultRiskBudget` (migration default **100**) is an editable default, not a hard market law. Monthly loss cap remains separate (`monthlyLossLimit`).

---

## Strategy vs execution

| | Strategy | Execution |
|---|----------|-----------|
| **Question** | Does this trade deserve capital? | How is the approved trade entered? |
| **Examples** | Support entry, breakout, pullback | Single limit, layered limits, market |
| **During experiment** | **Constant** | **One variable only** |

---

## Layered entry (entry optimization)

Thesis is **already accepted**. Goal: improve **average entry** / risk placement without changing thesis or chasing.

Example (100% capital / risk weights):

| Limit | Price | Allocation |
|-------|-------|------------|
| 1 | 73.00 | 40% |
| 2 | 72.20 | 35% |
| 3 | 71.40 | 25% |

| Outcome | Average entry | Note |
|---------|---------------|------|
| Only L1 fills | ≈ 73.00 | Trade starts |
| L1 + L2 | ≈ 72.60 | Better R:R, same thesis |
| All three | ≈ 72.30 | Excellent |
| None | — | **No trade. No chase.** |

**Experiment question:** Can systematic limit placement improve average R:R without materially reducing participation?

After **20–30 trades:** average entry improvement, fill %, missed %, net expectancy.

---

## Experimental rule

Only **one** execution variable per experiment.

- Experiment A: single limit  
- Experiment B: three layered limits  

Everything else identical: thesis, stop, targets, position size, Stock File, Playbook.

---

## No chase rule (hard)

If **all** predefined limits fail → trade is **cancelled**.

- No market order substitute  
- Missed opportunity > broken experiment  
- Emotion must not replace the plan  

---

## Metrics (every execution experiment)

- AverageEntryPrice  
- AverageImprovementVsFirstLimit  
- FillPercent / FullFillPercent / PartialFillPercent / MissedTradePercent  
- AverageRR  
- TradeOutcome  
- Expectancy  

Judge after a **statistically meaningful sample** — not one trade.

---

## Code

| Artifact | Location |
|----------|----------|
| Playbooks | `expectancy-asymmetry`, `layered-entry` in `data/playbooks.json` |
| Logic | `lib/layered-entry.ts` — parse, validate, fill metrics, transitions |
| Inbox | `decision-update` + `layeredEntry{}` on go; `layered-entry-update` for fill outcome |

---

## Related

- [asymmetric-entry-confirmation-cost.md](asymmetric-entry-confirmation-cost.md)
- [monday-nflx-experiment.md](monday-nflx-experiment.md)
- [scout-execution-model.md](scout-execution-model.md) — probe note superseded for entry optimization
