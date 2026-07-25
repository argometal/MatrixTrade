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

- Auditoría: **entregada**.
- Plan de implementación acotado (sección 11): **entregado**.
- Implementación de código: **pendiente de aprobación explícita**.

---

## 11. Proposed implementation plan

**Prompt ID:** 24-22  
**Decision rule applied:** Extend existing `apply-schema-contract` + `AI_BLOCK_SAMPLES` infrastructure. Do **not** create a second parallel contract system. Do **not** refactor/replace the runtime validator. No Zod. No app-wide JSON Schema.

### How the AI receives the contract today (Control flow)

| Surface | Path | Builder | Gap today |
|---------|------|---------|-----------|
| Primary handshake | Control → Train AI → **Apply schema contract** | `buildApplySchemaContractText()` via `load-control-panel-data.ts` → `MatrixControlPanel` `PlainCopyRow` | Nested required paths + most MTAE enums missing from `requiredFields` / `allowedEnums` (example JSON is already embedded) |
| MTAE procedure | Control → Library → **MTAE** → protocol | `buildMtaeProtocolBrief()` | Functional procedure; nested Apply keys under-specified |
| MTAE snapshots | Control → Library → MTAE → TF map items | `mtaeControlSnapshotItems()` | No schema / min-example snapshot |
| Analyze boot | Stock File analyze package | includes `buildMtaeProtocolBrief()` | Same gap as protocol |
| Sample blocks | Train AI contract JSON `examples["technical-assessment"]` | `AI_BLOCK_SAMPLES["technical-assessment"]` | Valid but heavy; not labeled as the contract min example; prose in `SCOUTING_AI_BLOCK_REQUEST` omits nested required |

**Target after this plan:** Train AI schema contract alone is sufficient for a correct Apply JSON. MTAE protocol + one MTAE snapshot reinforce the same nested required list, enums, and a **minimum valid example**, without a second contract system.

---

### 1. Files to modify

Smallest set (implementation phase — not done yet):

1. `lib/apply-schema-contract.ts`
2. `lib/ai-block.ts`
3. `lib/mtae-brief.ts`
4. `lib/mtae-snapshot.ts`
5. `tools/test-mtae-schema-export.ts` (**new** test only)
6. `package.json` (npm script only)
7. `md/matrix/Hallazgos mta para solución.md` (this section — docs only)

**Explicitly not modified:** `lib/mtae-validate.ts`, Apply UI, Accept/persist, Stock Files, Scouts, Trades, MAF, Mechanics (except zero changes unless a one-line pointer is later approved — **default: leave Mechanics untouched**).

---

### 2. Exact changes per file

#### 2.1 `lib/apply-schema-contract.ts`

