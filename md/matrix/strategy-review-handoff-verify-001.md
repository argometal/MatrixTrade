# MTA · Strategy Review Handoff — VERIFY-001

**PROMPT ID:** `MTA-AI-STRATEGY-HANDOFF-VERIFY-001`  
**Fecha:** 2026-08-04  
**PR:** https://github.com/argometal/MatrixTrade/pull/137  
**Branch:** `cursor/strategy-review-handoff-b0a5`  
**Scope:** verificación únicamente — sin ampliar contrato ni funcionalidad.

---

## 1. Por qué ~490 líneas (`lib/strategy-review-handoff.ts`)

| Bloque | ~LOC | Rol |
|--------|------|-----|
| Tipos del contrato (`StrategyReviewHandoff` + input) | ~120 | Contrato canónico explícito (META…AI_REVIEW_REQUEST) |
| Helpers (LO/trade/touched/num) | ~50 | Vinculación canónica + sentinels |
| `buildStrategyReviewHandoff` | ~210 | Mapping campo-a-campo + missingFields (sin inventar mercado) |
| `formatStrategyReviewHandoffText` | ~45 | Texto determinista seccionado |
| Snapshot item + `resolveLinkedTradeForPlan` | ~30 | Integración SnapshotButton |
| Imports / comments | ~35 | — |
| **Total** | **490** | Un archivo = contrato + builder + copy |

No es “lógica duplicada de negocio”: es proyección read-only con tipos embebidos. Los serializers existentes (`formatPlansSnapshotSection`, `buildStockThesisContextText`, `formatTradeForSnapshot`) emiten **otro formato** (texto AI legacy), no el contrato JSON seccionado — reutilizarlos **cambiaría** el contrato. VERIFY no lo recomienda para merge.

---

## 2. Duplicación vs serializers existentes

| Existente | ¿Reutilizable sin cambiar contrato? |
|-----------|--------------------------------------|
| `formatPlansSnapshotSection` | No — formato distinto |
| `buildStockThesisContextText` | No — formato distinto |
| `formatTradeForSnapshot` | Parcial conceptual; compact Trade del handoff es más estrecho y tipado |
| `wrapSnapshotText` / `SnapshotMenuItem` | **Sí — ya reusado** |

**Duplicación encontrada:** lectura de campos Plan/Thesis en el builder (inevitable para el contrato). No hay copy-paste de builders existentes.

**Cambios requeridos por duplicación:** ninguno para merge.

---

## 3. Carga Planning — sin queries duplicadas a stores

| Capa | Comportamiento |
|------|----------------|
| `planning/page.tsx` | **Una** vez: `settle(getLearningOutcomes|getObservations|getMafExperiments)` en `Promise.all` |
| `PreviewPlanning` | Solo props — **cero** llamadas a esos getters |
| Builder | Filtra arrays en memoria |

`strategyReviewSnapshotItem` puede reconstruirse en dos listas UI (`snapshotItems` desk vs `snapshotItemsForCase`), pero el menú usa **una** lista; no hay segunda lectura de store.

---

## 4–6. Vinculación de entidades

| Dataset | Condición exacta | ¿Por ticker? |
|---------|------------------|--------------|
| Learning Outcome | `outcome.learningOutcomeId` → `lo.id` **o** `lo.planId === plan.id && !lo.tradeId` | **No** |
| Observations | `obs.planId === plan.id` | **No** |
| MAF | `lo.mafExperimentId` → `maf.id` | **No** |
| Trade | `plan.linkedTradeId` → `trade.id` **o** `trade.planId === plan.id` | **No** |

Probe VERIFY: LO `AMZN` de `PLAN-OTHER` no se asocia a `PLAN-A` (test + guard).  
OBS/MAF: IDs canónicos únicamente.

---

## 7. Snap Strategy Review vs Snapshot General

| Acción | Qué genera |
|--------|------------|
| **Snap Strategy Review** | `item.text` = `wrapSnapshotText(label, formatStrategyReviewHandoffText(handoff))` |
| **Snapshot general** | Concatena `item.text` de todos los children (incluye strategy-review) vía `buildAggregateSnapshotText` |

**No** hay un segundo builder del contrato. General embebe la **misma** `item.text`. Determinismo: mismo input → mismo cuerpo de contrato.

---

## 8. Pruebas / Build

- `npm run test:strategy-review-handoff` → **ok** (incluye guard LO≠ticker)  
- `npm run build` → **ok**  
- PR #137: MERGEABLE · Vercel SUCCESS  

---

## 9. Ejemplos (fixtures)

Generados con `now=2026-08-04T12:00:00.000Z`:

- `md/matrix/fixtures/strategy-review-active-no-trade.txt` — Scout `watching`, sin Trade; mercado `not_recorded`  
- `md/matrix/fixtures/strategy-review-converted-to-trade.txt` — `entered` + compact `H010`  
- `md/matrix/fixtures/strategy-review-terminal-no-outcome.txt` — `expired`, `needsOutcome=true`  

Mercado automático: **no implementado**; campos de precio permanecen `not_recorded`.

---

## === MTA-AI-STRATEGY-HANDOFF-VERIFY-001 ===

**Duplicación encontrada** — Solo mapping de campos para el contrato; serializers legacy no aplicables sin cambiar formato.  
**Vinculación de entidades** — LO/OBS/MAF/Trade por IDs canónicos; no por ticker.  
**Carga de Planning** — Una carga server; client sin re-fetch.  
**Determinismo** — Mismo builder para Snap item; General reusa `item.text`.  
**Ejemplos generados** — 3 fixtures bajo `md/matrix/fixtures/`.  
**Pruebas** — OK (+ test anti-ticker-collision).  
**Build** — OK.  
**Cambios requeridos** — Ninguno bloqueante.  
**Listo para merge:** **sí**

---

*VERIFY-001 — sin ampliación de contrato.*
