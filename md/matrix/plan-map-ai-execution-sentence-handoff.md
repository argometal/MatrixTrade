# MTA · Plan Map AI execution sentence — Handoff

**Fecha:** 2026-07-31  
**Baseline:** `main` @ `a3e0006`  
**Branch:** `cursor/plan-map-ai-execution-sentence-b0a5`  
**Commit:** `48c3c8c`  
**PR:** https://github.com/argometal/MatrixTrade/pull/132 (draft)  
**Prod:** https://matrix-trade-theta.vercel.app — **aún no merged / no desplegado**  
**Alcance:** solo la frase bajo el header del Plan Map

---

## Veredicto

La frase del Plan Map **dejó de ser un formatter determinista**.  
Ahora es **`executionInstruction`**: texto operacional escrito por la IA (capa de explicación).  
Si la IA no lo envía → **no hay frase** (sin fallback a plantilla).

---

## Exacto qué se cambió

### Antes

Plan Map generaba la frase con `formatPlanMapOperationalParagraph` (`lib/scout-plan-map-operational.ts`) vía `buildPlanMapModel`:

```text
Enter at 310 with stop at 294 and primary target at 380.
```

### Ahora

`buildPlanMapModel` solo resuelve texto AI persistido:

```text
operationalParagraph = resolvePlanMapExecutionInstruction(plan.executionInstruction)
```

Ejemplos de wording (vienen **enteros** de la IA; Matrix no los arma):

```text
Buy 8 shares at exactly $310.00. Place the stop immediately at $294.00. …
Buy the first 30% at $310. Add 40% at $305 if reached …
```

### Archivos tocados (21)

| Archivo | Cambio exacto |
|---------|----------------|
| `lib/scout-execution-instruction.ts` | **NUEVO** — normalize / resolve / guidance de snapshot |
| `lib/plan-types.ts` | Campo `TradePlan.executionInstruction?` + `SavePlanInput` |
| `lib/scout-plan-map-model.ts` | Plan Map usa solo AI text; **ya no llama** al formatter |
| `lib/plan-levels-board.ts` | Pasa `executionInstruction` en `PlanLevelsView` |
| `lib/scout-plan-map-operational.ts` | Formatter legado marcado como no-UI (tests / tooling) |
| `lib/scout-plan-repair.ts` | Apply `decision-update` persiste `executionInstruction` |
| `lib/scout-plan-create.ts` | Apply `scout-plan-create` puede setear el campo |
| `lib/bridge.ts` | Campo táctico válido en validate |
| `lib/apply-verify.ts` | Verify post-Apply del string |
| `lib/plans.ts` / `lib/plans-store/mapping.ts` | Persistencia + sidecar jsonb (decision / layered_entry) |
| `lib/plan-snapshot.ts` | Sección actual + guidance para la IA |
| `lib/matrix-mechanics-brief.ts` | Regla Plan Map sentence |
| `lib/matrix-mechanics-snapshot.ts` | `MATRIX_MECHANICS_REVISION` **35 → 36** |
| `lib/ai-block.ts` | Docs + samples incluyen `executionInstruction` |
| `lib/load-scoped-scout-context.ts` | Request scoped menciona el campo |
| `supabase/trade-plans-execution-instruction.sql` | **NUEVO** — columna opcional `execution_instruction` |
| `package.json` | Script `test:scout-execution-instruction` |
| `tools/test-scout-execution-instruction.ts` | **NUEVO** |
| `tools/test-plan-map-operational.ts` | Aserciones = AI-only / sin template |
| `tools/test-control-sanity-snapshots.ts` | Expect rev **36** |

### UI

**Sin cambios** de layout, timeline, targets, cards, badges, risk calculations.  
Solo cambia la **fuente** de `model.operationalParagraph` en `PlanLevelsBoard`.

---

## Verificación

| Check | Resultado |
|-------|-----------|
| `npm run test:scout-execution-instruction` | **PASS** |
| `npm run test:plan-map-operational` | **PASS** |
| `npm run test:scout-plan-map` | **PASS** |
| `npm run test:control-sanity-snapshots` | **PASS** |
| `npx tsc --noEmit` | **PASS** |
| Merge a `main` | **NO** |
| Deploy prod | **NO** |
| SQL columna en Supabase prod | **NO** (opcional; hoy sidecar jsonb) |
| Verificación humana en UI prod | **NO** |

---

## Qué afecta

