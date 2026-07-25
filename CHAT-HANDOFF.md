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

`executed_win` · `executed_loss` · `missed_opportunity` · `cancelled` · `expired`

Cierre Scout sin Trade vía UI parcial: `recordPlanOutcome` (status ya terminal). **No** hay Apply `plan-outcome`.

---

## Descubrimiento 25-25 → 25-29 (deuda activa)

### Por qué falla el JSON

`type: "plan-outcome"` **no** está en parser / bridge / validator / Apply / schema contract.  
Por eso Apply responde **unsupported**.

### Qué falta (implementar)

1. Apply type `plan-outcome` en **todos** los puntos del contrato (types, parse, validate, describe, handler, verify, schema, samples, Mechanics, Scout Desk, tests).
2. LO kinds: `unexecuted_plan_loss` (“Unexecuted Plan Loss”), `duplicate_creation` (“Duplicate Creation”).
3. Campos LO (server-derived donde aplique):  
   `realizedR` · `counterfactualR?` · `realizedPnL` · `counterfactualDollarResult?` ·  
   `entryReached?` · `stopReachedBeforeTarget?` · `targetReachedBeforeStop?` ·  
   `nonExecutionReason?` · `excludedFromMetrics`
4. Métricas scout separadas del trade P/L (no tocar monthly loss / win rate / executed loss).
5. `scout-plan-create`: hoy solo **warn** si hay plan activo; falta reject/fingerprint de clones idénticos.

### Reglas UPL (PLAN-004 NFLX ref.)

- entry alcanzada + stop antes que target + **sin** Trade/fill  
- `realizedR=0` · `realizedPnL=0` · `counterfactualR=-1` (server)  
- `$` contrafactual solo si `authorizedRiskAmount` persistido; si no → unavailable (no inventar 100)  
- saca el plan de active; historial intacto; **no** invalida Stock File  
- LO `concluded` sin esperar Observation estratégica (tesis puede seguir 90d aparte)

### Duplicates (PLAN-011 / 012 → canónico PLAN-010)

- `outcome: duplicate_creation` · `excludedFromMetrics=true`  
- fuera de evaluatedScout / R contrafactual / sample size  
- Apply **un bloque a la vez**

### Needs Attention

`evaluate_expired_plan` sigue **UNSUPPORTED** hasta que `plan-outcome` exista  
(doc: `md/matrix/needs-attention-ai-workflow.md`).

---

## Anti-patrones (vivos)

| ❌ | ✅ |
|----|----|
| Forzar UPL vía `decision-update` | Nuevo `plan-outcome` |
| Crear Trade ficticio para “cerrar” Scout | Solo LO + plan terminal |
| Contar UPL en trade win rate / monthly loss | Métricas scout separadas |
| Confiar en `counterfactualR` de la IA | Derive server |
| Inventar riesgo USD | Solo risk autorizado persistido |
| Invalidar tesis al cerrar Scout | Stock File intacto |
| Incluir duplicates en denominadores | `excludedFromMetrics` |

---

## Check rápido (antes de codear plan-outcome)

- [ ] Scout ≠ Trade; sin fill → realized 0  
- [ ] `plan-outcome` ausente hoy → unsupported esperado  
- [ ] UPL ≠ `missed_opportunity`  
- [ ] Duplicates excluidos de métricas  
- [ ] PLAN-010 (vigente) no se toca al cerrar 004/011/012  
- [ ] No commit de Apply hasta contrato cableado end-to-end  

Respuesta esperada: `CHECK COMPLETO — listo para implementar 25-29` o corrección puntual.

---

## Refs

| Doc | Rol |
|-----|-----|
| `md/matrix/runtime-truth.md` | Qué hay en prod |
| `md/matrix/needs-attention-ai-workflow.md` | Gap `plan-outcome` |
| `md/matrix/maf-matrix-attribution-framework.md` | LO / OBS / MAF |
| `lib/learning-outcome-types.ts` | Kinds actuales |
| `lib/plans.ts` | `recordPlanOutcome` (UI) |
| `lib/ai-bridge-types.ts` | Apply types shipped |
