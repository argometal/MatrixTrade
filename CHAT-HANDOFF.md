# Chat handoff — MatrixTrade (checks vivos)

**Status:** Handoff operativo — comunicar verdad actual y deuda abierta.  
**Repo:** https://github.com/argometal/MatrixTrade  
**Prod:** https://matrix-trade-theta.vercel.app  
**No es un dump histórico.** Si algo ya está shipped, no vive aquí.

**Copia desde la raíz del repo:** `CHAT-HANDOFF.md`

---

## Modelo (orden)

```text
Playbook → Stock File → Scout (PLAN) → Trade → Learning Outcome / Observation / MAF
```

- Scout ≠ Trade. Sin fill no hay Trade ni P/L realizado.
- Mutations solo vía Control → Apply (humano). Nunca auto-apply.
- Tesis estratégica (Stock File) ≠ resultado táctico del Scout.

---

## Runtime (abreviado)

| Capa | Ruta / store | Notas |
|------|----------------|-------|
| Scout | `/planning` · `plans` | Active = `watching` \| `ready` |
| Trade | `/trades` | Supabase; win rate / monthly loss = solo ejecutados |
| LO | `learning-outcomes` | kinds actuales abajo |
| Apply | Control → Apply | tipos en `AI_BRIDGE_BLOCK_TYPES` |

Learning Outcome kinds **hoy en código:**

`executed_win` · `executed_loss` · `missed_opportunity` · `cancelled` · `expired` · **`unexecuted_plan_loss`** · **`duplicate_creation`**

Cierre Scout sin Trade: Apply **`plan-outcome`** (también Planning → Record Outcome).

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
