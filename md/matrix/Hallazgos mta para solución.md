# Hallazgos MTA para solución

**Prompt ID:** 24-1A  
**Fecha auditoría:** 2026-07-25  
**Modo:** AUDIT ONLY (sin código en el momento de la investigación)  
**Problema:** La IA externa no puede generar Apply JSON válido de forma fiable porque MTA exporta descripciones funcionales, no el schema completo que el validador exige — fallos repetidos en `technical-assessment`.

---

## Veredicto

El validador runtime de `technical-assessment` es **más estricto y completo** que lo que describen la mayoría de los exports hacia la IA.

Existe un sample válido completo (`AI_BLOCK_SAMPLES["technical-assessment"]`) incrustado en el JSON del Apply Schema Contract, pero las rutas habituales (protocolo MTAE / ticker request / Mechanics / prosa de AI blocks) describen procedimiento y presentación Evidence First — **no** las claves anidadas obligatorias que el validador rechaza.

**No hay Zod ni JSON Schema hoy.** Los enums canónicos viven en `lib/mtae-types.ts`; la validación es imperativa en `lib/mtae-validate.ts`.

---

## 1. Source-of-truth — archivos y funciones

| Rol | Archivo | Función / export |
|-----|---------|------------------|
| **A. Validador runtime (SoT para Accept)** | `lib/mtae-validate.ts` | `validateTechnicalAssessmentProposal` |
| Entrada Apply gate | `lib/bridge.ts` | `validateProposalPayload` → llama al validador si `type === "technical-assessment"` |
| Accept path | `lib/apply-trading-inbox.ts` | `applyTechnicalAssessmentBlock` |
| Persist / patch | `lib/mtae-apply.ts` | aplica la proposal ya validada |
| UI Validate / Accept | `app/components/matrix-connect/MatrixConnectWindow.tsx` | `validateProposalPayload` antes de Accept |
| **B. TypeScript types** | `lib/mtae-types.ts` | `MtaeTimeframeReport`, `MtaeIntegratedView`, `MtaeTechnicalSummary`, `MtaeMomentumAssessment`, consts de enums |
| **C. Exports hacia la IA** | `lib/mtae-brief.ts` | `buildMtaeProtocolBrief`, `buildMtaeTickerRequest` |
| | `lib/mtae-snapshot.ts` | snapshots Control Library MTAE (protocolo + TF maps) |
| | `lib/apply-schema-contract.ts` | `buildApplySchemaContract` / `buildApplySchemaContractText` |
| | `lib/ai-block.ts` | `SCOUTING_AI_BLOCK_REQUEST`, `DEFAULT_AI_BLOCK_REQUEST`, `AI_BLOCK_SAMPLES` |
| | `lib/load-control-panel-data.ts` | Train AI: Mechanics + Schema contract |
| | `lib/stock-file-analyze.ts` | empaqueta protocolo MTAE en analyze boot |
| Docs (no enforced) | `md/matrix/mtae-technical-analysis-engine.md`, `mtae-participation-layer.md` | JSON ilustrativo |

**SoT runtime = `validateTechnicalAssessmentProposal`.** Los types lo siguen de cerca. Los exports AI **no**.

### Ruta Apply (contexto)

```text
Paste JSON → MatrixConnectWindow / Control Apply
  → validateProposalPayload (bridge.ts)
    → validateTechnicalAssessmentProposal (mtae-validate.ts)
  → Accept → applyTechnicalAssessmentBlock → mtae-apply.ts
```

No hace falta rediseñar la pantalla Apply para corregir el gap; el fallo está en **qué recibe la IA antes de escribir el JSON**.

---

## 2. Schema actual exacto de `technical-assessment` (runtime)

Envelope:

```text
{ type: "technical-assessment", proposal: { ... } }
```

### `proposal` — required

