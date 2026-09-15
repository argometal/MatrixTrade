# Execution experiments — layered entry

## A-Iteration

User-defined rules are primary.
This Library MD is the source of A-Iteration Anchors for its scope.
A-Iteration Anchors preserve the user's exact words.
AI never rewrites or reinterprets them.
If conflict or ambiguity exists, AI must negotiate with the user.
Respect ontology. Do not invent.
Only present what canonically exists in the epistemology.
If the required epistemology does not exist, do not add it; stop and report it.
Never change a user-defined A-Iteration rule.
Preserve A-Iteration Anchors.
Preserve what works.
Change only what is necessary.
Do not fix what does not block.
Verify the result.


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

## FILL EVIDENCE: INSUFFICIENT (uncertainty-distributed OLE)

Technical evidence defines the **defensible battle/entry zone**, structural hierarchy, target, and tactical stop.

OLE then distributes **authorized risk** inside that zone.

When fill evidence does **not** distinguish relative layer expectancy:

| Rule | Detail |
|------|--------|
| Label | `FILL EVIDENCE: INSUFFICIENT` |
| Default 3-layer weights | **30% starter · 40% preferred/middle · 30% deep_pullback** |
| Meaning | Uncertainty management — **not** a claim that 30/40/30 is statistically optimal |
| Family B | Starter remains ≤30%; middle gets only modest preference; deep layer keeps meaningful participation |
| Override | Allowed when real evidence supports unequal concentration — preserve the reason |

**Do not:** fabricate fill probabilities or historical reaction stats; claim an exact price is statistically optimal; assign extreme concentration (e.g. 70% at one price) without evidence; lower entries merely to manufacture R:R; expand the ladder outside the technical zone; chase above the starter; change the tactical stop to manufacture R; auto-consume the full risk budget when integer sizing cannot.

**Distinguish:**

- **A)** Evidence-supported optimized layering  
- **B)** Uncertainty-distributed layering  

Never label **B** as statistically optimized.

AVGO example (zone 320–325, stop 315, target 370, 1R=$100):

| Layer | Price | Risk % | Role |
|-------|-------|--------|------|
| 1 | 325 | 30% | starter |
| 2 | 323 | 40% | preferred |
| 3 | 320 | 30% | deep_pullback |

---

## Initialize OLE on an existing Scout Plan

`layered-entry-update` is **create-or-update** for `layeredEntry` on an **existing** `planId`:

- Missing `layeredEntry` + valid configure payload → **initialize** (`status: planned`)
- Existing `layeredEntry` + configure payload → **replace/reauthorize**
- Existing `layeredEntry` + `filledThroughIndex`/`status` → **fill lifecycle** (unchanged)
- Unknown `planId` → reject
- Never creates a new Scout Plan, Trade, fill, reservation, accounting, MAF, Observation, or realized P/L

Canonical configure fields are **flat on proposal** (same names as `LayeredEntryPlan`).

---

## Code

| Artifact | Location |
|----------|----------|
| Playbooks | `expectancy-asymmetry`, `layered-entry` in `data/playbooks.json` |
| Logic | `lib/layered-entry.ts` — parse, validate, authorize, fill metrics, transitions |
| Schema | `lib/layered-entry-update-schema.ts` — Apply create-or-update contract |
| Inbox | `scout-plan-create` / `decision-update.layeredEntry` configure; `layered-entry-update` initialize **or** fill |

---

## Related

- [asymmetric-entry-confirmation-cost.md](asymmetric-entry-confirmation-cost.md)
- [monday-nflx-experiment.md](monday-nflx-experiment.md)
- [scout-execution-model.md](scout-execution-model.md) — probe note superseded for entry optimization
- [risk-weighted-layered-entry.md](risk-weighted-layered-entry.md)