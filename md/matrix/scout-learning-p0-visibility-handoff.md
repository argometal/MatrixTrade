# MTA · Scout Learning P0 visibility — Handoff de entrega

**Fecha:** 2026-08-03  
**Baseline:** `main` @ `f284719`  
**Branch:** `cursor/scout-learning-p0-visibility-b0a5`  
**Commit (feature):** `f3a17cf` (`f3a17cf1a66d42d692af41ac518eeb04772cf4d0`)  
**Branch tip:** ver PR #134 (incluye docs de entrega)  
**PR:** https://github.com/argometal/MatrixTrade/pull/134 (draft)  
**Prod:** https://matrix-trade-theta.vercel.app — **aún no merged / no desplegado**  
**Alcance:** visibilidad del circuito Scout → plan-outcome → Learning → `/stats` Pipeline (sin página/tabla/modelo nuevo)

**Docs relacionados:**
- Auditoría acotada + PLAN P0: `md/matrix/scout-learning-circuit-audit-handoff.md`
- Tres ledgers: `md/matrix/metrics-analysis-planteamiento-handoff.md`

---

## Veredicto

El circuito de Learning **ya existía**. P0 cierra el gap operativo:

1. Aggregates Scout ya calculados **ahora se ven** en `/stats?tab=pipeline`
2. Scouts terminales sin outcome / sync failed **se descubren** en Planning (cola)
3. Tras `partialFailure`, el siguiente paso es **Retry Learning Sync** (copy explícito)

No se construyó Insights nuevo. No se mezcló Scout R con Trade WR/P/L.

---

## Exacto qué se cambió

### Paso 1 — Aggregates en Pipeline

| Antes | Ahora |
|-------|--------|
| `computePipelinePerformance.counterfactual` solo tenía `scoutEvaluatedCount`, `unexecutedPlanLossCount`, `counterfactualRSum` | + `triggeredPlansWithoutTrade`, `thesisEvaluationCount`, `thesisFailureCount`, `thesisFailureRate` (desde `computeScoutLearningAggregates`) |
| UI Pipeline no mostraba triggered/thesis | Panel Counterfactual muestra ambos con markers |

### Paso 2 — Discovery en Planning

| Antes | Ahora |
|-------|--------|
| `PlanRecordOutcomePanel` solo si el scout enfocado necesitaba review/sync | Banner **Scout learning queue** lista todos los que necesitan outcome o Retry Sync |
| Select Case sin hint Learning | Sufijos `· needs outcome` / `· sync repair` |
| Sin helper de sync repair | `planNeedsLearningSyncRepair` en `lib/plan-helpers.ts` |
| `primaryPlan` prefería entered/expired genérico | Sin Scout vivo → prefiere plan que necesita cierre Learning |

### Paso 3 — Copy partialFailure

| Antes | Ahora |
|-------|--------|
| “Learning synchronization failed and requires repair” | Apunta a Planning → Retry Learning Sync; no re-Apply; no reabrir `evaluate_expired_plan` |
| Panel sync genérico | Copy “Partial failure after Apply/Save…” |

---

## Archivos tocados

| Archivo | Cambio |
|---------|--------|
| `lib/insights-pipeline-performance.ts` | Extiende `counterfactual` con aggregates Scout/MAF |
| `app/components/insights-preview/PreviewPipelinePerformance.tsx` | UI Triggered-without-Trade + thesis fail rate |
| `lib/plan-helpers.ts` | **NUEVO** `planNeedsLearningSyncRepair` |
| `app/components/planning-preview/PreviewPlanning.tsx` | Cola Learning + `learningFocusPlanId` + hints select |
| `app/components/planning-preview/PlanRecordOutcomePanel.tsx` | Copy Retry Sync post-partialFailure |
| `lib/apply-trading-inbox.ts` | Mensaje Apply parcial |
| `lib/plan-outcome.ts` | Mensaje `partialFailure` en persist/idempotent sync |
| `app/actions.ts` | Fallback error UI Record Outcome alineado |
| `tools/test-insights-pipeline-30-2c.ts` | Assertions aggregates + markers UI/Planning |
| `tools/test-plan-outcome-learning-sync.ts` | Assertion mensaje Retry Sync |
| `md/matrix/scout-learning-circuit-audit-handoff.md` | Auditoría acotada + `=== PLAN P0 ===` |
| `md/matrix/metrics-analysis-planteamiento-handoff.md` | Tres ledgers (traído a esta branch) |
| `md/matrix/library-alignment-backlog.md` | Pointers |
| `CHAT-HANDOFF.md` | Pointer P0 / shipped Plan Map #132 |

---

## Markers / símbolos (para QA)

| Marker / símbolo | Dónde |
|------------------|--------|
| `data-pipeline-triggered-without-trade` | Pipeline counterfactual |
| `data-pipeline-thesis-failure-rate` | Pipeline counterfactual |
| `data-scout-learning-queue` | Planning banner |
| `data-scout-needs-outcome` | Lista terminales sin outcome |
| `data-scout-needs-sync-repair` | Lista sync pending/failed |
| `data-scout-outcome-panel` | Contenedor `PlanRecordOutcomePanel` |
| `planNeedsStrategyReview` | Gate outcome |
| `planNeedsLearningSyncRepair` | Gate Retry Sync |
| `computeScoutLearningAggregates` | Fuente aggregates |
| `computePipelinePerformance` | View `/stats` Pipeline |

---

## Verificación

| Check | Resultado |
|-------|-----------|
| `npm run test:insights-pipeline` | OK |
| `npm run test:plan-outcome-learning-sync` | OK |
| Página nueva Insights | No |
| Tabla / migración nueva | No |
| Trade Statistics math tocado | No |

### Manual post-merge

1. `/stats?tab=pipeline` — ver Triggered, no Trade + Thesis fail rate  
2. `/planning` con Scout `expired|failed|skipped` sin `recordedAt` — banner cola  
3. Outcome persistido con `learningSyncStatus=failed` — fila Sync + panel Retry  
4. Confirmar Statistics Trade no muestra counterfactual Scout R  

---

## Qué NO se hizo (explícito)

- P1 sección Scout Learning dedicada en hub `/stats`
- Coach / export / analytics dimensional
- Ampliar kinds Apply UI más allá de UPL/duplicate
- MAF durable store
- Re-auditar el repo entero

---

## Orden siguiente

1. Review + merge **PR #134** → prod verify  
2. (Opcional) cerrar/supersede overlap docs con PR #133 si aún abierto — esta branch ya incluye los handoffs de metrics/audit  
3. **P1** solo con autorización explícita  

---

## Instrucciones para la IA

1. Leer este handoff + `scout-learning-circuit-audit-handoff.md` antes de proponer Insights.  
2. No reabrir auditoría amplia del repo.  
3. Mantener tres ledgers.  
4. Cada conclusión: archivo + función/componente/símbolo + por qué.  
5. Siguiente código = gaps concretos del circuito, no arquitectura nueva.

---

*Handoff de entrega P0 — Scout Learning visibility.*