| Campo | Reglas |
|-------|--------|
| `stockProfileId` | string no vacío (también acepta `id`) |
| `ticker` | no vacío |
| `timeframeRoles` | objeto con `strategic_tf`, `opportunity_tf`, `refinement_tf`, `execution_tf` (opcional `execution_detail_tf`) |
| `perTimeframe` | array no vacío |
| `integrated` | objeto |
| `technicalSummary` | objeto |
| `patchStockFile` | opcional; default `true` |
| `asOfPrice`, `timeframeMapId` | opcionales |

### Cada item de `perTimeframe[]`

**Required:** `timeframe`, `trend` (`bullish|neutral|bearish`), `structuralInvalidation`, `summary`

**Defaults / optional:** `trendConfidence` (default 50; también acepta `confidence`), `structure{}`, `supports[]`, `resistances[]`, `battleZones[]`, `contradictions[]`, `probableTarget` / `extendedTarget` (deben diferir si ambos existen), `participation?`, `role?`

Ranked levels (si hay items): `rank`, `reason`, `price` **o** `zone`, `confidence`  
Battle zones (si hay items): `low`, `high`, `reachProbability`, `asymmetryQuality`, `reason`, …

### `integrated` — required

| Campo | Reglas |
|-------|--------|
| `structureSpine` | string no vacío |
| `opportunityNote` | string no vacío |
| `executionContext` | string no vacío |
| `battleZoneRanking` | opcional (default `[]`) |
| `contradictions` | opcional |
| `participationSynthesis` | **opcional**; si está → objeto con `dominantCondition` required + arrays + `confidence` |
| `momentumAssessment` | **opcional**; si está → todos los campos de abajo required |

### `momentumAssessment` (cuando está presente)

| Campo | Tipo / enum |
|-------|-------------|
| `expansionPotential` | `high \| moderate \| low \| uncertain` |
| `currentState` | `directional_expansion \| constructive_compression \| range_rotation \| stagnation \| unstable_volatility` |
| `capitalEfficiencyConcern` | **boolean** (no string) |
| `rationale` | `string[]` no vacío |
| `scoutImplication` | `normal_entry_standard \| require_better_entry \| require_momentum_improvement \| standby` |
| `confidence` | 0–100 (default 50) |

Forbidden dentro de momentum: claves Scout/capital (`verdict`, `maximumEntry`, `shares`, …).

### `participationSynthesis` (cuando está presente)

`dominantCondition`: `accumulation|distribution|correction|squeeze|mixed|indeterminate`  
+ `buyingEvidence[]`, `sellingEvidence[]`, `unresolvedSignals[]`, `confidence`

### `technicalSummary` — required

| Campo | Reglas |
|-------|--------|
| `trend` | `bullish\|neutral\|bearish` |
| `structureNote` | no vacío |
| `structuralInvalidation` | no vacío |
| resto | opcional: zones, targets (deben diferir), `contradictions`, `confidence` (default 50) |

Forbidden: `maximumEntry`, `recommendedEntry`, `minimumRR`, `shares`, `scoutVerdict`, `whalesAreBuying`, etc.

---

## 3. Required por runtime, ausente / incompleto en exports AI

| Requisito runtime | Protocolo MTAE (`mtae-brief`) | Schema contract `requiredFields` | Prosa `SCOUTING_AI_BLOCK_REQUEST` | Snapshots MTAE Control |
|-------------------|-------------------------------|----------------------------------|----------------------------------|------------------------|
| `perTimeframe[].trend` | mencionado en pipeline, **no marcado required** | omitido (solo `perTimeframe[]`) | omitido | omitido |
| `perTimeframe[].summary` | **no nombrado** | omitido | omitido | omitido |
| `perTimeframe[].structuralInvalidation` | mencionado, no marcado required | omitido | omitido | omitido |
| `integrated.structureSpine` | **no como clave required** (Evidence First dice “Overall Technical Thesis”) | omitido | omitido | omitido |
| `integrated.opportunityNote` | **no nombrado** | omitido | omitido | omitido |
| `integrated.executionContext` | **no nombrado** | omitido | omitido | omitido |
| `technicalSummary.structureNote` | “Technical summary only” — **sin lista de keys** | omitido | prosa lista trend/zones/targets/invalidation/confidence — **falta `structureNote`** | omitido |
| `momentumAssessment.capitalEfficiencyConcern` **boolean** | solo nombre de campo | no en types/enums | solo nombre | omitido |
| `momentumAssessment.currentState` enum | nombre; **sin lista de enums** | **ausente** de `allowedEnums` | sin enums | omitido |
| Shape `participationSynthesis` | nombres parciales | no listado | no detallado | omitido |

