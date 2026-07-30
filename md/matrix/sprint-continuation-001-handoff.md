# MTA · Sprint Continuation 001 — Handoff de auditoría

**Fecha:** 2026-07-31  
**Baseline:** `main` @ `a3e0006` (incluye #126–#129)  
**Prod:** https://matrix-trade-theta.vercel.app  
**Alcance:** solo auditoría — **sin cambios de código funcionales**  
**Autor:** Cursor Cloud Agent (Architecture Drift Check + Needs Attention / TODOs)

---

## Veredicto ejecutivo

El problema no es falta de ideas: **el núcleo Control → Apply → Scout → Trade → Learning está shipped**, pero la arquitectura quedó con:

1. **Drift documental** (runtime-truth / roadmap / Mechanics revision desfasados del código).
2. **Huecos de cierre** en Needs Attention y Learning (MAF no durable; capital ATTN sin contrato; verify ausente en Control Accept).
3. **Módulos paralelos / stubs** (ArgusForge debt, Enter Trade deprecated, PasteAiNotes huérfano).

**Recomendación:** consolidar la base (Sprint 1–2) **antes** de añadir módulos nuevos. Construir encima hoy sin cerrar drift y verify/MAF aumentará la deuda operativa.

---

## Fase 1 — Inventario de pendientes

### Método

Búsqueda en repo (`TODO`, `FIXME`, `ATTN-`, `deprecated`, `pending`, `unsupported`, `NotImplemented`, debt docs).  
Hallazgo clave: **casi 0 `TODO`/`FIXME` en TS/TSX**. La deuda vive en engines de atención, stores, docs y stubs AF.

### Conteos aproximados

| Categoría | Cantidad |
|-----------|----------|
| `TODO`/`FIXME` en TS/TSX | ~0 |
| Tipos Needs Attention (`ATTN-*`) | 14 + fallback `ATTN-UNKNOWN` |
| `not implemented` / stubs productivos | ~15 |
| Deuda documentada OPEN / ON HOLD | ~10 |
| `@deprecated` | ~42 (mayoría Argus/compat) |
| Gaps MAF / Learning | 4–6 |

---

### Critical

| Ítem | Archivo / componente | Motivo | Impacto | Dependencia | Esfuerzo |
|------|----------------------|--------|---------|-------------|----------|
| Control Accept **sin** `verifyApplyPersistence` | `app/actions.ts` → `acceptAiBlockAction` | Inbox sí verifica (~L410); Control Accept persiste y retorna sin verify | Falsos “éxitos” si write parcial; docs Needs Attention prometen verify | `lib/apply-verify.ts` | M |
| MAF solo JSON (`maf-experiments.json`) | `lib/maf-store.ts` | Sin tabla Supabase; Vercel FS efímero | Atribuciones se pierden en redeploy/cold | SQL + store + Apply verify | L |
| Partial Apply plan-outcome ↔ LO/OBS | `lib/plan-outcome-learning-sync.ts` | Outcome puede quedar `recordedAt` con sync LO/OBS fallido | Learning incompleto; ATTN `sync_plan_outcome_learning` | Stores LO/OBS | M (repair ya existe) |
| Scoped AI Grant ON HOLD | `md/matrix/scoped-ai-access.md`, `building-backlog.md` | Persistencia grant / smoke prod no cerrado | Acceso IA externo Scout frágil | Supabase grants + test humano | M |
| AI Session DISABLED BY DESIGN | `lib/ai-session-disabled.ts` | ChatGPT no autentica APIs custom | Ruta QR/session muerta | Capacidad plataforma | L (bloqueado) |

### High

| Ítem | Archivo / componente | Motivo | Impacto | Dependencia | Esfuerzo |
|------|----------------------|--------|---------|-------------|----------|
| Attribution gaps en Needs Attention | `lib/learning-attention.ts` | `ready_for_attribution` sin `mafExperimentId` | ATTN-ATTRIBUTION hasta Apply `attribution` | MAF durable + Apply | S–M |
| Capital reservation expired → `ATTN-UNKNOWN` | `lib/dashboard-data.ts` + `needs-attention-ai.ts` | Items capital sin task type tipado | Copy-for-AI / Apply contract incorrecto | Tipos ATTN + `capital-reservation-release` | S |
| `scout-plan-create` solo warn ante plan activo | `lib/scout-plan-create.ts` | No hard-reject / fingerprint clones | Ventanas duplicadas same-ticker | Regla unicidad | M |
| Learning UI Scout (histórico NEXT) | `runtime-truth` / handoff | Agregados existen; UI Learning dedicada incompleta | Insights Pipeline (30-2C) mitiga parcial | Insights / Dashboard | M |
| Runtime-truth / Mechanics rev drift | `md/matrix/runtime-truth.md` vs `MATRIX_MECHANICS_REVISION = 35` | Doc dice rev **25**; código **35** | Agentes/IA reciben constitución incorrecta | Doc sync | S |
| DEBT-AF03-01 dual Active/Archive | `md/argusforge/af03-chaos-interface-contract.md` | Ontología AF03 abierta; Focus no implementado | Superficies AF confusas | Rediseño AF03 | L |
| ArgusForge #110 Recent linkage | `CHAT-HANDOFF.md` | No tratar shipped hasta merge+prod | Estado PR ambiguo | Merge + verify | M |

### Medium

| Ítem | Archivo / componente | Motivo | Impacto | Dependencia | Esfuerzo |
|------|----------------------|--------|---------|-------------|----------|
| ATTN `playbook_samples` / monthly | `needs-attention-ai.ts` | UNSUPPORTED via Apply (by design) | Ruido en cola; no hay JSON fix | Datos reales / calendario | — |
| External Position FIFO/specific-lot | EP types / schema contract | Solo `average_cost` | Lots fiscales incompletos | Modelo tax-lot | L |
| Legacy Alexandria adapter stubs | `lib/argusforge/legacy-alexandria-adapter.ts` | `NotImplemented` | Bridge legacy pendiente | Audit AF | L |
| Focus triggers AF03 | Forge UI | “not implemented” | Focus cae a Active | DEBT-AF03-01 | M |
| `/forge/task` placeholder | `app/forge/task/page.tsx` | Página stub | Ruta muerta | Workflow AF | L |
| PasteAiNotesPanel huérfano | `deferred-matrixtrade.md` | Panel/action sin mount | Superficie muerta | Mount o delete | S |
| MTA-002B operability postponed | `building-backlog.md` | Calibración prompts live | Operabilidad no cerrada | Chat log humano | M |
| Library alignment P1 docs | `library-alignment-backlog.md` | Docs VISION/architecture pending | Drift docs↔engines | Doc pass | S–M |
| Orphan incomplete fills en Scout | `PreviewPlanning` / scout-case | Fills sin Stock File | War room clutter | stock-case-create | S–M |
| `DEFAULT_AI_BLOCK_REQUEST` incompleto | `lib/ai-block.ts` | Omite `plan-outcome`, capital-*, EP | Prompts Connect/default sub-instruyen | Catálogo bloques | S |
| apply-verify huecos capital/EP | `lib/apply-verify.ts` | Tipos capital/EP → unsupported verify | Inbox verify falla tras apply ok | Verify cases | M |
| MatrixConnect Apply sin Clear/Snap | `MatrixConnectWindow.tsx` | Paridad UX incompleta vs Control | Fallos peores en Connect | ControlPanelUpdate patterns | S |

### Low

| Ítem | Archivo / componente | Motivo | Impacto | Dependencia | Esfuerzo |
|------|----------------------|--------|---------|-------------|----------|
| ~42 `@deprecated` shims | Argus / layouts / helpers | Compat | Ruido; bajo riesgo runtime | Cleanup call-sites | S–M |
| Enter Trade deprecated help | `page-help.ts` | Ruta legacy | Confusión naming | Cleanup | S |
| Conceptos deferred §§1–10 | `md/concepts/deferred-matrixtrade.md` | MT-PLAN parser, Bayesian, etc. | Solo conceptos | Prioridad producto | L |
| Coach / Bayesian / paid AI | `runtime-truth` “What does NOT work” | Product gaps explícitos | No son bugs | Sample volume / producto | L |

---

## Fase 2 — Revisión de arquitectura (flujos)

| Subsistema | Estado | Qué funciona | Flujo roto / gap |
|------------|--------|--------------|------------------|
| **Matrix Mechanics** | Implementado + drift | Brief + snapshot rev **35**; Control copy | Docs dicen rev 25; LO kinds en brief incompletos (UPL/duplicate) |
| **Needs Attention Engine** | Implementado | Derived queue: dashboard + plan + learning; ATTN IDs; Copy→Apply | Capital expired sin tipado; enrich fail → raw items |
| **Learning (MAF)** | **Parcial** | LO durable (Supabase); OBS store; Apply `attribution`; ATTN gaps | MAF JSON-only; expectancy/Coach deferred; docs OBS durability inconsistentes |
| **Apply pipeline** | **Parcial** | Parse → Validate → Accept → persist → auto-clear/Snap Failure | **Verify no corre en Control Accept**; verify incompleto capital/EP |
| **Snapshot generators** | Implementado + drift | Packages, aggregate, failure snap, ATTN snaps | Catalog/runtime-truth desfasados |
| **Plan lifecycle** | Implementado | Create/decide/expire/auto-expire/`outcome` | Soft-warn clones; thin legacy outcomes |
| **Outcome lifecycle** | Implementado | UPL + duplicate; sync LO/OBS; repair ATTN | Dual schemas UPL vs LEARNING-001 confunden agentes |
| **Trade lifecycle** | Parcial | pending→open→closed; LO/OBS; incomplete-closed | ADR-0001 dual status no landed (superseded ADR-0002); evaluation/MAF file-backed en partes |
| **Flag engine** | Implementado *como ATTN derivado* | No hay `flag-engine.ts`; ATTN + legacy absence | No motor unificado “orphan flags” |
| **Expired Plan evaluation** | Implementado | `evaluate_expired_plan` → `plan-outcome`; UI Record Outcome | Sync repair es follow-on (no reabre evaluate) |
| **Validation pipeline** | Implementado + drift | `validateProposalPayload` + schema-first | Default AI request incompleto vs tipos Apply |

---

## Fase 3 — Pendientes conocidos (estado)

| Ítem | Estado | Evidencia |
|------|--------|-----------|
| Apply auto-clear tras éxito/error | **Implementado** | `ControlPanelUpdate.tsx` — clear en Accept success y Apply-path failures; Validate conserva editor |
| Botón Clear | **Implementado** | `handleClear` en Control Apply |
| Snap Failure | **Implementado** | `apply-failure-snapshot.ts` + UI + tests |
| Evaluate Expired Plan | **Implementado** | `plan-attention` + `evaluate_expired_plan` SUPPORTED via `plan-outcome` |
| Learning attribution | **Parcial** | Apply `attribution` + ATTN; MAF no durable; UI expectancy deferred |
| Needs Attention automáticos | **Implementado** | Derived en `loadDashboardData`; se limpian cuando source false |
| Flags huérfanos | **Parcial** | Stale inbox ATTN fixed (25-127); historicallyAbsent SQL; LO diagnostics; orphan fills Scout — no engine único |
| JSON validation | **Implementado** | `parseAiBlock` + `validateProposalPayload`; Snap Failure en JSON inválido |
| Snapshot consistency | **Parcial** | Aggregate/bookends shipped; drift rev/catalog/runtime-truth |

---

## Architecture Drift Check

Comparación implementación actual vs especificación Matrix canónica (`md/matrix/*`, ADRs, runtime-truth, roadmap).

| Área | Spec original / doc | Código actual | Drift |
|------|---------------------|---------------|-------|
| Mechanics revision | runtime-truth: **25** | `MATRIX_MECHANICS_REVISION = 35` | **Alto** — agentes leen constitución vieja |
| LO / OBS durability | runtime-truth mezcla JSON OBS + “no Supabase MAF/LO/OBS” | LO Supabase; OBS tiene store path; MAF JSON | **Alto** — docs mienten en LO/OBS |
| Apply = Validate → Accept → **Verify** | Needs Attention / schema docs | Control Accept **omite verify** | **Alto** — contrato de write incompleto |
| Trade lifecycle ADR-0001 | `positionStatus`/`analysisStatus` | Nunca en `Trade`; ADR-0002 TradeEvaluation | **Medio** — ADR-0001 conceptual only |
| Learning UI Scout | Building backlog / handoff NEXT | Insights Pipeline Performance (30-2C) parcial | **Medio** — mitiga, no reemplaza Learning desk |
| Scout same-ticker uniqueness | Mechanics: no clones | `scout-plan-create` warn only | **Medio** |
| Flag engine | Implicado como cola operativa | Solo ATTN builders compuestos | **Bajo** — naming, no gap funcional crítico |
| Enter Trade | Deprecated → Scout | Redirect + page-help residual | **Bajo** |
| MAF V1 expectancy dashboards | MAF docs / ADR-0004 | Deferred explícito | **Esperado** (no drift accidental) |
| Dual plan-outcome schemas | UPL-25-29 vs LEARNING-001 | Ambos validados | **Medio** — confunde Apply prompts |
| Insights tabs | Stats/Journal/Mistakes | + Pipeline Performance | **Positivo** — extensión coherente |
| Operational state 31-3C / Prepare 30-27 / 30-2D | Design docs | Shipped + prod READY | **Alineado** |

**Conclusión drift:** conviene **consolidar docs + verify + MAF durability** antes de nuevos módulos. La base es usable; el riesgo es que la “verdad” de agentes y el write-path Control divergen del diseño.

---

## Fase 4 — Roadmap propuesto (solo consolidación)

Ordenado por **dependencia arquitectónica**. Sin features nuevas de producto.

### Sprint 1 — Cerrar el write-path y la verdad operativa

1. **Control Accept → verify** (mismo contrato que Inbox; fallar visible si verify falla).  
2. **Ampliar `apply-verify`** para capital-* / external-position-* (o documentar exclusión explícita).  
3. **Sincronizar runtime-truth + snapshot-catalog + Mechanics brief** (rev 35, LO kinds UPL/duplicate, LO/OBS durability real).  
4. **Tipar capital-reservation-expired** en Needs Attention (sacar de `ATTN-UNKNOWN`).  
5. **Paridad Connect Apply**: Clear + Snap Failure.

*Depende de:* nada externo. Desbloquea confianza en Apply.

### Sprint 2 — Learning durable y cierre de ATTN Learning

1. **MAF store durable** (Supabase `maf_experiments` o equivalente) + migrate JSON.  
2. **Cerrar loop attribution**: verify MAF persist + ATTN-ATTRIBUTION clear fiable en prod.  
3. **Unificar / marcar preferred** plan-outcome UPL vs LEARNING-001 en prompts y Mechanics.  
4. **Hardening plan-outcome sync repair** UX (visible success/error; no silent partial).  
5. Completar `DEFAULT_AI_BLOCK_REQUEST` / scouting request con tipos Apply reales.

*Depende de:* Sprint 1 verify (verify).

### Sprint 3 — Higiene arquitectónica y deuda de superficie

1. **`scout-plan-create` hard-reject / fingerprint** clones same-ticker activos.  
2. Orphan fills + PasteAiNotes + Enter Trade leftovers (delete o wire).  
3. Library alignment P1 docs; retire ADR-0001 como “runtime”.  
4. AF03 DEBT-01 / Focus / #110 — o congelar AF fuera del critical path MTA.  
5. Decisión producto: Mistakes como filtro Insights (nota 30-2C) vs tab completa.

*Depende de:* Sprint 1–2 estables para no mezclar cleanup con write-path.

---

## Motores Needs Attention (mapa)

| Builder | Archivo | Produce |
|---------|---------|---------|
| Trade / inbox / monthly / playbook | `lib/dashboard-attention.ts` | Incomplete closed, inbox stale, samples, monthly |
| Plan ready / expired / sync / window | `lib/plan-attention.ts` | `evaluate_expired_plan`, sync repair, etc. |
| OBS + MAF gaps | `lib/learning-attention.ts` | missing observation / attribution |
| Capital expired reservations | `lib/capital-account.ts` → merge en `dashboard-data.ts` | Hoy sin task type ATTN formal |
| Enrich Copy-for-AI | `lib/needs-attention-ai.ts` | ATTN-* IDs + snapshots |

UI: `app/components/dashboard/NeedsAttentionRow.tsx` + Dashboard.

---

## Decisión recomendada

| Opción | Cuándo |
|--------|--------|
| **Seguir construyendo módulos nuevos** | Solo si el siguiente trabajo es puramente AF/no-MTA y se acepta MAF efímero |
| **Consolidar primero (recomendado)** | Cualquier trabajo MTA Learning / Capital / Apply / Scout uniqueness |

**Elegir consolidación (Sprints 1→2→3)** antes de nuevos motores. El Architecture Drift Check encontró más riesgo en **docs + verify + MAF durability** que en TODOs clásicos.

---

## Archivos clave citados

- `app/actions.ts` (`acceptAiBlockAction`)  
- `lib/apply-verify.ts`, `lib/bridge.ts`, `lib/ai-block.ts`  
- `lib/maf-store.ts`, `lib/learning-attention.ts`, `lib/needs-attention-ai.ts`  
- `lib/plan-attention.ts`, `lib/plan-outcome-learning-sync.ts`  
- `lib/matrix-mechanics-snapshot.ts` (rev 35)  
- `md/matrix/runtime-truth.md`, `CHAT-HANDOFF.md`  
- `app/components/control-panel/ControlPanelUpdate.tsx`

---

## Próximo paso (humano)

1. Aprobar o ajustar prioridades Sprint 1–3.  
2. Autorizar implementación **solo** del Sprint 1 (o el subconjunto verify + runtime-truth).  
3. No abrir features nuevas MTA hasta cerrar verify + verdad documental mínima.

---

*Fin del Handoff Sprint Continuation 001 — auditoría.*
