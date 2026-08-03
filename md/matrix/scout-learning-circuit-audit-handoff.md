# MTA · Scout Learning circuit audit — Library handoff

**Fecha:** 2026-08-03  
**Mode:** auditoría arquitectónica — **sin implementación autorizada**  
**Baseline auditada:** `main` @ `f284719`  
**Audience:** ChatGPT · Cursor · agentes  
**Referencia canónica previa:** `md/matrix/metrics-analysis-planteamiento-handoff.md`

**Reglas respetadas en la auditoría:** no tablas/modelos/ontología/páginas nuevas; no mezclar ledgers; no Coach/export/analytics dimensionales; reutilizar antes de proponer.

---

## Veredicto

El circuito **Scout → plan-outcome → LO/OBS → Pipeline** ya funciona para UPL/duplicate.  
El estancamiento es **cierre operativo + visibilidad**, no falta de arquitectura.

**P0:** wire aggregates ya calculados en `/stats?tab=pipeline` + discovery de Scouts terminales sin outcome — sin página nueva.  
**P1:** sección Scout Learning en `/stats` (tab/subsección).  
**No implementar** hasta autorización explícita.

---

## Respuestas A–M

| Q | Respuesta |
|---|-----------|
| **A** Qué funciona | Apply UPL/duplicate → persist → sync LO/OBS → Verify `learningSyncStatus=complete` → Pipeline muestra evaluated/UPL/counterfactual R. Statistics Trade-only limpio. Control Clear + Snap Failure. Idempotencia UPL; duplicate excluded. |
| **B** Dónde se rompe | Sync puede fallar tras persist (`partialFailure` → Retry manual). Legacy path sin `outcomeKind`. UI Apply solo 2 kinds. Record Outcome solo en scout enfocado. Aggregates `triggeredPlansWithoutTrade` / thesis **calculados no visibles**. |
| **C** Outcomes | Apply 1ª clase: `unexecuted_plan_loss`, `duplicate_creation`. Legacy/derive: missed/expired/cancelled/invalidated. Triggered-without-trade = métrica, no kind. Executed = trade-close LO, no plan-outcome. |
| **D** Sync LO/OBS | `syncPlanOutcomeLearning` → upsert LO → OBS (UPL) → link → verify → `learningSyncStatus`. Idempotente. |
| **E** Persist OK, sync fail | Outcome queda; `failed` + ATTN repair; evaluate_expired_plan **no reabre**; solo Retry. |
| **F** Terminal sin outcome obligatorio | `failed\|expired\|skipped` → review hasta `recordedAt`. `watching\|ready\|entered` no. |
| **G** Aggregates | `evaluatedScoutCount`, `unexecutedPlanLossCount`, `counterfactualScoutR`, `triggeredPlansWithoutTrade`, thesis counts/rate (`computeScoutLearningAggregates`). |
| **H** No visibles | `triggeredPlansWithoutTrade`, thesis failure*, rollups `nonExecutionReason`, sync diagnostics fuera del banner. |
| **I** `/stats` sin página nueva | **Sí** — hub tabs; Pipeline ya es la superficie Scout/Learning. |
| **J** Reutilizar | `PreviewPipelinePerformance`, `computePipelinePerformance`, `computeScoutLearningAggregates`, loaders `stats/page.tsx`, ATTN `planNeedsStrategyReview`. No: `PreviewStats`/`analytics.ts` para Scout. |
| **K** Deuda diaria | Dual contract UPL/legacy; sync manual; panel solo foco; MAF JSON; kinds UI incompletos; half-rendered aggregates. |
| **L** Manual hoy | Confirmar orden eventos + reason; Save/Accept outcome; Retry sync; MAF aparte; broker human. |
| **M** Gaps datos | Sin auto mercado; terminales sin outcome; sync failed; geometry/risk ausente bloquea UPL; poco MAF. |

---

## Flujo actual

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

