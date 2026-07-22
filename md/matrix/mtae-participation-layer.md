# MTAE — Participation Layer (structure + participation)

**Status:** Design accepted — **docs only** (2026-07-22). Coding deferred.  
**ADR:** [adr-0005-mtae-participation.md](adr-0005-mtae-participation.md)  
**Parent:** [mtae-technical-analysis-engine.md](mtae-technical-analysis-engine.md)

---

## Problem

MTAE V1 answers:

| Answered today | Not answered well |
|----------------|-------------------|
| Where is structure? | What kind of **participation** is occurring inside that structure? |
| Where are levels / battle zones? | Is advance confirmed by volume or hollow? |
| What is structural invalidation? | Correction vs squeeze vs distribution vs accumulation? |
| Probable vs extended targets | Are wicks rejection, sweep, or noise? |

**Two charts with similar geometry can receive similar MTAE scores while one shows accumulation and the other distribution.** Geometry alone is insufficient.

The missing dimension:

```text
structure  +  participation
```

---

## Design principle

| MTAE Participation does | MTAE Participation does **not** |
|-------------------------|----------------------------------|
| Read volume bars + candles as **contextual evidence** | Declare “whales are buying” |
| Classify movement character as **probabilistic** | Absolute rule engines (“doji = reverse”) |
| Rank historical reaction zones for battle-zone importance | Identify named institutions |
| Feed Stock File synthesis later | Run Entry Solver / capital / Scout verdict |
| Stay extractable from normal charts (OHLCV + volume) | Require Level 2 / heatmap to ship V1 |

**Scout still owns capital.** Participation improves *technical observation quality*, not go/no.

---

## Integration shape (no schema break)

Add optional `participation` **per timeframe report**, then `participationSynthesis` on `integrated`.

Existing V1 fields (trend, structure, supports, resistances, battleZones, targets, invalidation) remain required. Participation is an **additive layer**.

```text
Charts (OHLCV + volume)
        │
        ▼
┌──────────────────────────────┐
│  MTAE Stage 1–2              │  geometry (V1)
│  + participation per TF       │  volume / wicks / candles / character
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│  Stage 3 integrated          │  + participationSynthesis
└──────────────┬───────────────┘
               ▼
┌──────────────────────────────┐
│  Stage 4 technicalSummary    │  still NO capital / RR / Scout
└──────────────────────────────┘
```

---

## Per-timeframe: `participation`

```json
"participation": {
  "volumeBehavior": { },
  "wickAnalysis": { },
  "candleSignals": [ ],
  "movementCharacter": { },
  "historicalReactionZones": [ ],
  "largeParticipantFootprint": { }
}
```

All sub-blocks are **evidence with confidence**, never hard truths.

### 1. `volumeBehavior`

Requires visible volume bars. If volume is missing on the chart pack, set `state: "indeterminate"` and lower confidence — **do not invent**.

```json
"volumeBehavior": {
  "state": "expanding | contracting | muted | climactic | mixed | indeterminate",
  "directionalBias": "buying | selling | neutral | indeterminate",
  "priceVolumeRelationship": "confirming | diverging | inconclusive",
  "relativeVolume": "high | normal | low | unknown",
  "interpretation": "Price rising on expanding volume — advance better confirmed.",
  "confidence": 78
}
```

**Contextual heuristics (not absolute rules):**

| Price | Volume | Reading |
|-------|--------|---------|
| Up | Expanding | Growing participation / better-confirmed advance |
| Up | Contracting | Weak advance / possible exhaustion |
| Down | Contracting | Orderly correction more likely than distribution |
| Down | Expanding | Real selling pressure / possible distribution |

### 2. `movementCharacter`

Probabilistic classification of the path, not a verdict.

Allowed labels (initial set):

- `orderly_correction`
- `deep_correction`
- `volatility_compression`
- `short_squeeze`
- `liquidity_sweep`
- `trend_reversal_attempt`
- `confirmed_trend_reversal`
- `distribution`
- `accumulation`
- `indeterminate`

```json
"movementCharacter": {
  "primary": "orderly_correction",
  "secondary": ["volatility_compression"],
  "evidence": [
    "higher-TF trend intact",
    "slow pullback",
    "contracting volume",
    "overlapping candles",
    "support not broken"
  ],
  "confidence": 72,
  "caveat": "Classification is visual/probabilistic — not proof of positioning."
}
```

**Examples**

- Orderly correction: HTF intact + slow pullback + lower volume + overlapping candles + support held.
- Squeeze-like: vertical thrust + wide candles + little pullback + abrupt volume — label `short_squeeze` only as **possible**; charts cannot prove short covering.

### 3. `wickAnalysis`

Make rejections / sweeps **explicit** (today they are implicit inside zone reasons).

