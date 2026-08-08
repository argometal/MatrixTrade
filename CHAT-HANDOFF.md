# Chat handoff — MatrixTrade (checks vivos)

**Status:** Handoff operativo — verdad actual y deuda abierta.  
**Repo:** https://github.com/argometal/MatrixTrade  
**Prod:** https://matrix-trade-theta.vercel.app  
**Deploy pin:** [`md/integrations/current-deploy.md`](md/integrations/current-deploy.md)  
**IA / apps / ArgusForge truth:** [`md/argusforge/IA-HANDOFF.md`](md/argusforge/IA-HANDOFF.md)

**No es un dump histórico.** Si algo ya está shipped, no vive aquí — apunta a `current-deploy` o al doc de cambio.

**Copia desde la raíz del repo:** `CHAT-HANDOFF.md`

**Auditoría consolidación (2026-07-31):** ver [`md/matrix/sprint-continuation-001-handoff.md`](md/matrix/sprint-continuation-001-handoff.md) — Needs Attention / drift / Sprints 1–3. No implementar features nuevas hasta aprobar ese roadmap.

---

## Pending — ArgusForge 24-33 Recent linkage

PR: #110 (draft)  
Route: `/forge/argus`  
Test: `npm run test:argus-recent-linkage`  
Doc: `md/argusforge/capability-map.md` (Pending row)

Four statuses: Unlinked · In Realm · In related Deck · Related. Do not treat as shipped until merge + production verification.

---

## Library (reference — not pending work)

| Topic | Doc |
|-------|-----|
| Apps · ARGUS · ArgusForge runtime | [`md/argusforge/IA-HANDOFF.md`](md/argusforge/IA-HANDOFF.md) |
| **ARGUS architecture review pack (`main` only)** | [`md/argus-review/00-PUBLIC-STATUS.md`](md/argus-review/00-PUBLIC-STATUS.md) — branch/PR handoffs **deprecated** |
| ARGUS Evidence Engine mechanics | [`md/argus/evidence-engine-mechanics.md`](md/argus/evidence-engine-mechanics.md) |
| ARGUS deprecated handoffs | [`md/argus/DEPRECATED-HANDOFFS.md`](md/argus/DEPRECATED-HANDOFFS.md) |
| ArgusForge capabilities | [`md/argusforge/capability-map.md`](md/argusforge/capability-map.md) |
| Scout / Trade / Pipeline ledgers | [`md/matrix/metrics-analysis-planteamiento-handoff.md`](md/matrix/metrics-analysis-planteamiento-handoff.md) |
| Scout Learning circuit audit | [`md/matrix/scout-learning-circuit-audit-handoff.md`](md/matrix/scout-learning-circuit-audit-handoff.md) |
| Plan Map execution sentence (shipped #132) | [`md/matrix/execution-instruction-spec.md`](md/matrix/execution-instruction-spec.md) |
| ARGUS export / deliver | [`md/argus/export-delivery-handoff.md`](md/argus/export-delivery-handoff.md) |
| AI Trading Session (disabled) | [`md/integrations/ai-trading-session-handoff.md`](md/integrations/ai-trading-session-handoff.md) |

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
| Apps hub | `/apps` | Chooser MTA · ARGUS · ArgusForge |
| MTA home | `/` → `/home-preview` | Trading dashboard |
| Scout | `/planning` · `plans` | Active = `watching` \| `ready` |
| Capital | `/planning/capital` · `external_positions` | External Positions |
| Trade | `/trades` | Supabase; WR / monthly loss = ejecutados |
| ARGUS | `/argus/v2` | Evidence journal |
| ArgusForge | `/forge` | Capture / Explorer (Argus password session) |
| Guest lock | `/settings/security` · Argus twin | Shipped — see `current-deploy.md` |
| Apply | Control → Apply | tipos en `AI_BRIDGE_BLOCK_TYPES` |

Learning Outcome kinds **hoy en código:**

`executed_win` · `executed_loss` · `missed_opportunity` · `cancelled` · `expired` · `unexecuted_plan_loss` · `duplicate_creation`

Cierre Scout sin Trade: Apply **`plan-outcome`** (también Planning → Record Outcome).

---

## Shipped anchors (one line each)

Use `current-deploy.md` for the full pin list. Recent:

- Guest lock + calendar/clock + 30m override + account policy — shipped  
- Cross-app chrome + `/apps` + Forge Argus session (#148) — shipped (note middleware `/forge` gap in IA-HANDOFF)  
- ArgusForge consolidation 24-47 (#113) — shipped  
- Plan Map AI execution sentence (#132) — shipped  
- Capital Settings / Planner / External Positions / UPL — shipped (matrix docs under `md/matrix/`)