| Etapa | Path / símbolo |
|-------|----------------|
| Review gate | `lib/plan-helpers.ts` → `planNeedsStrategyReview` |
| ATTN | `lib/plan-attention.ts`, `lib/needs-attention-ai.ts` → `evaluate_expired_plan`, `sync_plan_outcome_learning` |
| UI outcome | `PlanRecordOutcomePanel.tsx`, `PreviewPlanning.tsx` |
| Actions | `app/actions.ts` → `recordPlanOutcomeAction`, `retryPlanOutcomeLearningSyncAction` |
| Validate | `lib/plan-outcome*.ts` → `validatePlanOutcomeProposal`, `validateUnexecutedPlanLossEligibility` |
| Bridge / Apply | `lib/bridge.ts`, `lib/apply-trading-inbox.ts` |
| Persist + sync | `lib/plan-outcome.ts` → `persistPlanOutcome`, `applyPlanOutcomeProposal`; `lib/plan-outcome-learning-sync.ts` → `syncPlanOutcomeLearning` |
| Verify | `lib/apply-verify.ts` → `verifyPlanOutcomePersistence` |
| Aggregates | `lib/learning-scout-aggregates.ts` → `computeScoutLearningAggregates` |
| Pipeline | `lib/insights-pipeline-performance.ts` → `computePipelinePerformance` |
| UI stats | `app/(trading)/(nav)/stats/page.tsx`, `PreviewInsightsHub.tsx`, `PreviewPipelinePerformance.tsx`, `PreviewStats.tsx` |
| Trade ledger | `lib/load-stats-page-data.ts`, `lib/analytics.ts` |
| Apply UX | `ControlPanelUpdate.tsx` — Clear, Snap Failure, auto-clear |
| Types | `lib/plan-outcome-types.ts` → `PLAN_OUTCOME_KINDS` |
| Tests | `tools/test-plan-outcome-upl-25-29.ts`, `test-plan-outcome-learning-sync.ts`, `test-insights-pipeline-30-2c.ts` |

### Stores / tablas (reutilizar)

- Plans: `getPlansStore` → Supabase `trade_plans` / JSON (`outcome` jsonb)  
- LO: `getLearningOutcomesStore` → `learning_outcomes` / JSON  
- OBS: `getObservationsStore`  
- MAF: `getMafExperiments` (JSON — frágil)  

### Endpoints

- Inbox / Control Apply (server actions)  
- Stats SSR loaders en `stats/page.tsx`  
- `/api/ai/stats` = Trade/playbook — **no** Scout Learning  

### Validadores

- `PLAN_OUTCOME_KINDS` = `unexecuted_plan_loss` \| `duplicate_creation`  
- `SCOUT_EVALUATED_LO_KINDS` = UPL + `missed_opportunity` (+ cancel/expire vía derive)  
- Verify exige `learningSyncStatus=complete`  

---

## Separación de ledgers (obligatoria)

| Ledger | Fuente | UI hoy | Prohibido |
|--------|--------|--------|-----------|
| **1 Trade realizado** | Trades/fills | `/stats` Statistics | Meter Scout R |
| **2 Scout counterfactual** | plan-outcome / Scout LO | Pipeline (parcial) | Meter en WR/P/L/equity |
| **3 Pipeline / MAF** | LO/OBS/MAF | Pipeline attribution | Mezclar con WR Trade |

---

## Datos incompletos / ruptura / riesgos

**Ruptura:** persist ≠ sync complete; legacy sin sync status; sync repair sin Apply block; discovery terminal-sin-outcome débil; aggregates half-rendered.

**Duplicación:** re-Accept UPL = sync retry (OK); segundo outcome distinto = reject (OK); legacy+UPL paralelo = riesgo.

**Contaminación:** Statistics limpio; Pipeline riesgo de **lectura humana**; duplicate excluded.

**Deuda:** dual schemas; MAF JSON; UI kinds incompletos; authorizedRisk opcional → $ null.

---

## Checklist P0 (1–11)

