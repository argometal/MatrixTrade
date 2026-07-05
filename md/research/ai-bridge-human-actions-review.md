# MatrixTrade — Revisión AI Bridge orientada a acciones humanas

**Documento para handoff a ChatGPT / Copilot.**  
Generado: 2026-07-05 · Contexto: revisión de producto sin rediseño de DB.

---

## Verdict

El feedback es **correcto y bien priorizado**.

Modelo humano del usuario:

1. **Abrir**
2. **Corregir**
3. **Cerrar**
4. **Analizar**

El repo ya tiene la **mecánica correcta por debajo** (Inbox → Apply → Supabase, tipos internos, validación). Lo que falla hoy es la **capa visible**: UI, snapshot request y lenguaje del protocolo hablan como un API interno, no como acciones de trading.

**Conclusión:** no separar todavía todo el modelo. Primero arreglar la mecánica humana.

---

## Qué ya está alineado (no hay que reinventar)

| Pedido | Estado actual |
|--------|---------------|
| Inbox → Apply → Supabase | ✓ Implementado y estable |
| Trades activos / pending en snapshot | ✓ `=== OPEN TRADES ===`, `=== PENDING ORDERS ===` |
| Closed sin review | ✓ `=== CLOSED SIN REVIEW ===` |
| Playbook summary | ✓ `=== PLAYBOOK ===` con winrate, trades, net PnL |
| AI notes de contexto | ✓ `=== AI NOTES (PRIOR) ===` |
| Tipos internos preservados | ✓ `trade-proposal`, `trade-close`, etc. |
| Sin auto-apply | ✓ Explícito en UI y código |

La infraestructura **no** es el problema. El problema es que el usuario ve `trade-proposal` en placeholder, dropdown de samples e Inbox, cuando piensa *"cerré GOOGL en 172"*.

---

## Gaps reales

### 1. UI demasiado técnica

Hoy `/ai-workspace` expone:

- placeholder con JSON de `trade-proposal`
- dropdown "Choose block type…" con labels técnicos
- flujo "Paste AI Block", no "qué quieres hacer"

El usuario **nunca debería elegir** un block type. Eso es responsabilidad del AI + parser interno.

### 2. Protocolo mixto / confuso

Dos voces en el snapshot:

- **`DEFAULT_AI_BLOCK_REQUEST`** → pide AI Block JSON con tipos técnicos
- **`DEFAULT_SECTIONED_REQUEST`** → pide array `notes` con `proposal_json` opcional

Para flujo humano-action: **una sola instrucción** — *"devuelve exactamente un AI Block; elige el tipo internamente según la intención del usuario."*

### 3. Snapshot incompleto vs lo deseado

| Pedido | Hoy |
|--------|-----|
| Recent closed trades | Solo "closed sin review", no bloque de recientes cerrados |
| Best / worst / most used playbooks | Stats sí; **ranking explícito** no |
| Unassigned trades | Se calcula en analytics; **no como sección legible** en snapshot |
| Inferencia de estilo | No hay guía en REQUEST de cuándo sugerir playbook |

### 4. "Analizar" vs "Review" — ambigüedad

En el repo son **dos acciones distintas**:

- **Analizar** → `analysis` (notas: thesis, psychology, lessons)
- **Review** → `trade-review` (post-cierre: quality scores, mistakes, lesson)

En UI conviene:

- **Analyze trade** — notas mientras está abierto o recién cerrado
- **Review trade** — cierre del loop de aprendizaje post-cierre

---

## Desafíos al feedback (importante)

### Playbook no es igual que los 4 pasos

Abrir, corregir y cerrar son acciones sobre **un trade**. Playbook es **meta-aprendizaje**. Tratarlo como quinto botón principal puede:

- inflar ruido en cada conversación
- empujar al AI a crear playbooks demasiado pronto

**Recomendación:** acción secundaria o condicional — *"solo si el patrón es claro y repetido en ≥2 trades similares"*.

### Inferencia de playbook — con reglas duras

Sin auto-apply, la inferencia va bien **como propuesta en el Block**. Riesgo: asignar mal contamina stats del experimento H001–H030.

