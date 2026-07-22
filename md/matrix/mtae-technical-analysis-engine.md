# Matrix Technical Analysis Engine (MTAE)

**Status:** Canonical (2026-07-21)  
**ADR:** [adr-0003-mtae.md](adr-0003-mtae.md)  
**Code:** `lib/mtae-types.ts`, `lib/mtae-apply.ts`, `lib/mtae-validate.ts`, `data/mtae-*.json`

---

## Objective

Build a **deterministic technical-analysis procedure** that converts multi-timeframe charts into a structured market assessment.

| MTAE does | MTAE does **not** |
|-----------|-------------------|
| Identify structural trend | Predict price |
| Rank supports / resistances | Decide capital allocation |
| Define battle zones | Run Entry Solver / maximumEntry |
| Separate probable vs extended targets | Compute R:R or position size |
| State structural invalidation | Issue Scout go / wait / no |
| Record contradictions + confidence | Optimize for human agreement |

**Capital allocation belongs to Matrix Scout.** MTAE is the Technical Analysis module only.

---

## Why this exists

Until MTAE, chats mixed observation and Matrix rules. The same charts for AMZN / MSFT / SHOP produced incompatible Stock Files. MTAE trains **Matrix’s procedure**, not the base model: same steps, schema-shaped JSON, human calibration of hierarchy errors.

---

## Two motors (non-negotiable split)

```text
Charts + ticker + TF role map
        │
        ▼
┌───────────────────────┐
│  MTAE (this doc)      │  structure, zones, targets, invalidation
│  technical JSON only  │  no RR, no sizing, no Scout verdict
└───────────┬───────────┘
            │ Accept (Control → Update)
            ▼
┌───────────────────────┐
│  Stock File synthesis │  levels, invalidation, historicalAnalysis
└───────────┬───────────┘
            │ later / separate chat
            ▼
┌───────────────────────┐
│  Matrix Scout         │  Entry Solver, Battle Selection, min R,
│                       │  Opportunity Cost, Capital Gate, decision
└───────────────────────┘
```

Never ask MTAE to “also solve entry.” Never ask Scout to invent structure without an assessment when one is required.

---

## Configurable timeframe roles

The engine is **not** coupled to 6M→3M→1M→1W.

Declare a **role map** per analysis (or reuse a named preset):

| Role | Job |
|------|-----|
| `strategic_tf` | Defines structure (secular / primary trend frame) |
| `opportunity_tf` | Strategic opportunity, probable / extended targets |
| `refinement_tf` | Battle zones, support/resistance refinement |
| `execution_tf` | Timing / execution context only |
| `execution_detail_tf` (optional) | 1D / 4H / 1H — never invalidates higher roles |

### Preset examples

**Swing / position (default):**

```json
{
  "id": "swing-6m",
  "strategic_tf": "6M",
  "opportunity_tf": "3M",
  "refinement_tf": "1M",
  "execution_tf": "1W"
}
```

**Faster swing:**

```json
{
  "id": "swing-3m",
  "strategic_tf": "3M",
  "opportunity_tf": "1M",
  "refinement_tf": "1W",
  "execution_tf": "1D"
}
```

**Hierarchy rules (always):**

1. Analyze **each timeframe independently** first — never mix conclusions mid-stage.
2. Lower timeframe **never invalidates** higher timeframe structure.
3. Higher timeframe **never justifies buying** regardless of price.
4. Execution frames refine timing only.

Presets live in `data/mtae-timeframe-maps.json`.

---

## Pipeline (fixed sequence)

### Stage 1 — Independent timeframe passes

For every TF in the role map (and optional detail TFs), produce a **standalone report**. Do not integrate yet.

Order of analysis follows the map from strategic → execution (example: 6M → 3M → 1M → 1W).

### Stage 2 — Per-timeframe contents

Each TF report must include:

#### Trend

- `bullish` | `neutral` | `bearish`
- `confidence` (0–1 or 0–100 — store as 0–100 integer)

