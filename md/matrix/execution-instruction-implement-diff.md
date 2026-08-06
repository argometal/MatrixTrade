# Diff legible — ExecutionInstruction mandatory + architecture docs

**Branch:** `cursor/plan-map-ai-execution-sentence-b0a5`  
**PR:** https://github.com/argometal/MatrixTrade/pull/132  
**Fecha:** 2026-07-31  
**Para Chat / agentes:** leer este archivo + rutas abajo (no hace falta GitHub UI).

---

## Rutas exactas (repo root)

```text
md/matrix/execution-instruction-spec.md
md/matrix/scout-ontology-scoutplan.md
md/matrix/execution-instruction-architecture-follow-up.md
md/matrix/execution-instruction-spec.md
md/matrix/execution-instruction-implement-diff.md   ← este archivo
CHAT-HANDOFF.md
lib/scout-execution-instruction.ts
lib/bridge.ts
lib/scout-plan-create-validate.ts
lib/apply-verify.ts
lib/ai-block.ts
lib/matrix-mechanics-brief.ts
lib/matrix-mechanics-snapshot.ts
tools/test-execution-instruction-mandatory.ts
```

---

## Qué se implementó (esta pasada)

### 1. Spec canónica (nueva)

`md/matrix/execution-instruction-spec.md` — purpose, mandatory, tone, structure, required/optional, wording domains, forbidden, examples.

### 2. Ontología ScoutPlan (nueva)

`md/matrix/scout-ontology-scoutplan.md` — un aggregate, proyecciones Plan Map / ATTN / Dashboard / Learning / Trade.

### 3. Gate schema (código)

- `scout-plan-create` → `executionInstruction` **siempre requerido**
- `decision-update` con `plannedEntry` | `stopPrice` | `targetPrice` | `layeredEntry` → **requerido**
- OA / verdict / readiness / window-only → **no** requerido
- Helper: `requireExecutionInstructionForGeometry` en `lib/scout-execution-instruction.ts`
- Wired en `lib/bridge.ts` + `lib/scout-plan-create-validate.ts`

### 4. Apply Verify

- `decision-update`: ya verificaba persistencia del string
- `scout-plan-create`: ahora verifica `executionInstruction` si venía en el proposal

### 5. Mechanics / AI prompts

- Brief + scoped request: REQUIRED + pointer al spec
- `MATRIX_MECHANICS_REVISION` **36 → 37**
- PR #125 marcado superseded para Plan Map (no restaurar template)

### 6. Tests

```bash
npm run test:execution-instruction-mandatory
npm run test:scout-execution-instruction
npm run test:plan-map-operational
npm run test:control-sanity-snapshots
```

---

## Diff conceptual (antes → después)

### Antes (#132 initial)

- Campo `executionInstruction` **opcional**
- Plan Map muestra AI text o **nada**
- Spec solo en architecture follow-up draft
- #125 aún conflictivo / abierto

### Después (esta implementación)

- Campo **mandatory** en create + geometry mutation (Validate reject)
- Verify confirma persistencia
- Spec canónico en archivo propio
- Ontología documentada
- #125 superseded en Mechanics / handoff (no deterministic Plan Map)

---

## Qué NO cambió

- Plan Map layout / timeline / cards / badges / risk math  
- No hay generator determinista de la frase  
- No rename `TradePlan` → `ScoutPlan` en código  
- Legacy plans sin instruction: siguen sin frase hasta backfill (gate no auto-heals history)

---

## PR #125

**Decisión:** no mergear como fuente de frase Plan Map.  
Evolucionar solo a guidance/integrity o cerrar.  
Documentado en Mechanics + architecture follow-up.

---

## Cómo citar en Chat

```text
Lee estos archivos del repo MatrixTrade (branch cursor/plan-map-ai-execution-sentence-b0a5):

1. md/matrix/execution-instruction-implement-diff.md
2. md/matrix/execution-instruction-spec.md
3. md/matrix/scout-ontology-scoutplan.md
4. CHAT-HANDOFF.md (sección Pending — Plan Map AI execution sentence)
```

---

*Fin diff legible*