| Item | Detail |
|------|--------|
| **Exports / functions** | `ApplySchemaContract` type; `buildApplySchemaContract()`; `buildApplySchemaContractText()` |
| **Exact change** | (a) Expand `requiredFields["technical-assessment"]` to include dotted nested paths that the validator enforces. (b) Expand `allowedEnums` by **importing** consts from `lib/mtae-types.ts` (not hand-duplicating string lists). (c) Add a nested `technicalAssessment` detail block on the contract object (same pattern as existing `stockCaseCreate`) describing required nested fields, optional-when-present shapes, field types, forbidden keys, and notes. (d) In `buildApplySchemaContractText()`, add a short **TECHNICAL-ASSESSMENT (hard)** section that prints those nested required paths, enums, field types, and points at `examples["technical-assessment"]` / min example. (e) Wire `examples["technical-assessment"]` to a named minimum valid example export from `ai-block.ts` (see 2.2), keeping the full rich sample available separately if desired. |
| **Required nested paths to list (must match validator)** | Top: `stockProfileId`, `ticker`, `timeframeRoles.strategic_tf\|opportunity_tf\|refinement_tf\|execution_tf`, `perTimeframe[]` (non-empty), `integrated`, `technicalSummary`. Per TF: `perTimeframe[].timeframe`, `perTimeframe[].trend`, `perTimeframe[].structuralInvalidation`, `perTimeframe[].summary`. Integrated: `integrated.structureSpine`, `integrated.opportunityNote`, `integrated.executionContext`. Technical summary: `technicalSummary.trend`, `technicalSummary.structureNote`, `technicalSummary.structuralInvalidation`. |
| **Enums to export (from `mtae-types` consts)** | `trend` → `bullish\|neutral\|bearish` (inline or shared const). `momentumAssessment.expansionPotential` ← `MTAE_EXPANSION_POTENTIALS`. `momentumAssessment.currentState` ← `MTAE_MOMENTUM_CURRENT_STATES`. `momentumAssessment.scoutImplication` ← `MTAE_SCOUT_IMPLICATIONS`. `participationSynthesis.dominantCondition` ← `MTAE_DOMINANT_CONDITIONS`. Also surface (for optional participation) `movementCharacter.state` ← `MTAE_EXPANSION_STATES` with an explicit note that it is **not** the same enum as `momentumAssessment.currentState`. Optionally list candle/volume enums already used by the sample for completeness. |
| **Shapes / types to document** | `participationSynthesis`: `{ dominantCondition, buyingEvidence[], sellingEvidence[], unresolvedSignals[], confidence }` — optional object; if present, `dominantCondition` required. `momentumAssessment`: `{ expansionPotential, currentState, capitalEfficiencyConcern:boolean, rationale:string[] (non-empty), scoutImplication, confidence }` — optional object; if present, all listed fields required; forbidden Scout/capital keys. |
| **Why necessary** | This is the Control → Train AI copy surface the schema-first rule already points to; it currently under-lists nested required fields and enums. |
| **Why smallest safe** | Extends the existing contract object and text builder; reuses `mtae-types` consts; does not touch the validator or Accept path. |
| **Test** | `tools/test-mtae-schema-export.ts` asserts every nested required path string appears in `requiredFields` / `technicalAssessment.required` and every critical enum array equals the `mtae-types` const. |

#### 2.2 `lib/ai-block.ts`

| Item | Detail |
|------|--------|
| **Exports / functions** | `SAMPLE_BLOCKS` / `AI_BLOCK_SAMPLES`; `SCOUTING_AI_BLOCK_REQUEST` (and the thinner `DEFAULT_AI_BLOCK_REQUEST` line for technical-assessment); optionally new named export e.g. `TECHNICAL_ASSESSMENT_MIN_EXAMPLE` |
| **Exact change** | (a) Add a **minimum valid** `technical-assessment` example: one or two TFs, all nested required fields, common stop-level technicalSummary fields; **omit** optional participation / or include the smallest optional objects only if needed for documentation — prefer omit optional so “minimum” is true. Keep the existing rich sample as `AI_BLOCK_SAMPLES["technical-assessment"]` **or** replace the contract example pointer to the min example while leaving the rich sample as `sampleAiBlock("technical-assessment")` — choose one: **recommended:** export `TECHNICAL_ASSESSMENT_MIN_EXAMPLE` and set `buildApplySchemaContract().examples["technical-assessment"]` to that min example; leave `AI_BLOCK_SAMPLES["technical-assessment"]` as the rich demo (or set both to min if dual samples are confusing — prefer distinct: min for contract, rich for sampleAiBlock). (b) Update the `technical-assessment` bullet in `SCOUTING_AI_BLOCK_REQUEST` to name nested required keys (`perTimeframe[].trend|summary|structuralInvalidation`, `integrated.structureSpine|opportunityNote|executionContext`, `technicalSummary.trend|structureNote|structuralInvalidation`) and note Evidence First labels ≠ JSON keys. (c) Align the shorter `DEFAULT_AI_BLOCK_REQUEST` technical-assessment line with the same nested required names (one sentence). |
| **Why necessary** | Prose request text is what many sessions see; min example is what the contract must ship for copy-paste success. |
| **Why smallest safe** | Same file / same sample infrastructure; no new block type; validator unchanged. |
| **Test** | Min example `proposal` passes `validateTechnicalAssessmentProposal`. Omitting each nested required field from a clone fails. |

#### 2.3 `lib/mtae-brief.ts`

