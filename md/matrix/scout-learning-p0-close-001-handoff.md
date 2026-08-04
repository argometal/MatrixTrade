# MTA · Scout Learning P0 — CLOSE-001 (merge readiness)

**PROMPT ID:** `MTA-SCOUT-CLOSE-001`  
**Fecha:** 2026-08-04  
**PR:** https://github.com/argometal/MatrixTrade/pull/134  
**Branch:** `cursor/scout-learning-p0-visibility-b0a5`  
**Tip al cierre:** `35847e7`  
**Baseline main al rebase:** `427024a` (#133 squash)  

**No merge automático** — merge humano pendiente.

---

## Veredicto

**Listo para merge: sí.**  
PR #134 = MERGEABLE / CLEAN · Vercel SUCCESS · draft → ready for review.

---

## Qué se hizo (CLOSE-001)

1. Actualizar rama #134 contra `main` actual.  
2. Resolver conflictos (solo docs).  
3. Conservar scope P0 únicamente.  
4. **No** incorporar Scout Funnel (#136).  
5. **No** incorporar producto de #135.  
6. Tests + build OK.  
7. Sin merge automático.

---

## Conflictos y resolución

| Archivo | Conflicto | Resolución |
|---------|-----------|------------|
| `CHAT-HANDOFF.md` | Pending #134 vs Library P0 de main | Sección Pending #134 con scope P0; #136/#135 marcados fuera |
| `md/matrix/library-alignment-backlog.md` | Pointer entrega P0 | Conservar entrega P0 → PR #134 |
| `md/matrix/scout-learning-circuit-audit-handoff.md` | add/add header | Conservar link a handoff de entrega P0 |

**Código funcional:** auto-merge limpio (ya coincidía con `main`).

---

## Hecho crítico — código P0 ya en `main`

Antes del rebase de #134, `main` ya contenía:

| Commit | Contenido |
|--------|-----------|
| `6bc41fc` | feat Scout Learning P0 (aggregates + discovery + Retry copy) |
| `97788c0` | ATTN `?plan=` → `learningFocusPlanId` + handoff entrega |
| `427024a` | #133 docs metrics/audit |

Por eso, el **delta tip #134 ↔ `main`** tras el merge es **solo docs** (3 archivos). El producto P0 ya está en `main`; mergear #134 cierra alineación documental + PR.

---

## Scope conservado (P0)

- Pipeline: Triggered-without-Trade + thesis fail rate  
- Planning: cola needs outcome / Retry Sync  
- Copy `partialFailure` → Retry Learning Sync  
- Separación Trade vs Scout  

## Fuera de scope

- Scout Funnel / Coverage (#136) — **pausado**  
- Ops review sheet (#135) — no como producto  
- Tablas / páginas / modelos / ontología nuevas  
- Trade Statistics math  

---

## Archivos

### Funcionales (P0 — ya en `main`)

- `app/components/insights-preview/PreviewPipelinePerformance.tsx`
- `app/components/planning-preview/PreviewPlanning.tsx`
- `app/components/planning-preview/PlanRecordOutcomePanel.tsx`
- `lib/insights-pipeline-performance.ts`
- `lib/plan-helpers.ts`
- `lib/plan-outcome.ts`
- `lib/apply-trading-inbox.ts`
- `app/actions.ts`
- `tools/test-insights-pipeline-30-2c.ts`
- `tools/test-plan-outcome-learning-sync.ts`

### Documentales (delta tip #134 vs `main`)

- `CHAT-HANDOFF.md`
- `md/matrix/library-alignment-backlog.md`
- `md/matrix/scout-learning-circuit-audit-handoff.md`

---

## Pruebas / build (CLOSE-001)

| Check | Resultado |
|-------|-----------|
| `npm run test:insights-pipeline` | OK |
| `npm run test:plan-outcome-learning-sync` | OK |
| `npm run build` | OK |
| Vercel PR check | SUCCESS |
| Trade Statistics tocado | No |

---

## Riesgos

- Merge de #134 **no añade diff funcional nuevo** (ya cherry-picked en main).  
- Tras merge: actualizar CHAT de Pending → Shipped + prod verify.  
- No reabrir #136 Funnel ni arquitectura amplia.

---

## Bloqueadores

Ninguno.

---

## Orden post-merge (humano)

1. Squash/merge #134  
2. Verificar prod  
3. CHAT: Pending → Shipped  
4. Mantener #136 pausado  
5. Cierre operativo de tesis/outcomes (no Funnel)

---

*Handoff CLOSE-001 — merge readiness PR #134. Sin merge automático.*