#### Structure

Flags / notes: higher highs, higher lows, channel, range, distribution, compression, broken.

#### Major supports (ranked)

Not bare prices. Each support:

| Field | Meaning |
|-------|---------|
| `rank` | 1 = strongest for this TF |
| `price` or `zone` `{low,high}` | Level |
| `strength` | qualitative or 0–100 |
| `reason` | why it matters |
| `confidence` | 0–100 |

#### Major resistances

Same hierarchy shape.

#### Battle zones

A **battle zone is not “just support.”** It is where buyers and sellers are likely to fight.

Each zone:

| Field | Meaning |
|-------|---------|
| `id` | stable within assessment |
| `low` / `high` | price band |
| `reachProbability` | `high` \| `medium` \| `low` |
| `asymmetryQuality` | `acceptable` \| `good` \| `excellent` |
| `technicalImportance` | 0–100 or label |
| `reason` | why this is a fight area |

#### Targets (strict separation)

| Field | Rule |
|-------|------|
| `probableTarget` | Justifies the technical opportunity |
| `extendedTarget` | Upside only — **never** mixed into probable |

#### Structural invalidation

Where the **thesis** dies on this TF — **not** the strategy stop for R:R.

#### Contradictions

Write them. Example: trend bullish + momentum weakening + resistance overhead. **Never force consistency.**

### Stage 3 — Hierarchy integration

Merge TF reports using the role map:

| Role | Integration job |
|------|-----------------|
| strategic | Structure spine |
| opportunity | Strategic opportunity + target pair |
| refinement | Battle zone ranking |
| execution | Execution context only |

Output: `integrated` object + unresolved `contradictions[]`.

### Stage 4 — Technical summary

**Only technical conclusions.** Forbidden in this stage:

- Matrix Playbook philosophy essays
- Entry Solver / maximumEntry / recommended entry
- R:R math / position sizing
- Capital allocation / Scout verdict

### Stage 5 — Export

Return **one JSON** AI Block (`technical-assessment`). Nothing else in the Apply payload.

---

## Calibration (first-class)

The engine must be **trainable via human corrections to the procedure**, not via P/L outcomes.

Example:

| AI said | Human | Stored |
|---------|-------|--------|
| Support = 220 | Support should be 225 | errorType `support_hierarchy`, magnitude `+5`, reason, confidence adjustment |

Calibration improves **procedures** (how ranks are chosen), not “make this trade win.”

AI Block: `technical-calibration` → append-only store `data/mtae-calibrations.json`.

**Forbidden:** optimizing for agreement with a preferred narrative. Optimize for **repeatability**: same charts ten times → nearly identical schema-shaped conclusions.

---

## Participation Layer (design — coding deferred)

V1 is strong on **geometry** (structure, levels, battle zones, invalidation) and weak on **participation** (volume behavior, wicks, movement character, historical reaction).

Canonical design: [mtae-participation-layer.md](mtae-participation-layer.md) · ADR [adr-0005-mtae-participation.md](adr-0005-mtae-participation.md).

Planned additive schema (optional until coded):

- per TF: `participation.{volumeBehavior, wickAnalysis, candleSignals, movementCharacter, historicalReactionZones, largeParticipantFootprint}`
- integrated: `participationSynthesis`

Still forbidden in MTAE: Entry Solver, RR, Scout verdict, `whalesAreBuying`, Level 2 / heatmap (separate future Execution Microstructure Engine).

---

## AI Block shapes

### `technical-assessment`