| Item | Detail |
|------|--------|
| **Exports / functions** | `buildMtaeProtocolBrief` (and optionally one line in `buildMtaeTickerRequest`) |
| **Exact change** | Insert a compact **APPLY JSON CONTRACT (technical-assessment)** block after the APPLY section: nested required keys (exact list above), pointer that full enums + min example live in Control → Train AI → Apply schema contract, one line: “Evidence First presentation order is display-only — serialize using the JSON keys above.” Do **not** rewrite the whole protocol narrative. |
| **Why necessary** | Control → MTAE and Stock File analyze boots use this brief without always including Train AI. |
| **Why smallest safe** | Additive wording only; no behavior change. |
| **Test** | Assert protocol text contains the nested required key names (`structureSpine`, `opportunityNote`, `executionContext`, `structureNote`, `perTimeframe` summary/trend/structuralInvalidation). |

#### 2.4 `lib/mtae-snapshot.ts`

| Item | Detail |
|------|--------|
| **Exports / functions** | `mtaeControlSnapshotItems` |
| **Exact change** | Add one snapshot item, e.g. id `mtae-technical-assessment-contract`, label “technical-assessment schema + min example”, text built from `buildApplySchemaContract()` technicalAssessment section **or** a thin helper that formats nested required + enums + `JSON.stringify(TECHNICAL_ASSESSMENT_MIN_EXAMPLE)`. Reuse contract builders — do not invent a second schema source. |
| **Why necessary** | Makes the contract visible inside Control → Library → MTAE without forcing Train AI. |
| **Why smallest safe** | One snapshot row; content sourced from apply-schema-contract / ai-block exports. |
| **Test** | Snapshot text includes min example `type: "technical-assessment"` and nested required key names; example substring validates when parsed (or test builds from the same export). |

#### 2.5 `tools/test-mtae-schema-export.ts` (**new**) + `package.json`

| Item | Detail |
|------|--------|
| **Exports** | N/A (test script); `package.json` → `"test:mtae-schema-export": "tsx tools/test-mtae-schema-export.ts"` |
| **Exact change** | New test file only; register npm script. Optionally add 2–3 assertions to `tools/test-schema-discipline.ts` that the contract builder exposes technicalAssessment nested required — prefer **one dedicated test file** to avoid broadening schema-discipline scope. |
| **Why necessary** | Locks export ↔ validator alignment (acceptance criteria). |
| **Why smallest safe** | Tests only; no product behavior change. |

#### 2.6 This audit MD

Already updated with section 11. No further product docs required in this phase (`mtae-technical-analysis-engine.md` stays out of scope unless a later prompt asks).

---

### Explicit coverage checklist (must be in the exported contract)

| Topic | Where it lands |
|-------|----------------|
| `perTimeframe` required: `timeframe`, `trend`, `structuralInvalidation`, `summary` | `apply-schema-contract` requiredFields + technicalAssessment.required + mtae-brief compact block |
| `integrated` required: `structureSpine`, `opportunityNote`, `executionContext` | same |
| `technicalSummary` required: `trend`, `structureNote`, `structuralInvalidation` | same |
| All exact enums (momentum + participationSynthesis + trend; note dual expansion-state enums) | `allowedEnums` from `mtae-types` consts |
| `participationSynthesis` object shape | technicalAssessment notes / shape field |
| `momentumAssessment` types (`boolean`, `string[]`, enums) | technicalAssessment fieldTypes + allowedEnums |
| Minimum valid example | `TECHNICAL_ASSESSMENT_MIN_EXAMPLE` → contract `examples` + MTAE snapshot |
| AI receives via existing Control flow | Train AI schema contract row (primary); MTAE protocol + new snapshot (secondary); analyze boot inherits protocol |

---

### 3. Tests to add or update

**New:** `tools/test-mtae-schema-export.ts` + npm script `test:mtae-schema-export`.

Must assert:

