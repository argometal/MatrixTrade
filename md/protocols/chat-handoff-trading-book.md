# Chat handoff — Trading Book (Stock Playbook) en MatrixTrade

**Status:** Checklist de alineación — usar **antes** de diseñar o codear.  
**Propósito:** Evitar iteraciones con chats que asumen TraderSync, H001–H030, o un playbook genérico sin conocer Matrix.  
**Siguiente paso:** Cuando este check esté ✓, recién ahí se diseña el módulo.

---

## Cómo usar este documento

1. Abrí un chat nuevo (cualquier modelo).
2. Pegá la sección **「Prompt de arranque」** completa.
3. Pedí que marque cada ítem del **「Check de comprensión」** con ✓ o explique corrección.
4. **No aceptes diseño ni código** hasta que el check esté completo.
5. Si el chat propone algo que viola **「Anti-patrones」**, cortá y reenviá este doc.

---

## Prompt de arranque (copiar y pegar)

```text
Vas a ayudarme a diseñar un Trading Book (Stock Playbook) para MatrixTrade.

ANTES de proponer UI, campos o código:
1. Lee y confirma el checklist en md/protocols/chat-handoff-trading-book.md (o el texto que te pegué).
2. Responde el「Check de comprensión」punto por punto.
3. Diferencia explícitamente: Strategy Lab (hoy) vs Stock Playbook (a diseñar) vs Planning vs Trade.
4. No asumas: límite 30 trades, rango H001–H030 fijo, broker import, market data, AI auto-apply.

MatrixTrade es un lab conductual:
- Fuente de verdad: app (Supabase/JSON) + Obsidian narrativa + inbox con aprobación humana.
- Riesgo duro: cap mensual + carryover opcional + cap por ticker.
- Sin tope de cantidad de trades; IDs H + dígitos sin techo.
- Producción: https://matrix-trade-theta.vercel.app
- Repo: https://github.com/argometal/MatrixTrade

Cuando entiendas la mecánica, di "CHECK COMPLETO" y esperá mis instrucciones de diseño.
```

---

## Modelo mental — 4 capas (orden obligatorio)

```text
Strategy Lab     →  CÓMO opero (reglas, checklist)     [EXISTE: /playbook]
Stock Thesis     →  QUÉ pienso del TICKER (tesis, niveles) [FASE 0: /stock-theses]
Planning Lab     →  CUÁNDO / DÓNDE entrar (ventana, MTF)   [EXISTE: /planning + stockThesisId]
Trade            →  QUÉ ejecuté (H00x, shares, P/L)        [EXISTE: /trades]
```

| Capa | Contiene | No contiene |
|------|----------|-------------|
| Stock Playbook | thesis, zonas, support/resistance, targets, invalidación, riskIdea | entry, shares, P/L, órdenes |
| Planning | plannedEntry, stop, target, validUntil, entryTimeframe | ejecución ni resultado |
| Trade | entry, exit, stop, shares, mistakes, review | reescribir tesis del stock |

**Regla de oro:** Playbook → (review) → Planning → Trade. Nunca al revés.

---

## Qué existe HOY en Matrix (runtime)

| Módulo | Ruta | Storage | Notas |
|--------|------|---------|-------|
| Dashboard | `/home-preview` | — | Monthly risk, closed trades, attention |
| Strategy Lab | `/playbook` | `data/playbooks.json` | `name`, `checklist`, TESTING/ACTIVE/RETIRED — **no es por ticker** |
| Stock Thesis | `/stock-theses/[id]` | `data/stock-theses.json` | ST-TSLA-001 pilot — thesis, niveles, riskRules |
| Planning Lab | `/planning` | `data/plans.json` / Supabase | PLAN-xxx, MTF, `playbookId` + `stockThesisId` opcional |
| Trades | `/trades`, `/trades/[id]` | Supabase / JSON | H-prefix sin techo, `playbookId` opcional |
| Review | `/review` | — | Cola post-cierre |
| Inbox | `/inbox` | Worker KV | Propuestas AI — humano aplica |
| System | `/system` | `data/rules.json` | Monthly cap, carryover, per-ticker cap |

