# Snapshot label fix — Prompt 25-08

**Status:** Shipped (docs + AI-facing text; no Control architecture change).  
**Date:** 2026-07-25  
**Parent findings:** Train AI / Schema Contract path debt (25-07).

---

## What changed

1. Removed current-path references to `Control → Train AI` from Mechanics, schema contract, and schema-first docs.
2. SCHEMA-FIRST points to visible label: **Control → MTA Mechanics → Apply schema contract**.
3. SNAPSHOT MENU lists only current labels (Mechanics, Apply schema contract, Stock Files, Apply, Library rows, Dashboard snapshot, Trade forensic).
4. Legacy trade completion contract added for ATTN-INCOMPLETE-CLOSED:
   - `playbookId: "__legacy_none__"` / `planId: "__LEGACY_NONE__"` for historical absence (no invented links)
   - `thesis`, `riskRewardPlanned`, `lossClassification`, `postStopStudy` via `trade-update`
   - `needs_review` via `trade-review`
5. Tests: `npm run test:legacy-trade-completion` (forbidden labels + H002 e2e in-memory).
6. Mechanics revision **30**.

## Code map

| Piece | Path |
|-------|------|
| Sentinels + contract text | `lib/legacy-trade-completion.ts` |
| Schema contract | `lib/apply-schema-contract.ts` |
| Mechanics brief / snapshot | `lib/matrix-mechanics-brief.ts`, `lib/matrix-mechanics-snapshot.ts` |
| Gap assessment | `lib/trade-forensic-snapshot.ts` (`assessTradeLegacy`) |
| Test | `tools/test-legacy-trade-completion.ts` |

## Non-goals

- No new Control home sections
- No rename of internal section id `train-ai`
- No change to Apply gate architecture
