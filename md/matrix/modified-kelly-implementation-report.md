# Modified Kelly — implementation report

**Branch experiment:** `modified-kelly-layered-entry`  
**Date:** 2026-07-25

## Decisions

1. **Reuse `layeredEntry`** — same Apply path as risk-weighted / layered-entry; add optional `executionModel` + `modifiedKelly` rather than a parallel plan object.
2. **Legacy default** — omitted `executionModel` → `standard_layered`; no migration rewrite of existing plans/trades.
3. **Sizing** — `riskWeightR × baseRiskDollar / (entry − stop)`; fractional shares on by default for the experiment; integer mode floors and warns on unused risk.
4. **Two R figures** — authorized campaign R vs filled-position R computed separately in `computeModifiedKelly`.
5. **UI write path** — Scout shows Execution Model selector as **read-only** (set via Control → Apply on `layeredEntry.executionModel`); no broker automation.
6. **Kelly does not invent prices** — engine only sizes risk at caller-supplied levels.
7. **Probability** — always carry `probabilitySource`; show uncalibrated warning when subjective/historical/missing; no calibrated win rate until n ≥ 30.
8. **MAF** — optional evidence fields + hint tags; not auto-accepted attributions.

## Files changed

| Area | Path |
|------|------|
| Types | `lib/modified-kelly-types.ts`, `lib/layered-entry-types.ts`, `lib/playbook-types.ts`, `lib/maf-types.ts` |
| Engine | `lib/modified-kelly.ts` |
| Wire-up | `lib/layered-entry.ts`, `lib/maf-evidence.ts`, `lib/matrix-mechanics-brief.ts` |
| Playbook | `data/playbooks.json` |
| UI | `app/components/planning-preview/ModifiedKellyPanel.tsx`, `LayeredEntryPanel.tsx`, `ScoutExecutePanel.tsx`, `playbook-preview/PreviewPlaybook.tsx` |
| Tests | `tools/test-modified-kelly.ts` (+ `npm run test:modified-kelly`) |
| Docs | `md/matrix/modified-kelly-layered-entry.md`, this report; README index |

## Tests covered

Base-only / full / partial extension fills; capital & monthly room; entry=stop & entry&lt;stop; Full Kelly & subjective probability warnings; fractional off + unused risk; slippage; cancel-after-stop; target-before-deeper; no-chase; authorize path; migration default; MAF evidence; aggregate calibration gate.