**Library (arquitectura):** `md/README.md` — runtime vs `md/concepts/` (futuro).

---

## Anti-patrones — lo que los chats suelen inventar mal

El chat **NO debe** asumir ni proponer sin pedir:

| ❌ Falso | ✅ Verdad Matrix |
|---------|------------------|
| Experimento fijo H001–H030, máx 30 trades | Lab sin tope; H001, H031, H999… |
| Playbook = estrategia y ticker en uno | Hoy son cosas distintas; Stock Playbook es nuevo |
| Playbook guarda trades ejecutados | Solo referencias; trades viven aparte |
| Editar playbook cambia P/L histórico | Nunca modifica trades cerrados |
| Broker sync / precios en vivo | Fuera de scope |
| AI crea trades directo | Solo propuestas → inbox → usuario aplica |
| 600 estadísticas / replay | No es el producto |
| ARGUS = MatrixTrade trading | Productos separados |
| `maxTrades` en rules | Eliminado — no usar |

---

## Check de comprensión (el chat debe responder cada ítem)

### A. Arquitectura

- [ ] **A1.** ¿Cuáles son las 4 capas y en qué orden fluyen?
- [ ] **A2.** ¿Qué ruta y archivo corresponden al Strategy Lab actual?
- [ ] **A3.** ¿Dónde vive Planning y qué ID usa (PLAN-xxx)?
- [ ] **A4.** ¿Cómo se nombra un trade (H + dígitos) y hay tope de cantidad?
- [ ] **A5.** ¿Qué es la Library (`md/`) vs código deployado?

### B. Riesgo (lo único “duro” además de validación de campos)

- [ ] **B1.** ¿Qué bloquea un trade nuevo — cap mensual o “30 trades”?
- [ ] **B2.** ¿Qué es carryover y dónde se togglea?
- [ ] **B3.** ¿Qué es cap por ticker (`maxLossPerTicker`)?
- [ ] **B4.** ¿El P/L del lab es informativo o es el gate mensual?

### C. Stock Playbook (Trading Book) — a diseñar

- [ ] **C1.** ¿Es un trade? ¿Puede tener shares o exit?
- [ ] **C2.** ¿Qué campos narrativos necesita (thesis, historicalAnalysis, notes)?
- [ ] **C3.** ¿Qué campos de niveles necesita (support, resistance, zones, targets)?
- [ ] **C4.** ¿Qué es `riskIdea` y `invalidation`?
- [ ] **C5.** ¿Qué status de tesis propone (watching, invalidated, archived…) vs status de estrategia (TESTING)?
- [ ] **C6.** ¿Un trade/plan cómo referencia el playbook (`playbookId`)?
- [ ] **C7.** ¿Qué pasa si edito el playbook después de 10 trades?

### D. Planning (ya implementado — el chat debe conocer)

- [ ] **D1.** Campos obligatorios: ticker, ≥1 analysisTimeframe, entryTimeframe = el más chico.
- [ ] **D2.** Catálogo MTF: `6M 3M 1W 1D 1H 30m 15m 5m`.
- [ ] **D3.** Auto-expire si `validUntil` pasa (watching/ready → expired).
- [ ] **D4.** Outcome en failed/skipped: `strategyStillValid`, reason, lesson.

### E. Integración externa (ChatGPT / cualquier chat)

- [ ] **E1.** Snapshot vía Worker GET — no inventar datos.
- [ ] **E2.** Cambios vía POST inbox — nunca auto-apply.
- [ ] **E3.** Sección `=== TRADE PLANS (AI) ===` ya existe en snapshot.
- [ ] **E4.** Sección `=== STOCK THESES (AI) ===` en snapshot — **Phase 0 shipped**.

### F. Diseño — qué NO hacer en fase 1

- [ ] **F1.** Sin market data API.
- [ ] **F2.** Sin AI embebida en la app.
- [ ] **F3.** Sin automatización de estados (transiciones manuales).
- [ ] **F4.** Sin reemplazar Strategy Lab sin plan de convivencia (`type: strategy | stock` o rutas separadas).