1. Contract nested required list includes every path in the checklist above.
2. `allowedEnums["momentumAssessment.currentState"]` deep-equals `[...MTAE_MOMENTUM_CURRENT_STATES]` (and same pattern for expansionPotential, scoutImplication, dominantCondition).
3. Contract documents that `movementCharacter.state` uses `MTAE_EXPANSION_STATES`, distinct from `momentumAssessment.currentState`.
4. Min example passes `validateTechnicalAssessmentProposal` (import from `mtae-validate` — **call** validator, do not modify it).
5. Clones of min example missing each of: `structureSpine`, `opportunityNote`, `executionContext`, TF `summary`, TF `trend`, TF `structuralInvalidation`, `technicalSummary.structureNote` → `ok: false`.
6. `capitalEfficiencyConcern: "true"` on an otherwise valid momentumAssessment → fails; `true` → passes (when momentumAssessment included in a variant).
7. `buildMtaeProtocolBrief([])` contains the nested required key names.
8. MTAE snapshot item `mtae-technical-assessment-contract` exists and includes `"technical-assessment"`.
9. Regression: existing `npm run test:mtae-participation` and `test:mtae-evidence-first` still pass (run in CI/manual checklist; no need to rewrite them).

**Do not** change validator tests to weaken requirements.

---

### 4. Explicit non-goals

- Refactor or rewrite `validateTechnicalAssessmentProposal` / `lib/mtae-validate.ts`
- Introduce Zod or JSON Schema across the app
- Redesign Control Apply UI / Accept / persistence
- Change Stock Files, Scouts, Trades, MAF, MTAE analysis logic
- Change Mechanics beyond “leave untouched” (no Mechanics edit in this plan)
- New AI block types
- General schema framework for all Apply types
- Unrelated cleanup or doc rewrites outside this MD + the export surfaces listed
- Broker / execution changes

---

### 5. Risks

| Risk | Mitigation |
|------|------------|
| Contract text grows long | Keep TECHNICAL-ASSESSMENT section compact: required paths + enums + types + min JSON; leave narrative in MTAE protocol |
| Min example drifts from validator | Test #4 always runs min example through `validateTechnicalAssessmentProposal` |
| Enum lists hand-copied again | Import consts from `mtae-types`; test deep-equality |
| Dual samples confuse AI (min vs rich) | Label clearly in contract text: “minimum valid example” vs optional rich sample via `sampleAiBlock` |
| MTAE protocol still used alone without Train AI | Compact required block in `mtae-brief` + dedicated snapshot |
| Scope creep into validator “cleanup” | Non-goals; PR review rejects validator diffs |

---

### 6. Rollback plan

1. Revert the single implementation commit(s) on the feature branch (or revert merge commit on `main` if already merged).
2. No data migration: exports/docs/tests only — Accept path and stored assessments unchanged.
3. If only part fails (e.g. snapshot), revert `mtae-snapshot.ts` / `mtae-brief.ts` while keeping contract expansions if those tests pass.

---

### 7. Acceptance criteria

- [ ] Control → Train AI → Apply schema contract text lists all nested required paths for `technical-assessment`.
- [ ] Same contract lists exact enums for momentumAssessment (including `currentState`) and participationSynthesis `dominantCondition`, sourced from `mtae-types`.
- [ ] Contract embeds a **minimum valid** example that passes `validateTechnicalAssessmentProposal`.
- [ ] Control → Library → MTAE exposes protocol wording and/or snapshot with the same nested required keys + min example.
- [ ] `SCOUTING_AI_BLOCK_REQUEST` names nested required keys (not only top-level objects).
- [ ] `npm run test:mtae-schema-export` passes.
- [ ] `npm run test:mtae-participation` and `npm run test:mtae-evidence-first` still pass.
- [ ] Diff contains **no** changes to `lib/mtae-validate.ts`, Apply Accept/persist, Stock File/Scout/Trade/MAF behavior.
- [ ] An external AI given only the Train AI schema contract (no tribal memory) can produce JSON that validates without invented keys.

---

### 8. Recommended implementation order

