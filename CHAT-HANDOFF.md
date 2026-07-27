# Chat handoff — MatrixTrade (checks vivos)

**Status:** Handoff operativo — comunicar verdad actual y deuda abierta.  
**Repo:** https://github.com/argometal/MatrixTrade  
**Prod:** https://matrix-trade-theta.vercel.app  
**No es un dump histórico.** Si algo ya está shipped, no vive aquí.

**Copia desde la raíz del repo:** `CHAT-HANDOFF.md`

---

## Shipped — ArgusForge 24-27 molecular graph UI

Doc: `md/argusforge/change-24-27.md`  
Route: `/forge/realm/[realmId]`  

Compact header · Graph/List · clamped nodes · floating controls · Focus dim · selection sheet · toggle MiniMap · prefs + positions in localStorage.

---

## Modelo (orden)

```text
Playbook → Stock File → Scout (PLAN) → Trade → Learning Outcome / Observation / MAF
                          ↘ Capital Planner → External Positions (outside pipeline)
```

- Scout ≠ Trade. Sin fill no hay Trade ni P/L realizado.
- Mutations solo vía Control → Apply (humano). Nunca auto-apply.
- Tesis estratégica (Stock File) ≠ resultado táctico del Scout.
- **External Position** ≠ Trade/Scout/Stock File; capital only; excluded from experiment metrics.

---

## Runtime (abreviado)

| Capa | Ruta / store | Notas |
|------|----------------|-------|
| Scout | `/planning` · `plans` | Active = `watching` \| `ready` |
| Capital | `/planning/capital` · `external_positions` | External Positions; investedExternalCapital |
| Trade | `/trades` | Supabase; win rate / monthly loss = solo ejecutados |
| LO | `learning-outcomes` | kinds actuales abajo |
| Apply | Control → Apply | tipos en `AI_BRIDGE_BLOCK_TYPES` |

Learning Outcome kinds **hoy en código:**

`executed_win` · `executed_loss` · `missed_opportunity` · `cancelled` · `expired` · **`unexecuted_plan_loss`** · **`duplicate_creation`**

Cierre Scout sin Trade: Apply **`plan-outcome`** (también Planning → Record Outcome).

---

## Shipped — External Positions 26-13 / hardened 26-14

Doc: `md/matrix/external-positions-26-13.md`  
Test: `npm run test:external-positions`  
SQL: `supabase/external-positions.sql` (run in Supabase before prod writes; includes 26-14 columns)

Apply: `external-position-create` · `external-position-update` · `external-position-reduction` · `external-position-settle` · `external-position-exit-plan-update`

Hardening: idempotent reductions (`reductionId`/`executionReference`); pending→settled ledger (no double-count); `average_cost` only; valuation provenance; Capital Planner marks unconfigured fields (not silent zero).  
Neutrality: no issuer-ticker hard-coding in EP infra — `tools/scan-external-position-neutrality.ts` (via `npm run test:external-positions`).

---

## Shipped — Capital Planner sources 26-15

Doc: `md/matrix/capital-planner-26-15.md`  
Test: `npm run test:capital-planner`  
SQL: `supabase/capital-planner.sql`

Model A `cash_ledger`: settledCash ≠ totalEquity; availableCapital = deployableCapital; invested Scout capital informational.  
Apply: `capital-configuration-*` · `capital-reservation-*` · `capital-ledger-adjustment`.  
Dashboard curve renamed to Experiment cumulative P/L (not Account Equity).

---

## Shipped — Capital Settings 26-1A / 26-1C / 26-1E / 26-20

Doc: `md/matrix/capital-settings-26-1a.md`  
Route: `/settings/capital`  
Test: `npm run test:capital-settings`  
Merged: PR #107 · tip `43be2db` · prod https://matrix-trade-theta.vercel.app

Settings prepares capital-configuration proposals only (no persist).  
Create: complete cash+as-of or equity+as-of pair required (shared invariant helper).  
Updates: omitted=unchanged · number/0=set · null=clear (never undefined clear; never Number(null)).  
Balance clear requires as-of clear; configured balance requires configured as-of.  
Default status snapshot omits balances; private snapshot is explicit + confirmed.  
Isolated load: config/account/store/SQL failures do not crash the page.  
Mechanics points to Settings → Capital; ticker snapshots exclude account balances.

---

## Shipped — UPL 25-29 (CURSOR-MTA-PLAN-OUTCOME-UPL-25-29)

Doc: `md/matrix/plan-outcome-upl-25-29.md`  
Test: `npm run test:plan-outcome-upl`

