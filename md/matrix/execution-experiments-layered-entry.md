# Execution experiments — layered entry

**Status:** Adopted (2026-07-11)  
**Layer:** Playbook — `expectancy-asymmetry` + `layered-entry`  
**Replaces (conceptually):** Probe as scaling-after-confirmation

---

## Matrix identity

> Matrix is a **statistical engine**, not a prediction engine. Every rule must improve long-term expectancy over a large sample — not make an individual trade feel more certain.

---

## Strategy vs execution

| | Strategy | Execution |
|---|----------|-----------|
| **Question** | Does this trade deserve capital? | How is the approved trade entered? |
| **Examples** | Support entry, breakout, pullback | Single limit, layered limits, market |
| **During experiment** | **Constant** | **One variable only** |

---

## Layered entry (entry optimization)

Thesis is **already accepted**. Goal: improve **average entry** without changing stop, targets, or total size.

Example (100% capital):

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
| Plan field | `TradePlan.layeredEntry` — `lib/layered-entry-types.ts` |
| Legacy | `probe` retained in code; prefer layered entry in new work |

---

## Related

- [asymmetric-entry-confirmation-cost.md](asymmetric-entry-confirmation-cost.md)
- [monday-nflx-experiment.md](monday-nflx-experiment.md)
- [scout-execution-model.md](scout-execution-model.md) — probe note superseded for entry optimization