1. Add `TECHNICAL_ASSESSMENT_MIN_EXAMPLE` in `lib/ai-block.ts` and verify it validates with a quick local script/test.
2. Extend `lib/apply-schema-contract.ts` (requiredFields, allowedEnums from consts, technicalAssessment detail, text section, examples pointer).
3. Tighten `SCOUTING_AI_BLOCK_REQUEST` / `DEFAULT_AI_BLOCK_REQUEST` bullets in `lib/ai-block.ts`.
4. Add compact APPLY JSON CONTRACT block to `lib/mtae-brief.ts`.
5. Add MTAE snapshot item in `lib/mtae-snapshot.ts` sourcing the contract/min example.
6. Add `tools/test-mtae-schema-export.ts` + `package.json` script; run participation/evidence-first regressions.
7. Open/update implementation PR; do not broaden scope.

---

### Verdict

**READY FOR IMPLEMENTATION**

Constraints are clear, the file set is minimal, the Control delivery path is existing, and no validator/Apply redesign is required. Proceed only after explicit approval to code.

---

## 12. Implementation result

**Prompt ID:** 24-27  
**Date:** 2026-07-25  
**Branch:** `cursor/hallazgos-mta-schema-b0a5` · **PR:** #78

### Exact files changed

| File | Change |
|------|--------|
| `lib/ai-block.ts` | Nested required keys in AI request prose; `TECHNICAL_ASSESSMENT_MIN_EXAMPLE`; rich sample remains `AI_BLOCK_SAMPLES["technical-assessment"]` |
| `lib/apply-schema-contract.ts` | Nested `requiredFields`; enums from `mtae-types` consts; `technicalAssessment` detail; `buildTechnicalAssessmentContractSection()`; contract `examples` → min example; `richExamples` → rich demo |
| `lib/mtae-brief.ts` | Compact **APPLY JSON CONTRACT (technical-assessment)** block |
| `lib/mtae-snapshot.ts` | Snapshot `mtae-technical-assessment-contract` from contract builders + min example |
| `tools/test-mtae-schema-export.ts` | **New** alignment tests |
| `package.json` | Script `test:mtae-schema-export` |
| `md/matrix/Hallazgos mta para solución.md` | This section |

### Implementation summary

- Exported complete nested required paths for `technical-assessment` matching the runtime validator checklist.
- Enums sourced from `MTAE_*` consts in `lib/mtae-types.ts` (plus shared `MTAE_TREND_VALUES` for trend).
- Named minimum valid example exposed as the contract example; rich participation sample kept separate as `richExamples` / `sampleAiBlock`.
- AI-facing request text names exact nested JSON keys.
- MTAE brief + Control MTAE snapshot deliver the same contract without a second handwritten schema.
- Validator, Apply UI, Accept, persistence, Mechanics, Stock/Scout/Trade/MAF: **untouched**.

### Tests run

```text
npm run test:mtae-schema-export
npm run test:mtae-participation
npm run test:mtae-evidence-first
npx tsc --noEmit
```

### Test results

| Command | Result |
|---------|--------|
| `test:mtae-schema-export` | **pass** |
| `test:mtae-participation` | **pass** |
| `test:mtae-evidence-first` | **pass** |
| `tsc --noEmit` | **pass** |

### Deviations from section 11

- None material. Added `richExamples` on the contract object so the min vs rich distinction is explicit in the JSON handshake (still the same `apply-schema-contract` / `ai-block` infrastructure — not a parallel system).
- Trend enum exported as `MTAE_TREND_VALUES` in `apply-schema-contract.ts` because the validator uses a local array rather than a `mtae-types` const (validator was not modified per scope).

### Forbidden areas untouched

Confirmed no diffs in: `lib/mtae-validate.ts`, `lib/bridge.ts`, `lib/apply-trading-inbox.ts`, `lib/mtae-apply.ts`, `MatrixConnectWindow`, Mechanics, Stock/Scout/Trade/MAF paths.

### Remaining risks

- External AI sessions that never open Train AI / MTAE schema snapshot may still omit keys — mitigated by protocol compact block + request prose, but human must paste one of those surfaces.
- Rich vs min example confusion if a session uses `sampleAiBlock("technical-assessment")` instead of the contract example — both remain valid; contract text labels which is minimum.

### Final verdict

**IMPLEMENTATION COMPLETE — READY FOR REVIEW**