**Nota:** Si la IA abre Train AI → Schema contract JSON completo, sí recibe `examples["technical-assessment"]` (sample válido). Muchas sesiones solo reciben protocolo MTAE / ticker request / Mechanics, **sin** ese sample.

---

## 4. Documentado / descrito pero no validado como required

| Ítem | Notas |
|------|--------|
| Orden Evidence First (Supports → Resistances → Bias → Confidence) | Contrato de **presentación/UI**, no claves JSON. Riesgo: la IA inventa objetos con forma de presentación. |
| `participation` / `participationSynthesis` / `momentumAssessment` | Muy documentados; **opcionales** en runtime si se omiten. |
| `supports` / `resistances` / `battleZones` no vacíos | El protocolo los anima; el validador acepta `[]`. |
| Flags `structure` por TF | Booleanos opcionales. |
| Ejemplo en `mtae-technical-analysis-engine.md` | Shape top-level; `perTimeframe` / `integrated` son placeholders — incompleto como plantilla. |

---

## 5. Desajustes de enums / tipos

| Tema | Types (`mtae-types`) | Validator | Exports AI / contract |
|------|----------------------|-----------|------------------------|
| `trend` | `bullish\|neutral\|bearish` | igual | a menudo sin nombrar |
| `momentumAssessment.expansionPotential` | 4 valores | igual | contract **lo tiene** |
| `momentumAssessment.scoutImplication` | 4 valores | igual | contract **lo tiene** |
| `momentumAssessment.currentState` | 5 valores (`MTAE_MOMENTUM_CURRENT_STATES`) | igual | **ausente** del contract y del brief MTAE |
| `movementCharacter.state` | `MTAE_EXPANSION_STATES` (`expanding\|contracting\|…`) | igual | brief lo menciona; **fácil de confundir** con `momentumAssessment.currentState` (enum distinto) |
| `capitalEfficiencyConcern` | `boolean` | rechaza no-boolean | la IA suele emitir `"true"` / narrativa |
| `rationale` | `string[]` | array no vacío | la prosa puede sugerir texto libre |
| `dominantCondition` | 6 valores | igual | doc participation OK; schema contract silencioso |
| Types vs validator en integrated/summary required | **Alineados** | **Alineados** | **La prosa AI diverge** |

- **A ↔ B:** mayormente alineados.  
- **A/B ↔ C:** **divergencia material** en claves nested required + enums incompletos.

---

## 6. ¿Puede un schema único generar validación + contrato AI hoy?

| Mecanismo | ¿Existe? | ¿Puede auto-generar contrato AI? |
|-----------|----------|----------------------------------|
| Zod / JSON Schema | **No** (solo `@types/json-schema` transitivo vía ESLint) | N/A |
| Validador imperativo | **Sí** — SoT | No automáticamente |
| Interfaces TS | **Sí** | Se borran en runtime; no exportan enums solos |
| Const arrays de enums en `mtae-types.ts` | **Sí** | Buena fuente para listas de enums |
| `AI_BLOCK_SAMPLES` | **Sí** — ejemplo válido | Bueno para ejemplo mínimo |
| `apply-schema-contract` | Resumen handwritten | Incompleto para nested MTAE |

**Conclusión:** Nada genera hoy el contrato AI desde el validador. Camino preferido: consts de `mtae-types` + un árbol declarative de required (o Zod más adelante) como canónico; derivar validación + export AI + min example desde ahí.

---

## 7. Solución mínima segura

**Principio:** un contrato Apply MTAE machine-readable; no mantener un segundo schema handwritten.