| Capa | ¿Afecta? | Cómo |
|------|----------|------|
| Plan Map frase bajo header | **SÍ** | Solo muestra AI text o nada |
| Apply `decision-update` | **SÍ** | Acepta `proposal.executionInstruction` |
| Apply `scout-plan-create` | **SÍ** | Idem |
| Snapshots / Mechanics | **SÍ** | Guidance + rev 36 |
| Sizing / R / layeredEntry math | **NO** | Explicación only |
| Persistencia estructurada (entry/stop/target/layers) | **NO** | No se parsea el texto hacia números |
| Timeline / cards / badges | **NO** | Intactos |
| PR #125 (execution description 30-16) | **Relacionado / opuesto** | #125 reforzaba proyección determinista; este PR la **revoca para Plan Map** |

---

## Otros comentarios

1. **Planes existentes** sin `executionInstruction` → Plan Map **sin frase** hasta que la IA la proponga y el humano Apply/Accept.
2. **No hay LLM in-app.** La IA externa (Cursor/Chat) escribe el string; Matrix solo lo guarda y lo muestra.
3. Persistencia hoy: top-level en JSON store; en Supabase se anida como sidecar en `decision` / `layered_entry` jsonb hasta correr el SQL opcional.
4. El formatter `formatPlanMapOperationalParagraph` **sigue en el repo** pero **no alimenta** Plan Map.
5. No inventar precios/shares/risk en el texto; omitir lo que no esté en el Scout Plan.
6. Open en paralelo (no parte de este PR): #130 audit handoff · #131 Apply→Verify unify · #125 draft execution description.

---

## Instrucciones para la IA (handoff operativo)

Úsalas como en otros handoffs MTA: Analysis Mode por defecto; Apply Mode solo con intent explícito.

### Regla de la frase

Cuando propongas ejecución actionable en un Scout (`scout-plan-create` o `decision-update` con geometría de entrada), incluye:

```json
"executionInstruction": "<instrucción operacional concisa para el trader humano>"
```

- Tono: portfolio manager / desk — claridad operacional, **no** resumen de cards.
- Puedes usar: layered entries, allocation, risk autorizado, stop/target, OA, playbook, notes, special instructions.
- Si falta un dato → **omítelo**. Nunca inventes precios, shares, risk o allocations.
- Matrix muestra el string **tal cual** bajo el header del Plan Map. No es fuente de cálculo.

### Ejemplo single-entry

```json
{
  "type": "decision-update",
  "proposal": {
    "planId": "PLAN-007",
    "executionInstruction": "Buy 8 shares at exactly $310.00. Place the stop immediately at $294.00. Maximum planned risk is approximately $100. Hold until the primary target at $380. Do not chase above the planned entry. If price never reaches the planned entry, do not execute the trade."
  }
}
```

### Ejemplo layered

```json
{
  "type": "scout-plan-create",
  "proposal": {
    "stockFileId": "ST-AMZN-001",
    "ticker": "AMZN",
    "plannedEntry": 215,
    "stopPrice": 200,
    "targetPrice": 260,
    "layeredEntry": { "...": "structured limits only — Matrix sizes shares" },
    "executionInstruction": "Buy the first 30% at $215. Add 40% at $210 if reached and complete at $205. Use the common stop at $200 for the full position. Hold until $260 unless the thesis changes. Do not chase. Unreached layers stay unfilled."
  }
}
```

### Flujo Apply (inalterado)

```text
Snapshot / contexto Scout
  → Analysis Mode (diálogo)
  → usuario pide Apply / Save / Persist
  → UN bloque JSON
  → Control → Apply → Validate → Accept
```

Schema-first: copiar contrato Apply antes de inventar keys.

### Qué NO hacer

- No regenerar la frase desde entry/stop/target en código o en prompts rígidos.
- No parsear `executionInstruction` para mutar `layeredEntry` / precios.
- No cambiar layout del Plan Map, risk engine, ni OA mappings en follow-ups de este handoff salvo pedido explícito.
- No mergear #125 encima sin reconciliar: choca con “no deterministic Plan Map sentence”.

### Tests de regresión

```bash
npm run test:scout-execution-instruction
npm run test:plan-map-operational
npm run test:scout-plan-map
npm run test:control-sanity-snapshots
```

### Tras merge (humano)

1. Merge PR #132  
2. (Opcional) correr `supabase/trade-plans-execution-instruction.sql` en Supabase  
3. Verificar en `/planning` que un plan **sin** instruction no muestra frase plantilla  
4. Apply un `decision-update` con `executionInstruction` y confirmar texto bajo el header  

---

*Handoff de entrega — PR #132 · branch `cursor/plan-map-ai-execution-sentence-b0a5`*