### Apply `plan-outcome`

```json
{
  "type": "plan-outcome",
  "proposal": {
    "planId": "PLAN-001",
    "outcomeKind": "unexecuted_plan_loss",
    "entryReached": true,
    "stopReachedBeforeTarget": true,
    "targetReachedBeforeStop": false,
    "nonExecutionReason": "order_not_staged",
    "notes": "..."
  }
}
```

Server-derived: `realizedR=0` · `realizedPnL=0` · `counterfactualR=-1`  
`$` contrafactual solo si `authorizedRiskAmount` persistido; si no → null.  
No Trade ficticio · no cambia P/L · no invalida Stock File · MAF aparte.

### Needs Attention

`evaluate_expired_plan` → **SUPPORTED** via `plan-outcome`.  
Completion: `plan.outcome.recordedAt`.

### Scout metrics (separadas del Trade)

`evaluatedScoutCount` · `unexecutedPlanLossCount` · `counterfactualScoutR` · `triggeredPlansWithoutTrade`  
(`lib/learning-scout-aggregates.ts`)

Thesis failure **solo** tras MAF `thesis_quality=failure`.

### Duplicates

`outcomeKind: duplicate_creation` · `excludedFromMetrics=true` · fuera de denominadores.

### Learning sync durability

Plan outcome → LO → OBS uses `syncPlanOutcomeLearning` (idempotent).  
`learningSyncStatus`: `pending` | `complete` | `failed`.  
Partial Apply failure is visible; repair via Needs Attention `sync_plan_outcome_learning` / Planning **Retry Learning Sync**.  
Does **not** reopen `evaluate_expired_plan` once `recordedAt` exists.

### Learning Outcome store (durable)

| Mode | Backend |
|------|---------|
| Vercel / `TRADES_STORE=supabase` | Supabase `public.learning_outcomes` |
| Local default | `data/learning-outcomes.json` |
| Tests | in-memory (`__setLearningOutcomeStoreForTests`) |

SQL: `supabase/learning-outcomes.sql` (required in prod).  
Migrate JSON → Supabase (dry-run default): `npm run migrate:learning-outcomes-to-supabase` · `-- --apply` to write.  
Diagnose: `npm run diagnose:learning-outcomes`.  
No silent production fallback to JSON. `automaticExecutionEnabled=false`.

### Deuda restante (no UPL)

- `scout-plan-create`: hoy solo **warn** si hay plan activo; falta reject/fingerprint de clones idénticos.
- Dashboard Learning UI para métricas scout (agregados en código).
- No broker / no auto-fills / `automaticExecutionEnabled=false`.

---

## Snapshots / labels (25-08)

**Shipped:** Mechanics no pide `Control → Train AI`.  
SCHEMA-FIRST → **Control → MTA Mechanics → Apply schema contract**.  
Legacy ATTN-INCOMPLETE-CLOSED: Apply `playbookId=__legacy_none__` · `planId=__LEGACY_NONE__`  
→ server guarda `playbook_id/plan_id=null` + flags `*HistoricallyAbsent` (FK-safe; 25-F8).  
SQL: `supabase/trade-legacy-absence.sql`. Test: `npm run test:legacy-trade-completion`.

---

## Anti-patrones (vivos)

| ❌ | ✅ |
|----|----|
| Forzar UPL vía `decision-update` | Apply `plan-outcome` |
| Crear Trade ficticio para “cerrar” Scout | Solo LO + plan terminal |
| Contar UPL en trade win rate / monthly loss | Métricas scout separadas |
| Confiar en `counterfactualR` de la IA | Derive server (−1) |
| Inventar riesgo USD | Solo risk autorizado persistido |
| Invalidar tesis al cerrar Scout | Stock File intacto |
| Incluir duplicates en denominadores | `excludedFromMetrics` |
| Inferir thesis failure desde UPL | Solo MAF accepted |

---

## Refs

| Doc | Rol |
|-----|-----|
| `md/matrix/runtime-truth.md` | Qué hay en prod |
| `md/matrix/plan-outcome-upl-25-29.md` | Contrato UPL |
| `md/matrix/needs-attention-ai-workflow.md` | `evaluate_expired_plan` SUPPORTED |
| `md/matrix/maf-matrix-attribution-framework.md` | LO / OBS / MAF |
| `lib/learning-outcome-types.ts` | Kinds |
| `lib/plans.ts` | `recordPlanOutcome` |
| `lib/ai-bridge-types.ts` | Apply types shipped |