---

## Checklist de contenido — Trading Book bien formado (ej. TSLA)

Usar para validar una ficha antes de planning/trade:

| # | Pregunta | Campo |
|---|----------|-------|
| 1 | ¿Por qué este stock ahora? | `thesis` |
| 2 | ¿Qué contexto histórico importa? | `historicalAnalysis` |
| 3 | ¿Soporte y resistencia estructurales? | `majorSupport`, `majorResistance` |
| 4 | ¿Zonas donde sí miraría entrada? | `primaryZone`, `secondaryZone` |
| 5 | ¿Reglas de conducta (ej. solo ≥3R, no chase)? | `riskIdea`, (`minRR` futuro) |
| 6 | ¿Objetivos si la tesis funciona? | `targets` |
| 7 | ¿Cuándo mato la tesis? | `invalidation` |
| 8 | ¿Recordatorio pre-trade? | `notes` |
| 9 | ¿Estado de la tesis? | `status` |
| 10 | ¿Revisado cuándo? | `lastUpdated` |

---

## Ejemplo mínimo — Stock Playbook TSLA (solo ilustración)

```text
Ticker: TSLA
Status: watching
Thesis: Uptrend largo; comprar pullbacks en zona primaria, no chase.
Historical: Pullbacks profundos antes de continuación.
Major Support: 350 | Major Resistance: 500
Primary Zone: 340-355 | Secondary Zone: 300-320
Risk Idea: Ignorar setups < 3R; preferir soporte.
Targets: 430, 450, 500
Invalidation: Cierre mensual bajo 300.
Notes: Revisar playbook antes de abrir plan o H00x.
```

Esto **no** es un PLAN ni un TRADE. No lleva `plannedEntry` obligatorio ni `shares`.

---

## Señales de que el chat NO está listo

Detener y reenviar handoff si propone:

- “Máximo 30 trades” o “solo H001–H030”
- Playbook con campo `entry` / `exit` / `pnl`
- Unificar todo en una sola pantalla sin distinguir Strategy vs Stock
- Broker import o precios automáticos
- “La AI abre el trade cuando toca soporte”
- Borrar o ignorar Planning existente
- Diseñar sin mencionar inbox / aprobación humana

---

## Cuando el check esté completo

El chat debe responder exactamente:

```text
CHECK COMPLETO
- Entiendo las 4 capas y el orden Playbook → Planning → Trade.
- Sé que Strategy Lab (/playbook) ≠ Stock Playbook (a diseñar).
- No hay tope de trades; riesgo duro = mensual + por ticker.
- Fase 1 del Stock Playbook = CRUD + storage + UI Matrix; sin market data ni AI.
Listo para recibir requisitos de diseño.
```

**Recién entonces** pasás a diseño (wireframes, schema, rutas). Stand by hasta esa fase.

---

## Stock Thesis Phase 0 — shipped (2026-07-10)

- Route: `/stock-theses/[id]` (detail); discoverable from Planning Lab panel
- Storage: `data/stock-theses.json` (JSON MVP, no Supabase yet)
- Pilot: `ST-TSLA-001`
- Planning links via `stockThesisId`; R:R validated against thesis `minimumRR`
- Docs: `md/design/stock-thesis-proposal.md`

Phase 1 follow-ups: full thesis CRUD UI, Supabase table, nav list page, AI import block.

---

## Referencias en el repo

| Doc | Contenido |
|-----|-----------|
| `CHATGPT.md` | Coach, inbox, snapshot |
| `md/rules/experiment-cycle.md` | Lab sin tope de trades |
| `md/rules/monthly-risk-vs-experiment.md` | Cap mensual + carryover |
| `md/design/planning-module-proposal.md` | Planning Phase 0 |
| `lib/playbook-types.ts` | Strategy Lab actual (schema) |
| `lib/plan-types.ts` | Planning schema |
| `md/concepts/deferred-matrixtrade.md` | Ideas futuras, no runtime |
