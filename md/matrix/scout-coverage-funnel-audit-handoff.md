# MTA · Scout Coverage / Scout Funnel — Auditoría de cobertura

**Fecha:** 2026-08-03  
**Mode:** auditoría de cobertura (ledger Scout) — **sin implementación**  
**Baseline:** `main` @ `427024a`  
**Audience:** Arquitecto · ChatGPT · Cursor  
**Prioridad:** cuantificar el universo Scout — no mezclar con Trade WR / P/L / equity  

**Referencias:**  
`md/matrix/scout-learning-circuit-audit-handoff.md` · `md/matrix/metrics-analysis-planteamiento-handoff.md` · `md/matrix/scout-ontology-scoutplan.md`

---

## Veredicto (con evidencia)

Insights Pipeline **no es un funnel de cobertura Scout**. Es un panel de **resultados ya formalizados** (Learning Outcomes + fallback parcial de planes expired/skipped + OBS `observing`).

Por eso “parece” que solo hay unos pocos Scouts: la UI cuenta filas de outcome/LO, **no** el universo `TradePlan`.

| Afirmación | Evidencia |
|------------|-----------|
| Entidad Scout = `TradePlan` | `lib/plan-types.ts` → `TradePlan`, `PlanStatus`; ontología: `md/matrix/scout-ontology-scoutplan.md` (ScoutPlan = nombre canónico; runtime = `TradePlan`) |
| Store prod | `lib/plans-store/index.ts` → `getPlansStore()`; Supabase `trade_plans` vía `lib/plans-store/supabase.ts` cuando `isSupabaseTradesStore()` (`lib/trades-json.ts`) |
| Pipeline rows = LO-first | `lib/insights-pipeline-performance.ts` → `computePipelinePerformance` — pass 1 LO; pass 2 solo `expired`/`skipped` sin LO; **no** `failed`/`watching`/`ready`/`entered` |
| Aggregates Scout ≠ universo | `lib/learning-scout-aggregates.ts` → `computeScoutLearningAggregates` — LO-centric (`SCOUT_EVALUATED_LO_KINDS`) |
| UI muestra esos números | `PreviewPipelinePerformance.tsx` — summary buckets + counterfactual; **sin** Total/Active/Terminal |
| Cola cierre (Planning) | `PreviewPlanning.tsx` + `planNeedsStrategyReview` / `planNeedsLearningSyncRepair` (`lib/plan-helpers.ts`) |

**Gap real:** falta una capa de **cobertura** sobre `plans[]` (funnel). Los datos ya existen en stores; no hace falta tabla/modelo nuevo.

---

## Bloqueo de conteo prod (este entorno)

