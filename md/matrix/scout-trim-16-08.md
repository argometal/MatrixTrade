# 16-08 — Scout trim & convergence (UI only)

**Status:** Implemented (UI convergence).  
**Date:** 2026-08-16  
**Parent:** [scout-convergence-audit-16-07.md](scout-convergence-audit-16-07.md)  
**Constraint:** No ontology / persistence / OA / Learning / Apply contracts / War Universe / lifecycle logic changes.

## Progressive depth

```text
Watching (scan) → Open Scout (inspect / decide) → Execute (fund / act)
```

Same Scout product; not three apps.

## What changed

| Action | Detail |
|--------|--------|
| **Removed UI** | Scout Learning Queue banner from Desk (`data-scout-learning-queue`) — ATTN + `?plan=` deep-link still own needs-outcome / sync |
| **Removed UI** | Watching dump: Room, funding, Prepare, Allocation Impact, Details accordion, ops Apply workshop, Snapshot row, verdict wash |
| **Deleted component** | `ScoutAllocationImpact.tsx` (only mounted on Watching; Compare/Board keep selection) |
| **Added / reused** | `ScoutWatchingScan.tsx` — presentational scan card using **Open Scout** (Stock File Active scout) shell + Execute density |
| **Moved** | `ScoutFundingExecutionMenu` + Prepare + prepare note → **Execute** |
| **Helper** | `formatScoutWatchTriggerLine` in `lib/scout-operational-state.ts` (presentation only) |

## Untouched (confirmed)

- `isWarReadyScoutPlan` / war consumers  
- `planNeedsStrategyReview` / `planNeedsLearningSyncRepair` (ATTN / outcome panel deep-link)  
- OA evaluation, Apply contracts, Learning stores  
- Compare table / Allocation Board (except Impact no longer on Watching)

## Size

| File | Before (approx) | After |
|------|-----------------|-------|
| `PreviewPlanning.tsx` | ~1326 lines | ~592 lines |
| `ScoutAllocationImpact.tsx` | ~314 lines | **deleted** |
| `ScoutWatchingScan.tsx` | — | ~126 lines (scan only) |

Net: large Desk surface area removed, not hidden behind collapsibles.

## Visual references

- **Open Scout:** Stock File CTA + Active scout metric grid (`PreviewStockThesis.tsx`)  
- **Execute:** compact `dl` grid, emerald accent, funding summary, progressive Technical actions  

## Tests updated

`test:scout-ui`, `test:scout-prepare-trade`, `test:scout-capital-ui`, `test:scout-allocation`, `test:scout-plan-map`
