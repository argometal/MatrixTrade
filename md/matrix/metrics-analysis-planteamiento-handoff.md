# MTA · Metrics analysis planteamiento — Library handoff

**Fecha:** 2026-08-03  
**Audience:** ChatGPT · Cursor · agentes — cómo leer y mejorar “lo que hacemos”  
**Status:** Planteamiento canónico (docs). UI Learning Scout dedicada = pendiente.  
**Repo:** https://github.com/argometal/MatrixTrade · **Prod:** https://matrix-trade-theta.vercel.app

---

## Veredicto

El problema no es “cero métricas”. Es que hay **varios ledgers** y la UI/hábito de lectura no los une.

**Planteamiento:** tres mundos de números, nunca mezclados.

| Ledger | Pregunta | Dónde hoy |
|--------|----------|-----------|
| **1. Trade realizado** | ¿Qué pasó en fills reales? | `/stats` → **Statistics** (WR, expectancy, R, DD, PF) |
| **2. Scout / plan counterfactual** | ¿Qué hubiéramos perdido/ganado sin trade? | UPL / counterfactual R — libs + Pipeline; **no** en WR |
| **3. Pipeline / attribution** | ¿Dónde se rompe la expectancy? | `/stats` → **Pipeline Performance** (LO / OBS / MAF) |

**Motor Analytics (gap formal):** Opportunity · Execution · Attribution · Sample Quality — [`matrix-trading-analytics-gap-001.md`](matrix-trading-analytics-gap-001.md) (library only; no implementation).

Más el **desk vivo** (`/planning`): monetary *ex-ante* y OA — **no** es outcome ledger.

**Regla dura:** Scout ≠ Trade. Win rate / P/L solo de trades cerrados.

---

## Por qué “no se puede analizar claro”

1. Statistics mira trades; Pipeline mira Learning — **poco join** en UI.  
2. Agregados Scout (UPL, counterfactual R, triggered-without-trade) existen en código (`lib/learning-scout-aggregates.ts`) pero **no hay Learning surface de primer nivel**.  
3. MAF corpus débil / store frágil → no responde bien “qué etapa mata expectancy”.  
4. Desk (potential R, OA) ≠ outcome (`plan-outcome` + learning sync). Sin Apply de outcomes, el ledger queda incompleto.  
5. Contaminación: leer Dashboard/Stats como si fueran “todo lo que hacemos”.

---

## Qué usar ya (operativo)

1. `/stats` → **Statistics** = solo ciclo Trade cerrado.  
2. `/stats` → **Pipeline Performance** = LO / OBS / MAF (separado).  
3. Registrar **`plan-outcome`** en Scouts terminales sin trade (UPL / duplicate).  
4. No mezclar counterfactual Scout R en WR / equity curve.

---

## Qué falta (orden de producto)

| Prioridad | Trabajo | Objetivo |
|-----------|---------|----------|
| **P0** | Hábito + Apply `plan-outcome` + sync LO/OBS | Ledger Scout completo |
| **P1** | Vista Learning Scout (agregados UPL / counterfactual / triggered-without-trade) | Análisis “qué hicimos en Scout” sin contaminar Trade |
| **P2** | MAF durable + más atribuciones | Drill “primary drag” / etapa |
| **P3** | Coach / expectancy dimensional / export `metrics/` | Solo con corpus suficiente |

---

## Mapa código / docs

| Pieza | Path |
|-------|------|
| Trade stats | `lib/analytics.ts` · `lib/load-stats-page-data.ts` · `PreviewStats` |
| Pipeline Insights | `lib/insights-pipeline-performance.ts` · `PreviewPipelinePerformance` · `md/insights/pipeline-performance-30-2c.md` |
| Scout LO aggregates | `lib/learning-scout-aggregates.ts` |
| Plan outcome / UPL | `lib/plan-outcome*.ts` · `md/matrix/plan-outcome-upl-25-29.md` |
| Runtime truth | `md/matrix/runtime-truth.md` |
| Ontology Scout | `md/matrix/scout-ontology-scoutplan.md` |
| Library backlog | `md/matrix/library-alignment-backlog.md` |

---

## Instrucciones para la IA

Cuando el humano pregunte “cómo vamos” / “métricas” / “expectancy”:

1. Preguntar **qué ledger**: Trade · Scout counterfactual · Pipeline.  
2. No reportar WR de trades como performance de Scouts.  
3. Si faltan `plan-outcome` / atribuciones MAF → decir que el análisis está **incompleto por datos**, no por falta de concepto.  
4. Proponer Apply `plan-outcome` o `attribution` solo en Apply Mode con intent explícito.  
5. No inventar MFE/MAE, fills ni R.

---

## Relacionados

- Insights: `md/insights/pipeline-performance-30-2c.md`  
- UPL: `md/matrix/plan-outcome-upl-25-29.md`  
- Learning plan: `md/matrix/plan-outcome-learning-001.md`  
- Handoff vivo: `CHAT-HANDOFF.md`

---

*Library handoff — planteamiento de métricas para agentes.*