| Fuente | Estado en agente cloud |
|--------|------------------------|
| `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | **Ausentes** — `environment` null; sin `.env.local` |
| Store local `data/plans.json` | Seed demo: **2** Scouts (TSLA watching, NFLX ready) |
| Prod Vercel | Lee Supabase `trade_plans` — **no legible aquí** |

**Conclusión numérica absoluta del book real (AMZN/GOOGL/…): no disponible en este agente.**  
Abajo: (A) definición exacta de cada métrica; (B) números del seed local; (C) query operativa para prod cuando haya credenciales.

---

## Definiciones exactas (condiciones)

### Universo Scout

| # | Métrica | Condición exacta | Store / símbolo |
|---|---------|------------------|-----------------|
| 1 | **Total Scouts** | `plans.length` tras `getPlans()` (incluye auto-expire) | `lib/plans.ts` → `getPlans` + `applyAutoExpire`; store `getPlansStore().readAll()` |
| 2 | **Por estado** | `plan.status ∈ PlanStatus` | `lib/plan-types.ts` → `"watching"\|"ready"\|"entered"\|"skipped"\|"failed"\|"expired"` |
| 3 | **Activos** | `status ∈ {watching, ready}` | `lib/plan-helpers.ts` → `countActivePlans` |
| 3b | **Linked-active** (no = Active count) | `status ∈ {watching, ready, entered}` | `lib/scout-plan-repair.ts` → `ACTIVE_SCOUT_LINK_STATUSES` |
| 4 | **Terminales** | `status ∈ {failed, expired, skipped}` | misma constante usada por `planNeedsStrategyReview` |
| 5 | **Con outcome** | `Boolean(plan.outcome?.recordedAt)` | `lib/plan-types.ts` → `PlanOutcome.recordedAt`; escrito en `persistPlanOutcome` |
| 6 | **Sin outcome** | `!plan.outcome?.recordedAt` | — |
| 6b | **Needs outcome** | terminal ∧ sin `recordedAt` | `planNeedsStrategyReview` |
| 7 | **Con Learning Outcome** | existe LO con `planId` match ∧ `!tradeId` | `lib/learning-outcome-store.ts` → `getLearningOutcomeByPlanId`; o `plan.outcome.learningOutcomeId` |
| 8 | **Learning sync completa** | `outcome.recordedAt` ∧ `learningSyncStatus === "complete"` | `lib/plan-outcome-types.ts` → `LEARNING_SYNC_STATUSES`; sync: `syncPlanOutcomeLearning` |
| 8b | **Needs sync repair** | `recordedAt` ∧ status `pending\|failed` | `planNeedsLearningSyncRepair` (`lib/plan-helpers.ts`) — UI; variante verify-aware en `lib/plan-outcome-learning-sync.ts` |
| 9 | **Convertidos a Trade** | `Boolean(plan.linkedTradeId)` **o** LO con `tradeId` + kind executed_* | `TradePlan.linkedTradeId` (`plan-types.ts`); LO kinds `executed_win\|executed_loss` |
| 10 | **Entrada alcanzada sin Trade** | (`outcome.entryReached === true` ∨ `entryTriggered === true`) ∧ `!linkedTradeId` ∧ (`tradeExecuted === false` ∨ ausente) | `computeScoutLearningAggregates` → `triggeredPlansWithoutTrade`; LO `entryReached && !tradeId` |

### Qué cuenta Insights hoy (≠ cobertura)

| Panel | Qué cuenta | Qué excluye |
|-------|------------|------------|
| Pipeline summary buckets | Filas de `computePipelinePerformance` | Activos; `failed` sin LO; duplicates (`excludedFromMetrics`); LO skip |
| Counterfactual evaluated | `SCOUT_EVALUATED_LO_KINDS` no excluded | Scouts sin LO; duplicates; executed |
| Plan fallback rows | Solo `expired` / `skipped` **sin** LO | **`failed` sin LO** — invisible en Pipeline rows |
| Realized | LO `executed_win`/`executed_loss` | Scout R; trades sin LO |

Evidencia plan-fallback:

```317:322:lib/insights-pipeline-performance.ts
  // Plans without LO: expired / skipped (cancelled analogue) only.
  for (const plan of input.plans) {
    if (coveredPlanIds.has(plan.id.toUpperCase())) continue;
    let bucket: PipelineOutcomeBucket | null = null;
    if (plan.status === "expired") bucket = "expired_plans";
    else if (plan.status === "skipped") bucket = "cancelled_plans";
```

---

## (B) Universo legible en este agente — seed local

**Store:** `data/plans.json` vía `lib/plans-store/json.ts` (modo json porque no hay Supabase env).

| Métrica | N | Evidencia fila |
|---------|---|----------------|
| 1 Total | **2** | PLAN-001 TSLA, PLAN-002 NFLX |
| 2 Por estado | watching **1**, ready **1**, entered/failed/expired/skipped **0** | `status` field |
| 3 Activos | **2** | `countActivePlans` |
| 4 Terminales | **0** | — |
| 5 Con outcome | **0** | sin `outcome.recordedAt` |
| 6 Sin outcome | **2** | ambos |
| 6b Needs outcome | **0** | no terminales |
| 7 Con LO | **0** | `data/learning-outcomes.json` = `[]` |
| 8 Sync complete | **0** | — |
| 8b Needs sync repair | **0** | — |
| 9 Convertidos a Trade | **0** | sin `linkedTradeId`; sin `data/trades.json` |
| 10 Triggered sin Trade | **0** | — |
| 11 Terminales invisibles en Insights | **0** en seed | (en prod: clase `failed` sin LO) |
| 12 Activos a contar en cobertura | **2** | TSLA watching · NFLX ready — **no** como outcomes |

**Stock File seed:** 1 tesis `ST-TSLA-001`. OBS/MAF seed vacíos.

> Estos números **no** representan el book de producción. Solo prueban que el funnel se puede calcular 100% desde `plans` + LOs existentes.

---

## Respuestas 1–14 (marco de cobertura)

### 1–10 Conteos

Usar la tabla de definiciones. En **prod**, ejecutar contra `getPlans()` + `getLearningOutcomes()` (Supabase). En este agente: ver sección (B).

### 11. Scouts terminales que no aparecen en Insights

**Clases invisibles (regla de código, independiente del conteo):**

| Clase | Condición | ¿Planning queue? | ¿Pipeline row? |
|-------|-----------|------------------|----------------|
| A. `failed` sin LO | `status===failed` ∧ no covered by LO | Sí si sin `recordedAt` (`planNeedsStrategyReview`) | **No** (fallback no incluye failed) |
| B. Terminal sin outcome | `planNeedsStrategyReview` | Sí | Solo si expired/skipped (fila “plan:…”) **sin** LO; failed → no |
| C. `duplicate_creation` LO | `excludedFromMetrics` / kind skip | N/A (cerrado) | **No** |
| D. Sync failed con LO parcial | LO puede existir; sync `failed` | Sí (`planNeedsLearningSyncRepair`) | Puede aparecer si LO pasó filtros — **no** muestra sync state |
| E. Activos | watching/ready/(entered) | No (salvo foco) | **No** |

### 12. Activos en cobertura (no como outcomes)

Deben entrar en **Total** y **Active** del Funnel.  
**No** deben entrar en Outcome recorded / Learning synced / summary outcome buckets.  
Símbolo: `countActivePlans` — `watching|ready` only (`entered` es linked-active, no “Active” del count actual).

### 13. Datos ya existentes para Scout Funnel

| Dato | Origen |
|------|--------|
| Total / Active / Terminal / Needs outcome / Needs sync | `plans[]` + `plan-helpers` |
| Outcome recorded / Learning synced | `plan.outcome.*` |
| Converted to Trade | `plan.linkedTradeId` (+ opcional LO executed) |
| Triggered without trade | `computeScoutLearningAggregates` o campos outcome |
| Evaluated Scout LO counts | `computeScoutLearningAggregates` (ya en Pipeline counterfactual) |
| Wiring stats | `stats/page.tsx` ya pasa `plans`, `learningOutcomes`, `observations`, `mafExperiments` |

### 14. Qué falta realmente

| Caso | ¿Falta dato? | ¿Falta UI/cálculo? |
|------|--------------|---------------------|
| Universo Total/Active/Terminal | No | **Sí** — no se computa ni muestra |
| Needs outcome / sync repair en `/stats` | No | **Sí** — solo Planning/ATTN |
| `failed` en Pipeline rows | No | Opcional — Funnel los cubre sin forzar bucket outcome |
| Precio de mercado “¿tocó entry?” automático | **Sí** (humano confirma) | No inventar en Funnel |
| Credenciales prod en agente | **Sí** (ops) | Bloquea enumeración remota |

**No falta:** tablas, modelos, ontología, páginas, métricas financieras nuevas.

---

## Lista de cierre retrospectivo

### Seed local (completo)

Ningún Scout requiere cierre retrospectivo (ninguno terminal).

| ticker | planId | status | outcome state | Learning state |
|--------|--------|--------|---------------|----------------|
| — | — | — | — | — |

### Prod (plantilla — ejecutar con Supabase)

Orden sugerido de revisión humana: AMZN → GOOGL → TSLA → MSFT → SHOP → resto.

```ts
// Read-only against getPlans() + getLearningOutcomes()
// Needs outcome:
plans.filter(planNeedsStrategyReview)
// Needs sync repair:
plans.filter(planNeedsLearningSyncRepair)
// Emit: ticker, planId, status, outcome.recordedAt?, outcome.outcomeKind?, learningSyncStatus?, learningOutcomeId?, linkedTradeId?
```

Columnas obligatorias del export operativo:

`ticker | planId | status | outcomeState (none\|recorded) | outcomeKind | learningSyncStatus | learningOutcomeId | linkedTradeId | queue (needs_outcome\|needs_sync\|ok)`

---

## Propuesta — Scout Coverage / Scout Funnel (mínima)

**Superficie:** `/stats?tab=pipeline` dentro de `PreviewPipelinePerformance` (o sección hermana arriba del panel actual).  
**Nombre conceptual:** Scout Coverage / Scout Funnel.  
**Ledger:** cobertura operativa Scout — **prohibido** mezclar WR, expectancy realizada, P/L, equity.

### Contadores (solo `plans` + flags existentes)

| Card | Fórmula |
|------|---------|
| Total Scouts | `plans.length` |
| Active | `countActivePlans(plans)` |
| Terminal | `status ∈ failed\|expired\|skipped` |
| Outcome recorded | `outcome?.recordedAt` |
| Learning synced | `learningSyncStatus === "complete"` |
| Converted to Trade | `Boolean(linkedTradeId)` |
| Needs outcome | `planNeedsStrategyReview` |
| Needs sync repair | `planNeedsLearningSyncRepair` |

Opcional (ya calculado): `triggeredPlansWithoutTrade` del aggregator — **no** como P/L.

### Archivos a cambiar (cuando autoricen)

1. `lib/insights-pipeline-performance.ts` — añadir `coverage` / `funnel` en `PipelinePerformanceView` (puro, desde `input.plans`)  
2. `app/components/insights-preview/PreviewPipelinePerformance.tsx` — sección `data-scout-coverage-funnel`  
3. `tools/test-insights-pipeline-30-2c.ts` — assertions de conteos + markers  
4. Docs: este handoff → “implementado” tras auth  

**No tocar:** `lib/analytics.ts`, `PreviewStats`, Trade math, migraciones, nuevas rutas.

### Riesgos

- Lectura humana: Funnel vs Realized — copy “coverage, not P/L”.  
- `entered` sin `linkedTradeId` — decidir si cuenta Converted (recomendado: solo `linkedTradeId`).  
- Auto-expire en `getPlans()` cambia Active→Terminal en runtime — Funnel debe usar la misma lista que stats page.

---

## === AUDITORÍA DE COBERTURA SCOUT ===

**Universo total**  
Definición: todos los `TradePlan` del store. Seed local = **2**. Prod = **requiere Supabase** (no leído aquí).

**Distribución por estado**  
Seed: watching 1, ready 1. Prod: desconocida sin credenciales. Constantes en `PlanStatus`.

**Cobertura de outcomes**  
`recordedAt` presente. Pipeline **no** muestra tasa outcome/universo. Needs outcome = `planNeedsStrategyReview`.

**Cobertura de Learning**  
LO vía sync; sync complete = `learningSyncStatus==="complete"`. Aggregates evalúan LOs Scout, no el universo.

**Conversión a Trade**  
`linkedTradeId` / LO executed. Pipeline realized = solo LO executed (no trades huérfanos).

**Scouts invisibles en Insights**  
Activos (todos); `failed` sin LO; duplicates excluded; terminales sin formalizar (parcial: expired/skipped sí como plan-fallback).

**Terminales pendientes**  
= `planNeedsStrategyReview` ∪ `planNeedsLearningSyncRepair`. Seed: 0. Prod: listar con query arriba.

**Datos reutilizables**  
`plans`, `plan.outcome.*`, LOs, helpers, `stats/page.tsx` pipelineInput, aggregates existentes.

**Gaps reales**  
UI/cálculo de cobertura; fallback Pipeline omite `failed`; agente sin Supabase para enumerar prod. No gap de schema.

**Arquitectura Scout Funnel**  
Extensión mínima en `/stats?tab=pipeline`: 8 contadores de cobertura desde `plans[]`. Sin página/tabla/ontología/métricas $ nuevas.

**Archivos que cambiarías**  
`lib/insights-pipeline-performance.ts` · `PreviewPipelinePerformance.tsx` · `tools/test-insights-pipeline-30-2c.ts` · este handoff.

**Pruebas requeridas**  
Fixture con watching/ready/entered/failed/expired/skipped ± outcome ± sync ± linkedTradeId; assert funnel counts; regression: realized/counterfactual sin mezclar; marker `data-scout-coverage-funnel`.

---

## === HANDOFF ===

**Estado actual**  
Circuito Scout→outcome→LO→Pipeline funciona para casos formalizados. Cobertura del **universo** no está cuantificada en UI. P0 visibility (aggregates triggered/thesis) ya en main; no sustituye Funnel.

**Qué está cuantificado**  
LO Scout evaluados, UPL count, counterfactual R (filtrado), triggered-without-trade, thesis MAF rate, buckets outcome de filas Pipeline, cola Planning needs outcome/sync.

**Qué no está cuantificado**  
Total Scouts, Active, Terminal, Outcome recorded rate, Learning synced rate, Converted to Trade, Needs outcome/sync **en `/stats`**, visibilidad de `failed` sin LO.

**Pendientes**  
1) Credenciales Supabase → enumerar book real + lista cierre retrospectivo (AMZN→…).  
2) Autorización → implementar Scout Funnel mínimo.  
3) No ampliar Insights dimensional / Coach.

**Riesgos**  
Contaminación visual Trade↔Scout; confundir Funnel con expectancy; implementar sin datos prod.

**Orden recomendado**  
1. Export/conteo prod (`getPlans` + helpers)  
2. Lista cierre retrospectivo por ticker  
3. Auth → Funnel UI en Pipeline  
4. Tests  
5. Solo después: tesis/outcomes humanos ticker a ticker  

**No implementar Funnel hasta autorización explícita.**

---

*Library handoff — auditoría de cobertura Scout / propuesta Funnel. Sin código de producto.*
