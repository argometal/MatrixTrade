# MTA · Scout Learning circuit audit — Library handoff

**Fecha:** 2026-08-03  
**Mode:** auditoría acotada → **P0 autorizado e implementado** (visibilidad + discovery)  
**Baseline auditada:** `main` @ `f284719`  
**Audience:** ChatGPT · Cursor · agentes  
**Referencia canónica previa:** `md/matrix/metrics-analysis-planteamiento-handoff.md`  
**Handoff de entrega P0:** `md/matrix/scout-learning-p0-visibility-handoff.md` · PR #134

**Reglas:** no tablas/modelos/ontología/páginas nuevas; no mezclar ledgers; no Coach/export/analytics dimensionales; reutilizar antes de proponer.

---

## Alcance de auditoría (obligatorio)

**Objetivo:** explicar completamente el flujo  
`Scout → plan-outcome → Learning → visualización`.

**Detente** cuando ese circuito quede cerrado con evidencia.  
**No amplíes** la auditoría a `/planning` capital, Forge, stats Trade math, migraciones, o módulos no relacionados **salvo dependencia directa** del circuito.

---

## Evidencia concreta (obligatorio)

Para **cada** conclusión debes citar:

* archivo,
* función / componente / símbolo,
* y **por qué** participa en el flujo.

No se aceptan conclusiones generales sin evidencia (“parece que…”, “probablemente…”).

---

## Veredicto (con evidencia)

El circuito **Scout → plan-outcome → LO/OBS → Pipeline** ya funciona para UPL/duplicate.

| Afirmación | Evidencia |
|------------|-----------|
| Persist + sync existen | `lib/plan-outcome.ts` → `persistPlanOutcome` / `applyPlanOutcomeProposal`; `lib/plan-outcome-learning-sync.ts` → `syncPlanOutcomeLearning` |
| Review gate terminal | `lib/plan-helpers.ts` → `planNeedsStrategyReview` (`failed\|expired\|skipped` sin `recordedAt`) |
| Sync repair sin reabrir review | `lib/plan-helpers.ts` → `planNeedsLearningSyncRepair`; ATTN `lib/needs-attention-ai.ts` → `sync_plan_outcome_learning` |
| Aggregates calculados | `lib/learning-scout-aggregates.ts` → `computeScoutLearningAggregates` (`triggeredPlansWithoutTrade`, thesis*) |
| Gap era visibilidad | Antes: `lib/insights-pipeline-performance.ts` → `computePipelinePerformance` solo exponía 3 campos counterfactual; UI `PreviewPipelinePerformance` no mostraba triggered/thesis |
| Gap era discovery | Antes: `PreviewPlanning.tsx` solo montaba `PlanRecordOutcomePanel` en scout enfocado |

**Estancamiento = cierre operativo + visibilidad**, no arquitectura faltante.

---

## Flujo actual (cerrado)

```text
Scout terminal (failed|expired|skipped ± UPL-eligible)
  → planNeedsStrategyReview / ATTN evaluate_expired_plan
  → PlanRecordOutcomePanel | Control Apply type plan-outcome
  → validatePlanOutcomeProposal
  → persistPlanOutcome → trade_plans.outcome (recordedAt)
  → syncPlanOutcomeLearning → LO (+ OBS si UPL)
  → learningSyncStatus complete|failed
  → computeScoutLearningAggregates
  → /stats?tab=pipeline (PreviewPipelinePerformance)
```

### Archivos / símbolos por etapa

| Etapa | Path / símbolo | Por qué |
|-------|----------------|---------|
| Review gate | `lib/plan-helpers.ts` → `planNeedsStrategyReview` | Define Scouts que deben cerrar outcome |
| Sync repair | `lib/plan-helpers.ts` → `planNeedsLearningSyncRepair` | Persist OK, sync no |
| ATTN | `lib/plan-attention.ts`, `lib/needs-attention-ai.ts` | Inbox operativo `evaluate_expired_plan` / sync repair |
| UI outcome | `PlanRecordOutcomePanel.tsx`, `PreviewPlanning.tsx` | Persist + Retry Sync en Planning |
| Discovery | `PreviewPlanning.tsx` → `data-scout-learning-queue` | Lista terminales sin outcome / sync failed |
| Actions | `app/actions.ts` → `recordPlanOutcomeAction`, `retryPlanOutcomeLearningSyncAction` | Mutaciones server |
| Validate | `lib/plan-outcome*.ts` | Contrato Apply/UI |
| Persist + sync | `lib/plan-outcome.ts`, `lib/plan-outcome-learning-sync.ts` | Escritura + LO/OBS |
| Aggregates | `lib/learning-scout-aggregates.ts` | Ledger Scout (no Trade) |
| Pipeline | `lib/insights-pipeline-performance.ts` → `computePipelinePerformance` | Une LO/plans/MAF para UI |
| UI stats | `PreviewPipelinePerformance.tsx`, `stats/page.tsx` | Visualización sin página nueva |
| Trade ledger | `lib/analytics.ts`, `PreviewStats.tsx` | **No** tocar para Scout |