```json
"wickAnalysis": {
  "upperRejections": [
    {
      "zone": { "low": 100, "high": 103 },
      "frequency": 3,
      "strength": 82,
      "volumeConfirmation": "present | absent | unknown",
      "interpretation": "Repeated supply rejection"
    }
  ],
  "lowerRejections": [],
  "liquiditySweeps": [],
  "netMessage": "seller_rejection | buyer_rejection | absorption | mixed | inconclusive"
}
```

A single wick ≠ strong resistance. Strength rises with: repetition, relevant volume, close away from extreme, follow-through, historical level coincidence, higher-TF presence.

### 4. `candleSignals`

Small high-value set only — avoid Japanese-pattern encyclopedias (noise).

Allowed patterns (V1):

`doji` · `hammer` · `shooting_star` · `engulfing` · `inside_bar` · `outside_bar` · `rejection_candle` · `wide_range_candle` · `failed_breakout_candle`

```json
"candleSignals": [
  {
    "pattern": "doji",
    "location": "major_resistance",
    "context": "after_vertical_advance",
    "confirmation": "pending | confirmed | invalidated | unknown",
    "symbolicMeaning": "indecision_after_expansion",
    "confidence": 64
  }
]
```

A doji means context-dependent pause / balance / absorption / exhaustion — **not** automatic reversal. Next candle may confirm or invalidate.

### 5. `historicalReactionZones`

Feed battle-zone `technicalImportance`. Do **not** call these “whale buy points.”

Preferred language:

- historical demand response
- historical accumulation candidate
- repeated institutional-looking defense
- high-confidence reaction zone

```json
"historicalReactionZones": [
  {
    "zone": { "low": 180, "high": 185 },
    "reactionCount": 4,
    "successfulDefenses": 3,
    "averageReactionPercent": 11.5,
    "volumeCharacter": "expanding_on_rebound",
    "confidence": 84,
    "interpretation": "Repeated demand response"
  }
]
```

Measurable proxies: reaction count, bounce magnitude, reaction volume, time spent, later recapture, defense frequency, age, TF relevance.

### 6. `largeParticipantFootprint`

Detect **behavior compatible with large participation**, never identity.

```json
"largeParticipantFootprint": {
  "signal": "possible_accumulation | possible_distribution | absorption | indeterminate | none",
  "evidence": [
    "high volume with limited downside",
    "repeated lower-wick defense",
    "low-volume pullbacks"
  ],
  "confidence": 71
}
```

**Forbidden:** `"whalesAreBuying": true`.

---

## Integrated: `participationSynthesis`

```json
"participationSynthesis": {
  "dominantCondition": "accumulation | distribution | correction | squeeze | mixed | indeterminate",
  "buyingEvidence": [],
  "sellingEvidence": [],
  "unresolvedSignals": [],
  "confidence": 0
}
```

Hierarchy rules still apply: lower TF participation never invalidates higher TF structure; higher TF never alone justifies buying.

---

## Phased delivery (coding later)

### Phase A — first coding enlargement (charts with volume)

1. Volume behavior  
2. Wick / rejection analysis  
3. Movement character (correction / expansion / compression / squeeze-like)  
4. Historical reaction zones  
5. Contextual candle signals (small set)  
6. Large-participant footprint (possible_*)

### Phase B — advanced technical (still MTAE-adjacent)

7. Volume profile  
8. Anchored VWAP  
9. Relative volume series (numeric, when feed exists)

### Phase C — separate modules (do not fold into MTAE JSON)

10. Heatmap liquidity persistence  
11. Level 2 / order-flow microstructure  

```text
MTAE (structure + participation)
  → Stock File
  → Scout (capital)
  → Execution Microstructure Engine  ← Level 2 / heatmap live here
```

For multi-month swing, Level 2 value is low vs 6M/3M/1M structure. Keep it out of strategic MTAE.

---

## Calibration implications

New `technical-calibration` `errorType` candidates (when coding):

- `volume_behavior`
- `movement_character`
- `wick_hierarchy`
- `candle_signal_context`
- `historical_reaction_rank`
- `participant_footprint_overclaim`

Train **procedure consistency**, not P/L. Overclaiming “whales” or “confirmed squeeze” is a calibration error.

---

## Relationship to MAF

Participation quality feeds later expectancy learning:

| Component | Participation link |
|-----------|-------------------|
| `zone_quality` | historicalReactionZones + wick repetition |
| `thesis_quality` | movementCharacter vs later invalidation |
| `timing_quality` | candle confirmation / failed breakout |
| `entry_quality` | whether entry chased hollow volume advances |

MAF still requires deterministic prices/dates; participation classifications remain AI-interpreted evidence with confidence.

---

## What not to do

- Do not ship twenty indicators.
- Do not enlarge Japanese candle catalogs.
- Do not mix Level 2 into 6M structure assessments.
- Do not let participation invent capital decisions.
- Do not require heatmap vendors before Phase A.

The important upgrade is a **disciplined block**: Volume + Wicks + Candle behavior + Movement character + Historical reaction — visually extractable now, calibratable later.