```json
{
  "type": "technical-assessment",
  "source": "ai-block",
  "proposal": {
    "stockProfileId": "ST-AMZN-001",
    "ticker": "AMZN",
    "asOfPrice": 198.5,
    "timeframeMapId": "swing-6m",
    "timeframeRoles": {
      "strategic_tf": "6M",
      "opportunity_tf": "3M",
      "refinement_tf": "1M",
      "execution_tf": "1W"
    },
    "perTimeframe": [ /* Stage 2 reports */ ],
    "integrated": { /* Stage 3 */ },
    "technicalSummary": {
      "trend": "bullish",
      "structureNote": "…",
      "majorSupport": 180,
      "majorResistance": 215,
      "primaryBattleZone": { "low": 185, "high": 192 },
      "secondaryBattleZone": { "low": 175, "high": 180 },
      "probableTarget": 210,
      "extendedTarget": 230,
      "structuralInvalidation": "Monthly close below 175",
      "contradictions": ["Momentum softening into resistance"],
      "confidence": 72
    },
    "patchStockFile": true
  }
}
```

On Accept (`patchStockFile` default true):

1. Persist full assessment to `data/mtae-assessments.json`
2. Patch Stock File synthesis: `levels`, `riskRules.invalidation`, append `historicalAnalysis`, stamp `notes` with assessment id
3. **Does not** create trades, scouts, or Entry Solver outputs

### `technical-calibration`

```json
{
  "type": "technical-calibration",
  "source": "ai-block",
  "proposal": {
    "assessmentId": "MTAE-AMZN-001",
    "stockProfileId": "ST-AMZN-001",
    "ticker": "AMZN",
    "errorType": "support_hierarchy",
    "fieldPath": "technicalSummary.majorSupport",
    "aiValue": 220,
    "humanValue": 225,
    "magnitude": "+5 dollars",
    "confidenceAdjustment": -10,
    "reason": "Weekly pivot held as demand; 220 was wick liquidity only"
  }
}
```

---

## Stock File mapping

| Technical summary | Stock File field |
|-------------------|------------------|
| `majorSupport` | `levels.majorSupport` |
| `majorResistance` | `levels.majorResistance` |
| `primaryBattleZone` | `levels.primaryZone` |
| `secondaryBattleZone` | `levels.secondaryZone` |
| `probableTarget`, `extendedTarget` | `levels.targets[]` (probable first) |
| `structuralInvalidation` | `riskRules.invalidation` |
| per-TF summaries | `historicalAnalysis[]` append/replace by timeframe key |

MTAE does **not** overwrite Playbook or Scout plans.

---

## Consistency metric

| Good | Bad |
|------|-----|
| Same chart pack → same ranks / zones within small tolerance | “Looks buyable” without schema |
| Explicit contradictions preserved | Forced single narrative |
| Calibration changes future procedure notes | Silent rewrite of history without assessment id |

---

## Runtime code map

| Piece | Location |
|-------|----------|
| Control section | Control → **Technical analysis** (`MatrixControlPanel`) |
| Protocol / TF map copies | `lib/mtae-brief.ts`, `lib/mtae-snapshot.ts` |
| Types | `lib/mtae-types.ts` |
| Validate | `lib/mtae-validate.ts` |
| Apply | `lib/mtae-apply.ts` |
| Stores | `lib/mtae-store.ts`, `data/mtae-assessments.json`, `data/mtae-calibrations.json`, `data/mtae-timeframe-maps.json` |
| AI Block registry | `lib/ai-bridge-types.ts`, `lib/bridge.ts`, `lib/ai-block.ts` |
| Apply router | `lib/apply-trading-inbox.ts` |

---

## Out of scope (now)

- Chart image OCR / vision pipeline automation
- Auto-running Scout Entry Solver after Accept
- Supabase table for assessments (JSON file first; cloud later)
- Replacing Playbook structural-pullback experiment docs (MTAE feeds zones; Playbook still owns HOW)

---

## Related

- [adr-0003-mtae.md](adr-0003-mtae.md)
- [stock-profile-design.md](stock-profile-design.md)
- [scout-execution-model.md](scout-execution-model.md)
- [execution-experiments-layered-entry.md](execution-experiments-layered-entry.md)
- [runtime-truth.md](runtime-truth.md)