---

## Separación de ledgers (obligatoria)

| Ledger | Fuente | UI | Prohibido |
|--------|--------|-----|-----------|
| **1 Trade realizado** | Trades/fills | `/stats` Statistics | Meter Scout R |
| **2 Scout counterfactual** | plan-outcome / Scout LO | Pipeline | Meter en WR/P/L |
| **3 Pipeline / MAF** | LO/OBS/MAF | Pipeline attribution | Mezclar con WR Trade |

---

## === PLAN P0 ===

Autorizado: implementar. Sin página/tabla/modelo nuevo.

### Paso 1 — Wire aggregates en Pipeline

* **Qué:** Exponer `triggeredPlansWithoutTrade` + thesis failure rate desde `computeScoutLearningAggregates` vía `computePipelinePerformance.counterfactual` y render en `PreviewPipelinePerformance`.
* **Archivos:** `lib/insights-pipeline-performance.ts`, `app/components/insights-preview/PreviewPipelinePerformance.tsx`, `tools/test-insights-pipeline-30-2c.ts`
* **Resultado esperado:** `/stats?tab=pipeline` muestra Triggered-without-Trade y thesis fail rate; markers `data-pipeline-triggered-without-trade`, `data-pipeline-thesis-failure-rate`.

### Paso 2 — Discovery terminal sin outcome + sync repair

* **Qué:** Banner/lista en Planning con Scouts `planNeedsStrategyReview` y `planNeedsLearningSyncRepair`; foco abre `PlanRecordOutcomePanel`; select case marca `needs outcome` / `sync repair`; preferir plan que necesita cierre cuando no hay Scout activo.
* **Archivos:** `lib/plan-helpers.ts`, `app/components/planning-preview/PreviewPlanning.tsx`
* **Resultado esperado:** Operador ve la cola sin depender solo de ATTN o del foco actual (`data-scout-learning-queue`).

### Paso 3 — Copy post-partialFailure + Retry Sync

* **Qué:** Mensaje Apply parcial apunta a Planning → Retry Learning Sync; panel sync repair aclara “no re-Apply / no reabrir evaluate_expired_plan”.
* **Archivos:** `lib/apply-trading-inbox.ts`, `app/components/planning-preview/PlanRecordOutcomePanel.tsx`
* **Resultado esperado:** Tras persist+sync fail, el siguiente paso es Retry Sync, no nuevo Apply.

### Orden de implementación

1. Paso 1 (aggregates)  
2. Paso 2 (discovery)  
3. Paso 3 (copy)  
4. Tests pipeline + markers UI  

### Riesgo

* Contaminación visual Trade↔Scout si copy es ambiguo → mitigar con labels “not P/L”.
* Preferencia `primaryPlan` hacia learning-close solo cuando **no** hay `watching|ready` → no desplaza Scouts vivos.

### Resultado esperado P0

Circuito usable en el día a día: ver métricas Scout ya calculadas, encontrar terminales sin outcome, reparar sync sin otra ronda de arquitectura.

### Fuera de P0

* P1: sección Scout Learning dedicada en hub `/stats`  
* Coach / export / Insights dimensional  
* Cambiar math de Trade Statistics  
* MAF durable store  

---

## Respuestas A–M (resumen)

| Q | Respuesta (evidencia en tablas arriba) |
|---|----------------------------------------|
| **A** Qué funciona | Apply UPL/duplicate → persist → sync → Pipeline |
| **B** Dónde se rompía | Sync parcial; discovery débil; aggregates half-rendered → **P0 cierra** |
| **C–E** Outcomes / sync | Ver flujo + `learningSyncStatus` |
| **F** Terminal obligatorio | `planNeedsStrategyReview` |
| **G–H** Aggregates | Calculados en `computeScoutLearningAggregates`; **P0 los muestra** |
| **I–J** /stats sin página nueva | Pipeline reutilizado |
| **K–M** Deuda residual | Dual contract legacy; MAF JSON; kinds UI incompletos — **no P0** |

---

## Instrucciones para la IA (siguiente iteración)

1. No re-auditar el repo entero — el circuito ya está explicado.  
2. Si falta algo, implementar el gap concreto con evidencia (archivo/símbolo).  
3. Mantener tres ledgers.  
4. P1 solo con autorización explícita.  
5. Cada conclusión: archivo + función/componente/símbolo + por qué.

---

*Library handoff — auditoría acotada + PLAN P0 ejecutable.*