| # | Item | Estado |
|---|------|--------|
| 1 | plan-outcome desde UI | Sí — Planning + Control Apply |
| 2 | Clear tras éxito/error Apply | Sí — `ControlPanelUpdate` |
| 3 | Clear manual | Sí |
| 4 | Snap Failure | Sí |
| 5 | Outcomes fáciles | Parcial — solo foco + ATTN |
| 6 | Confirmación | Sí — form + preview UPL |
| 7 | Identificar terminal sin outcome | Sí ATTN / `planNeedsStrategyReview`; lista UX débil |
| 8 | Visible en /stats | Parcial — Pipeline, no Statistics |
| 9 | Idempotente | Sí |
| 10 | Duplicate contaminar | No — excluded |
| 11 | Fallo parcial | Mitigado — Retry; residual legacy |

---

## Arquitectura P0 recomendada (mínimo cambio)

1. Extender `/stats?tab=pipeline` para mostrar aggregates ya producidos (`triggeredPlansWithoutTrade`, thesis rates si trivial).  
2. Discovery: lista/banner Scouts `planNeedsStrategyReview` (reusar ATTN) — no solo panel del foco.  
3. Copy claro post-`partialFailure` + Retry Sync visible.  
4. No ampliar Insights wide / Coach / export.  
5. No tocar Ledger 1 Trade math.

**Archivos P0 (cuando autoricen):**  
`PreviewPipelinePerformance.tsx` · `insights-pipeline-performance.ts` · `PreviewPlanning.tsx` / ATTN copy · tests `test-insights-pipeline-30-2c.ts` · posiblemente hub labels.

---

## Arquitectura P1 recomendada (no implementar aún)

Sección **Scout Learning** en `/stats` (tab Pipeline ampliado o tab hermano):

- Loader: `stats/page.tsx` / `pipelineInput`  
- UI: reutilizar `PreviewPipelinePerformance`  
- Datos: `computeScoutLearningAggregates` completo  
- Vacío: “No evaluated Scouts — record plan-outcome…”  
- **No mostrar:** Coach, expectancy dimensional MAF, equity Scout inventada  

---

## Pruebas requeridas (tras auth)

- Existentes: UPL, learning-sync, insights-pipeline  
- Añadir: assertion aggregates visibles; terminal-without-outcome discovery; regression Statistics sin LO  

## Cambios que NO realizar

Tablas/modelos/ontología/páginas nuevas · mezclar ledgers · counterfactual en WR · Coach/export/metrics dimensional · auto-broker · Insights amplio · merge sin autorización  

---

## Orden de implementación (cuando autoricen)

1. Merge PR #133 (docs) — desbloquea raw main  
2. P0: wire aggregates + discovery terminal sin outcome  
3. P0: copy Retry sync  
4. Tests  
5. P1 Scout Learning section  
6. Luego (fuera P0): MAF durable  

**Bloqueador actual:** autorización explícita — no código duro.

---

## Estado PR #133 (docs metrics planteamiento)

| Campo | Valor |
|-------|--------|
| URL | https://github.com/argometal/MatrixTrade/pull/133 |
| State | OPEN draft |
| Mergeable | MERGEABLE / CLEAN |
| CI | Vercel SUCCESS |
| Auto-merge | **No** — pendiente OK humano |
| Raw main | **404** hasta merge |
| Raw branch | `https://raw.githubusercontent.com/argometal/MatrixTrade/cursor/metrics-planteamiento-handoff-b0a5/md/matrix/metrics-analysis-planteamiento-handoff.md` |

---

## Instrucciones para la IA

1. Leer este handoff + `metrics-analysis-planteamiento-handoff.md` antes de proponer Insights nuevos.  
2. Mantener tres ledgers separados.  
3. Proponer solo P0 mínimo sobre `/stats` Pipeline + Planning/ATTN.  
4. No implementar sin “autorización explícita” / “procede”.  
5. Citar archivos concretos en cualquier plan.

---

*Library handoff — auditoría circuito Scout Learning. Sin código hasta autorización.*
