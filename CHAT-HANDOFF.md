# Chat handoff — MatrixTrade (checks vivos)

**Status:** Handoff operativo — comunicar verdad actual y deuda abierta.  
**Repo:** https://github.com/argometal/MatrixTrade  
**Prod:** https://matrix-trade-theta.vercel.app  
**Copia desde la raíz:** `CHAT-HANDOFF.md`

---

## Modelo (orden)

```text
Playbook → Stock File → Scout (PLAN) → Trade → Learning Outcome / Observation / MAF
```

- Scout ≠ Trade. Sin fill no hay Trade ni P/L realizado.
- Mutations solo vía Control → Apply (humano).
- Tesis estratégica (Stock File) ≠ resultado táctico del Scout.

---

## Runtime

| Capa | Notas |
|------|--------|
| Active Scout | `watching` \| `ready` |
| Trade metrics | solo fills ejecutados |
| LO kinds | win/loss/miss/cancel/expire/**unexecuted_plan_loss**/**duplicate_creation** |
| Apply | incluye **`plan-outcome`** |

---

## Shipped — plan-outcome (25-29)

Apply type `plan-outcome` cierra Scout **sin Trade**:

- `unexecuted_plan_loss` — entry+stop first → realized 0 · counterfactualR −1 (server) · `$` solo si `authorizedRiskAmount` persistido
- `duplicate_creation` — `excludedFromMetrics=true` · fuera de denominadores
- No inventa fills · no toca monthly loss / win rate · no invalida Stock File
- Lifecycle táctico: `outcome_recorded` (no “completed” de Trade)
- Needs Attention `evaluate_expired_plan` → Apply `plan-outcome` (SUPPORTED)
- `scout-plan-create` rechaza Scout activo idéntico (entry/stop/target[/thesis]) salvo `allowDuplicateWindow:true`

---

## Anti-patrones

| ❌ | ✅ |
|----|----|
| Trade ficticio para cerrar Scout | `plan-outcome` |
| Contar UPL en trade win rate | métricas scout (`scout-outcome-metrics`) |
| Confiar en counterfactualR de la IA | derive server |
| Inventar riesgo USD | solo risk autorizado persistido |

---

## Refs

`lib/plan-outcome.ts` · `lib/scout-outcome-metrics.ts` · `lib/ai-bridge-types.ts` · `tools/test-plan-outcome.ts`