**Plan mínimo (esperar aprobación antes de codificar):**

1. Añadir un módulo declarative (p. ej. `lib/mtae-apply-schema.ts`) que exporte:
   - required paths (incl. nested)
   - todos los enums (importados de consts existentes en `mtae-types`)
   - tipos de campo (`boolean`, `string[]`, …)
   - forbidden keys
2. Hacer que `validateTechnicalAssessmentProposal` consuma esas tablas compartidas **o** (diff mínimo) que el export AI se genere desde las mismas tablas que importa el validador.
3. Cambiar superficies AI para que **siempre emitan** para `technical-assessment`:
   - lista nested required  
   - enums completos  
   - ejemplo mínimo válido (`AI_BLOCK_SAMPLES` o clone recortado)  
   Superficies: `buildMtaeProtocolBrief`, `buildApplySchemaContract`, opcionalmente `SCOUTING_AI_BLOCK_REQUEST`, `mtaeControlSnapshotItems`.
4. **No** rediseñar Apply UI, Mechanics, ni nuevos block types.
5. Mantener Evidence First como guía de presentación, etiquetando: **display order ≠ JSON keys**.

---

## 8. Archivos exactos a modificar (cuando se apruebe)

| Archivo | Cambio |
|---------|--------|
| `lib/mtae-apply-schema.ts` (**nuevo**) o extensión de `mtae-types.ts` | Paths required canónicos + re-export enums |
| `lib/mtae-validate.ts` | Importar tablas shared (evitar drift) |
| `lib/apply-schema-contract.ts` | Nested required de `technical-assessment` + `allowedEnums` completos |
| `lib/mtae-brief.ts` | Emitir keys required exactas + enums + ejemplo/puntero |
| `lib/mtae-snapshot.ts` | Snapshot: “technical-assessment schema + min example” |
| `lib/ai-block.ts` | Alinear prosa de `technical-assessment` con nested requirements |
| `tools/test-mtae-schema-contract.ts` (**nuevo**) o extender `test-schema-discipline` / `test-mtae-*` | Lock paridad A↔C |
| Docs (opcional, fino) | `md/matrix/mtae-technical-analysis-engine.md` — lista nested required |

**Fuera de alcance:** rediseño Apply, rewrite Mechanics, nuevos block types, refactors no relacionados.

---

## 9. Tests que deben añadirse

1. El export del contract incluye cada path que el validador rechaza si falta (`structureSpine`, `opportunityNote`, `executionContext`, per-TF `trend`/`summary`/`structuralInvalidation`, `technicalSummary.structureNote`).
2. `allowedEnums` del contract = arrays `MTAE_*` (sobre todo `currentState` vs `movementCharacter.state`).
3. El min example del export AI pasa `validateTechnicalAssessmentProposal`.
4. Omitir cada nested required falla con un string de error estable también presente en el texto del contrato AI.
5. `capitalEfficiencyConcern: "true"` (string) falla; `true` pasa.
6. `momentumAssessment` opcional malformado falla toda la proposal (comportamiento actual) y queda documentado.
7. Regresión: samples existentes de `test-mtae-participation` / `test-mtae-evidence-first` siguen pasando.

---

## 10. Riesgos del cambio propuesto

| Riesgo | Mitigación |
|--------|------------|
| Docs AI más largos | Bloque compacto “REQUIRED KEYS + ENUMS + MIN JSON”; narrativa del protocolo aparte |
| Dual-write validador + schema sigue divergiendo | Tablas shared importadas por ambos; test paridad A↔C |
| Migración Zod demasiado grande | Fase 1: solo consts/required tree; Zod opcional después |
| Sample se queda stale vs validador | Test: sample debe validar |
| Confusión Evidence First permanece | Línea explícita: presentation labels ≠ Apply keys |
| Churn del Apply Schema Contract en otros block types | Tocar solo la sección nested de `technical-assessment` primero |

---

## Estado

- Auditoría y plan mínimo: **entregados**.
- Implementación de código: **pendiente de aprobación explícita**.