El Inbox debe mostrar lenguaje humano: *"Assign GOOGL H002 to playbook: Momentum Pullback"*.

### "Adjust trade" es amplio

`trade-update` puede cambiar stop, target, thesis, status, playbookId… Un botón "Adjust" necesita sub-intenciones o ejemplos:

- ajustar riesgo (stop/target)
- corregir datos (entry/shares)
- marcar como open
- asignar playbook

### Snapshot no debe crecer sin límite

Priorizar:

1. open + pending + últimos 3–5 closed
2. unassigned count + lista corta
3. top 2 playbooks por net PnL + peor 1
4. AI notes filtradas al contexto

---

## Mapa acción humana → tipo interno (sin rediseño DB)

| Acción humana (UI / protocolo) | Tipo interno | Notas |
|-------------------------------|--------------|-------|
| Open trade | `trade-proposal` | `status: pending \| open` |
| Adjust trade | `trade-update` | Uno o más campos |
| Close trade | `trade-close` | `confirmExternalClose` si pending externo |
| Analyze trade | `analysis` | Al menos un campo de notas |
| Review trade | `trade-review` | Solo closed; scores 1–5 |
| Playbook / style | `playbook-create` / `playbook-update` / `trade-update.playbookId` | Secundario, condicional |

---

## Secuencia recomendada

### Fase 1 — Capa humana (máximo impacto, mínimo riesgo)

- UI: acciones humanas en lugar de block types
- Inbox summary: "Close H002 at 172.25" en vez de `trade-close`
- REQUEST del snapshot: lenguaje natural + "elige tipo internamente"
- Samples por acción, no por tipo técnico

### Fase 2 — Snapshot más útil

- Sección `UNASSIGNED TRADES`
- `RECENT CLOSED` (últimos N)
- `PLAYBOOK RANKING`: most used / best net PnL / worst net PnL

### Fase 3 — Guía de inferencia de estilo

- Cuándo proponer playbook vs solo notas
- Cuándo NO proponer playbook

### NO ahora

- Nuevo modelo de datos
- Nuevos block types públicos
- Auto-apply
- Separar repos

---

## Modelo de 4 pasos vs repo

| Paso humano | ¿Encaja? | Fricción actual |
|-------------|----------|-----------------|
| Abrir | ✓ | UI no distingue planned vs already-open at broker |
| Corregir | ✓ (`trade-update`) | Usuario no sabe que existe |
| Cerrar | ✓ | Caso broker-externo requiere `confirmExternalClose` |
| Analizar | ✓ parcial | Confundido con `trade-review`; request inconsistente |

**Playbook** = plus del ciclo Analyze/Review, no cuarto pilar obligatorio.

---

## Reglas para ChatGPT (copiar en conversación nueva)

```text
Lee primero:
- CHATGPT.md
- md/research/ai-bridge-human-actions-review.md (este documento)
- md/integrations/ai-block-workflow.md

Modelo humano del usuario: Abrir → Corregir → Cerrar → Analizar.
No hables al usuario en términos de trade-proposal/trade-close salvo en el JSON del Block.

Cuando propongas cambios:
- Devuelve exactamente UN AI Block JSON válido.
- Elige el type internamente según la intención.
- Nunca auto-aplicar — el usuario Apply en /inbox.

Para abrir posición ya llena en broker: trade-proposal con "status": "open".
Para cerrar pending ejecutado fuera: trade-close con "confirmExternalClose": true.

Playbook solo si el patrón es claro y repetible; preferir sugerir en trade-update antes de playbook-create.
```

---

## Referencias en el repo

| Archivo | Contenido |
|---------|-----------|
| `CHATGPT.md` | Contexto general MatrixTrade |
| `md/integrations/ai-block-workflow.md` | Flujo AI Block + ejemplos protocolo |
| `lib/ai-block.ts` | Tipos, samples, REQUEST default |
| `lib/sectioned-snapshot.ts` | Secciones del snapshot |
| `app/components/ai-workspace/AiBlockPanel.tsx` | UI actual (técnica) |
