# Modified Kelly Layered Entry

**Layer:** Playbook experiment — `modified-kelly-layered-entry`  
**Status:** Testing  
**Design date:** 2026-07-24  
**Engine:** `lib/modified-kelly.ts` · types `lib/modified-kelly-types.ts`

## Intent

Distribute an **already authorized** risk budget between:

1. A base entry layer  
2. One or more Kelly extension layers at **better** prices  
3. A common stop  
4. A probable common target  
5. Partial or full fills  

Kelly sizes **additional risk**. Scout + technical analysis supply **prices**. Kelly does **not** decide prices, approve capital, or replace Scout / Entry Solver / capital gate / fixed-dollar-risk.

## Defaults

| Field | Default |
|-------|---------|
| `kellyFraction` | `quarter` |
| `maximumAdditionalRiskR` | `0.65` |
| `baseRiskR` | `1` |
| `totalAuthorizedRiskR` | `1.65` |
| `minimumCalibrationSample` | `30` |
| `commonStopRequired` | `true` |
| `noChase` | `true` |

Never default to Full Kelly.

## Data model (optional fields — migration-safe)

On `layeredEntry`:

- `executionModel`: `"standard_layered" | "risk_weighted" | "modified_kelly"`  
  Legacy plans omit → treat as `standard_layered`.
- `modifiedKelly`: plan state (base/additional/total R, fraction, probability + source, fill state)
- Per limit: `riskWeightR`, roles `base` | `kelly_extension`

On playbook: `modifiedKellyLayeredEntryExperiment` (+ checklist).

## R reporting

Always show **two** figures:

1. **Authorized campaign R** — from planned maximum risk  
2. **Filled-position R** — from filled layers only  

Do not compute filled R from max authorized risk when only part of the ladder filled.

## Hard rules (summary)

- Valid Scout with `plannedEntry`, `stopPrice`, `targetPrice`  
- Common stop by default; no chase  
- Extensions only at better prices (long: lower)  
- Additional Kelly risk capped by experiment max, monthly room, capital, per-trade max  
- Probability stored with `probabilitySource`; subjective ≠ proven stats  
- Uncalibrated copy: “Kelly estimate is experimental and uncalibrated.”  
- Matrix calculates shares (fractional optional)

## MAF

After the trade, attribution may use components capital_allocation / entry / execution / stop / timing with experiment tags such as `extension_not_filled`, `modified_kelly_effective`, `stop_too_close_for_layer`, etc. (hints on evidence; not auto-accepted).

## Out of scope

- Automatic broker execution  
- Changing global risk rules  
- Mutating existing Stock Files, Scout Plans, or Trades on migration  
