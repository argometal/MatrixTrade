# MTA · Strategy Review Handoff — entrega

**PROMPT ID:** `MTA-AI-STRATEGY-HANDOFF-001`  
**Fecha:** 2026-08-04  
**Branch:** `cursor/strategy-review-handoff-b0a5`  
**Baseline:** `main` @ `427024a`  

Read-only projection for external AI strategy review — no Supabase required on the receiving side.

---

## Auditoría breve (evidencia)

| Capacidad | Path / símbolo | Reuso |
|-----------|----------------|-------|
| Snapshot menu | `SnapshotButton` + `SnapshotMenuItem` | Extender items |
| Snapshot general | `withLeadingAggregateSnapshot` | Auto-incluye nuevo item |
| Stock File serialize | `buildStockThesisContextText` / ai-context scopes | Campos thesis vía projection |
| Plan serialize | `formatPlansSnapshotSection` / scout-plan scope | Projection directa de `TradePlan` |
| Trade compact | `formatTradeForSnapshot` pattern | Compact summary only |
| Review gates | `planNeedsStrategyReview`, `planNeedsLearningSyncRepair` | Operational flags |
| Planning loader | `planning/page.tsx` | + LO/OBS/MAF via settle |
| Superficie | Planning focused scout Snapshot menu | **Sin página nueva** |

**Path elegido:** `lib/strategy-review-handoff.ts` + item `Snap Strategy Review` en Planning (desk + case). Snapshot general lo agrega automáticamente.

---

## Contrato

Secciones: META · IDENTITY · STRATEGIC_THESIS · PLAN · OPERATIONAL_STATE · MARKET_OBSERVATION · HISTORY · LEARNING · AI_REVIEW_REQUEST.

Missing → `null` / `not_recorded` / listed in `missingFields`. Never invent market prices. Scout R ≠ Trade P/L.

---

## Archivos

- `lib/strategy-review-handoff.ts` — builder + formatter + SnapshotMenuItem  
- `app/components/planning-preview/PreviewPlanning.tsx` — menu wire  
- `app/(trading)/(preview)/planning/page.tsx` — load LO/OBS/MAF  
- `tools/test-strategy-review-handoff.ts`  
- `package.json` — `test:strategy-review-handoff`  

**No:** tablas, modelos persistentes, rutas nuevas, Funnel, Trade Statistics.

---

## Uso

Planning → Snapshot → **Snap Strategy Review** → paste a external AI.

---

*Handoff de entrega — Strategy Review projection.*
