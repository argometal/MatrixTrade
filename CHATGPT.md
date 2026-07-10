# MatrixTrade — context for ChatGPT

**Read this file first** in every new conversation about MatrixTrade.

## Prompt para conversación nueva (copiar y pegar)

```text
Eres mi coach de trading para MatrixTrade (lab conductual, límite mensual -$300, sin tope de trades).

Antes de analizar:
1. Lee CHATGPT.md si está adjunto o en el repo.
2. Confirma que hice "Sync to Worker" en el dashboard (o pídeme la URL snapshot con READ_TOKEN).
3. GET https://matrixtrade-bridge.argometal.workers.dev/snapshot?token=READ_TOKEN

Para proponer cambios (review, cierre, trade nuevo, análisis Obsidian):
- JSON con "type" + "proposal" (ver sección Trading inbox en CHATGPT.md).
- POST https://matrixtrade-bridge.argometal.workers.dev/inbox
  Authorization: Bearer WRITE_TOKEN
- Yo aplico en http://localhost:3000/inbox — nunca auto-aplicar.

Mistakes: fomo, chased, oversized, ignored_stop, ignored_htf, revenge, none.
No ARGUS. Fuente de verdad: data/trades.json + Obsidian local.
```

**Repo:** `github.com/argometal/MatrixTrade` (private)  
**The Library (architecture):** [`md/README.md`](md/README.md)  
**Product research (read before design):** [`md/research/trading-journal-product-research.md`](md/research/trading-journal-product-research.md)  
**Bridge detail:** [`md/integrations/cloudflare-worker-bridge.md`](md/integrations/cloudflare-worker-bridge.md)  
**Vercel + ARGUS production (OPEN):** [`md/integrations/vercel-argus-production-handoff.md`](md/integrations/vercel-argus-production-handoff.md)  
**ARGUS for ChatGPT:** [`md/integrations/argus-chatgpt-handoff.md`](md/integrations/argus-chatgpt-handoff.md)  
**ARGUS architecture (constitution):** [`md/integrations/argus-architecture.md`](md/integrations/argus-architecture.md) · [`md/integrations/argus-design-principles.md`](md/integrations/argus-design-principles.md) · [`md/argus/ai-charter.md`](md/argus/ai-charter.md)

---

## ⚠ Production blocker (Vercel — not a bad deploy)

| Symptom | Cause |
|---------|--------|
| No login on `matrix-trade-theta.vercel.app` | `MATRIXTRADE_PASSWORD` / `ARGUS_PASSWORD` **not set in Vercel** — auth is opt-in, fails **open** |
| “ARGUS missing” | ARGUS is at **`/argus`**, not `/`. No nav link from trading (by design) |
| ARGUS empty on Vercel | `data/argus/` gitignored; no persistent disk on serverless |

**Stable production URL:** `https://matrix-trade-theta.vercel.app` (not the deployment hash URL).  
**Full diagnosis + fix checklist:** [`md/integrations/vercel-argus-production-handoff.md`](md/integrations/vercel-argus-production-handoff.md)

---

## Bridge phase — CLOSED (2026-07-03)

**Criterio de cierre cumplido:** el flujo completo funciona **sin Cursor**:

```text
ChatGPT → POST Worker /inbox → MatrixTrade /inbox → Apply
  → data/trades.json + vault/Trades/*.md → POST Worker /inbox/{id}/ack → Sync snapshot
```

### Reglas post-cierre

1. **Infra cerrada** solo si el flujo anterior funciona end-to-end con el usuario (login → inbox → Apply → Sync).
2. **Worker:** solo bugfix desde ahora — no agregar features al bridge.
3. **Siguiente foco (producto, no infra):** modelo de trading, review, mistakes, estadísticas, playbook sobre datos reales.
4. **Agregar después, no ahora:** `experimentId: "H001-H030-Cycle01"` en snapshot.
5. **Evidencia de cierre:** reportar `snapshotRevision` antes/después, `inboxItemId`, HTTP status POST `/inbox` y ACK, Obsidian actualizado, H001 en snapshot.

### Snapshot versionado (v1)

| Campo | Uso |
|-------|-----|
| `schemaVersion` | `1` — contrato estable |
| `snapshotRevision` | Entero incremental local (`data/snapshot-revision.json`) — ChatGPT sabe qué versión analiza |
| `updatedAt` | ISO timestamp del último Sync |

---

## Current objective

| | |
|---|---|
| **Objective** | **Producto:** review, mistakes, stats, playbook — sobre datos reales del ciclo H001–H030 |
| **Phase** | **3 — Bridge cerrado.** Validar snapshot con ChatGPT en uso real |
| **Next action** | Usuario: login → Sync → ChatGPT lee snapshot → propone JSON → Apply en `/inbox` |
| **Stop condition** | Un ciclo real completo documentado por el usuario (no por Cursor) |
| **Do not start yet** | `experimentId`, auto-sync, MT-IMPORT:v1, nuevas rutas Worker |

**Parallel track (ARGUS):** Active development on v2 (`/argus/v2/*`). Read [`md/argus/README.md`](md/argus/README.md) first, then constitution docs. Operational handoff: [`argus-chatgpt-handoff.md`](md/integrations/argus-chatgpt-handoff.md).

---

## ARGUS (Journal + Network)

| | |
|---|---|
| **Doc index** | [`md/argus/README.md`](md/argus/README.md) — reading order, runtime truth, weaknesses |
| **Architecture** | [`argus-architecture.md`](md/integrations/argus-architecture.md) · [`argus-design-principles.md`](md/integrations/argus-design-principles.md) · [`ai-charter.md`](md/argus/ai-charter.md) |
| **Entry doc for ChatGPT** | [`md/integrations/argus-chatgpt-handoff.md`](md/integrations/argus-chatgpt-handoff.md) |
| **Deliver** | [`deliver-export-checklist.md`](md/argus/deliver-export-checklist.md) · `/argus/v2/deliver` |
| **v2 routes** | `/argus/v2`, `/argus/v2/inbox`, `/argus/v2/browse/network`, `/argus/v2/network/[id]`, `/argus/v2/organizations/[id]`, `/argus/v2/projects/[id]` |
| **Legacy routes** | `/argus/journal`, `/argus/network/[id]` (redirects to v2 for people) |
| **Login** | `/argus/login` — `ARGUS_PASSWORD` |
| **Inbox API** | `POST /api/argus/inbox` — Bearer `ARGUS_INBOX_TOKEN` (write-only) |
| **Data** | `ARGUS_DATA_DIR` + Supabase inbox (see [`argus-storage.md`](md/integrations/argus-storage.md)) |
| **Model** | Entity · Log · InboxItem · Attachment (v3 runtime; v01 target in knowledge-model-v01) |
| **Rule** | Journal + inbox = evidence; Network = derived views |
| **Worker bridge** | Trading only — **not** ARGUS inbox |

Quick inbox POST (local):

```bash
curl.exe -X POST "http://localhost:3000/api/argus/inbox" \
  -H "Authorization: Bearer ARGUS_INBOX_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Note from ChatGPT\",\"source\":\"api\"}"
```

User converts pending items in `/argus/inbox` UI. `rawEmail` preserved unchanged.

---

## 1. Checkpoint alcanzado

| Item | Status |
|------|--------|
| Cloudflare Worker desplegado | ✓ |
| URL del Worker | `https://matrixtrade-bridge.argometal.workers.dev` |
| Wrangler autenticado | ✓ (cuenta Cloudflare, subdomain `argometal.workers.dev`) |
| KV namespace | ✓ `SNAPSHOT` bound |
| POST `/snapshot` probado | ✓ → `200`, guarda en KV |
| GET `/snapshot` probado | ✓ → `200`, JSON con trades |
| H001 AMZN validado desde Worker | ✓ (entry 240, exit 225.9, result -112.8) |
| POST `/inbox` desplegado | ✓ → `201`, agrega id + receivedAt + pending |
| GET `/inbox` desplegado | ✓ → devuelve `{ count, items[] }` |
| POST `/inbox/:id/ack` | ✓ en código — **redeploy Worker** si producción aún no lo tiene |
| MatrixTrade Sync → Worker | ✓ botón en dashboard (`BRIDGE_WRITE_TOKEN`) |
| MatrixTrade Inbox UI | ✓ `/inbox` — preview, Apply, Reject |
| Local inbox API | ✓ `POST /api/trading/inbox` (`MATRIXTRADE_INBOX_TOKEN`) |
| Cloud snapshot QR | ✓ `/connect` — `GET /snapshot?token=READ_TOKEN` (read-only) |

**Tokens:** `WRITE_TOKEN` / `READ_TOKEN` en Cloudflare secrets + `bridge/.dev.vars` local (nunca en git).

**App local:** H001 en `data/trades.json`, dashboard en `http://localhost:3000`  
**Vercel (opcional):** read-only desde git — no escribe al Worker.

---

## 2. Arquitectura actual

### Flujo de lectura (ChatGPT analiza estado)

```text
User
  ↓ pide análisis
ChatGPT
  ↓ GET /snapshot?token=READ_TOKEN
Cloudflare Worker + KV
  ↓ JSON (rules, experiment, trades[])
ChatGPT
  ↓ patrones, comparación, recomendaciones
User
```

### Flujo de escritura (inbox — human approval)

```text
User
  ↓ describe intención / trade propuesto
ChatGPT
  ↓ genera JSON validado
  ↓ POST /inbox  (Bearer WRITE_TOKEN)  — or POST /api/trading/inbox on LAN
Cloudflare Worker + KV   ← cola pending, NO escribe trades
  ↓
MatrixTrade /inbox  ← preview → Apply → data/trades.json + Obsidian
  ↓ POST /inbox/:id/ack (applied|rejected)
```

### Flujo de publicación (app)

```text
MatrixTrade (local) — Sync to Worker
  ↓ POST /snapshot  (Bearer WRITE_TOKEN)
Cloudflare Worker + KV
  ↓
ChatGPT lee GET /snapshot  ·  phone scans QR en /connect
```

### Por qué esta arquitectura

| Decisión | Razón |
|----------|-------|
| Cloudflare Worker + KV | URL pública, $0, sin LAN, sin QR, sin DataTransfer |
| Snapshot separado de inbox | Lectura (estado) vs escritura (propuestas) con responsabilidades claras |
| Worker no escribe trades | MatrixTrade sigue siendo fuente de verdad; evita corrupción automática |
| Obsidian fuera del snapshot v1 | Privacidad y tamaño; tesis largas quedan en vault local |
| GitHub privado | Documentación + código; no expone tokens ni notas |
| Vercel secundario | Dashboard móvil read-only; no reemplaza el bridge |

**Descartado como arquitectura principal:** LAN, localhost, QR, DataTransfer (ver lecciones aprendidas).

---

## 3. Objetivo del proyecto

MatrixTrade **no es solo un registro de trades**.

Es una base estadística y conductual para que **tú (ChatGPT)** puedas:

- Identificar **patrones de comportamiento** del usuario
- **Comparar setups** entre trades (H001–H030)
- Medir **expectativa vs resultado**
- Detectar **errores repetitivos** (disciplina, stops, re-entries)
- **Mejorar la toma de decisiones** con datos estructurados + contexto cualitativo (Obsidian)

El experimento H001–H030 es un ciclo acotado: límite -$300, máximo 30 trades.

---

## 4. Estado actual

### Completado

- ✓ **Worker** — desplegado en producción
- ✓ **Snapshot** — POST/GET funcionando, H001 en KV
- ✓ **Lectura desde ChatGPT** — GET `/snapshot?token=…` validado
- ✓ **Inbox endpoints** — POST/GET `/inbox` + ack en Worker
- ✓ **MatrixTrade Sync** — dashboard publica snapshot
- ✓ **MatrixTrade Inbox** — `/inbox` Apply/Reject (Worker + local API)
- ✓ **Connect QR** — cloud snapshot URL + local WiFi QR

### Pendiente

- □ **Redeploy Worker** — si `/inbox/:id/ack` no responde en producción
- □ **Validación en uso real** — un ciclo completo con ChatGPT
- □ **Auto-sync** — opcional tras cerrar trade
- □ **Consultas avanzadas** — patrones, setups, comparaciones automatizadas

---

## 5. Trading inbox (ChatGPT → MatrixTrade)

**Routes:** `/inbox`, `/inbox/[id]`  
**Worker:** POST `/inbox` (Bearer `WRITE_TOKEN`) · GET `/inbox?token=READ_TOKEN`  
**Local API:** `POST /api/trading/inbox` (Bearer `MATRIXTRADE_INBOX_TOKEN`)

**Proposal types:**

| `type` | `proposal` fields | Apply effect |
|--------|-------------------|--------------|
| `trade-proposal` | `id`, `ticker`, `entry`, `stop`, `shares`, optional `target`, `setupId` | Creates pending trade |
| `trade-close` | `id`, `exit` | Closes trade |
| `trade-review` | `id`, `mistakes[]`, `qualityEntry/Exit/Mgmt`, optional `lesson`, `actionItem` | Saves review |
| `analysis` | `id`, at least one of `thesis`, `psychology`, `lessons`, `notes` | Appends to Obsidian note |

Examples: [`bridge/sample-inbox.json`](bridge/sample-inbox.json), [`bridge/sample-inbox-review.json`](bridge/sample-inbox-review.json)

```bash
curl -X POST "https://matrixtrade-bridge.argometal.workers.dev/inbox" \
  -H "Authorization: Bearer WRITE_TOKEN" \
  -H "Content-Type: application/json" \
  -d @bridge/sample-inbox-review.json
```

User reviews in MatrixTrade `/inbox` — **never auto-applied**.

**URLs base:** `https://matrixtrade-bridge.argometal.workers.dev`

| Acción | Método | Auth |
|--------|--------|------|
| Leer estado | GET `/snapshot?token=READ_TOKEN` | query |
| Encolar propuesta | POST `/inbox` | `Authorization: Bearer WRITE_TOKEN` |
| Ver cola | GET `/inbox?token=READ_TOKEN` | query |
| Ack tras Apply/Reject | POST `/inbox/{id}/ack` | `Authorization: Bearer WRITE_TOKEN` body `{"status":"applied"}` |

---

## 6. Principios

| Rol | Responsabilidad |
|-----|-----------------|
| **Cursor** | Construye infraestructura solamente |
| **ChatGPT (tú)** | Analiza datos, razona, propone JSON validado |
| **MatrixTrade** | Fuente de verdad numérica (`data/trades.json`, reglas, métricas) |
| **Cloudflare Worker** | Puente stateless entre ChatGPT y MatrixTrade |
| **Obsidian** | Conocimiento largo plazo (tesis, psicología, lecciones) |
| **GitHub** | Versionado y documentación de arquitectura |

**Reglas de conducta para ChatGPT:**

- No proponer Supabase, Telegram, Gmail, Drive, D1, LAN, QR como solución principal
- No decidir trades solo — el usuario aprueba
- No asumir que el snapshot está actualizado si no hubo POST reciente
- Leer este archivo + GET snapshot antes de analizar trades

---

## 7. Lecciones aprendidas

| Intento | Resultado |
|---------|-----------|
| LAN + localhost + QR | Descartado — restricciones de red, no funciona desde iPhone fuera de casa |
| DataTransfer | Descartado como flujo principal — fricción y dependencia local |
| Copy/paste bloques largos | Funciona pero no escala — reemplazado por URL + JSON |
| **Worker + Cloudflare KV** | **Resolvió conectividad** — URL pública, $0, accesible desde cualquier dispositivo |
| `CHATGPT.md` en raíz del repo | Permite retomar contexto sin prompts largos — **mantener actualizado** |
| Patrón reutilizable | Worker + KV + tokens puede usarse en **otros proyectos** del usuario |

---

## 8. Futuro (no implementar aún)

- Auto-sync al cerrar trade
- Parser MT-IMPORT:v1 (texto pegado)
- POST `/trades` directo sin inbox

**Flujo inbox (ya implementado):** ChatGPT POST `/inbox` → usuario Apply en `/inbox` → `data/trades.json` + Obsidian.

---

## Endpoints (referencia rápida)

| Method | Path | Auth | KV |
|--------|------|------|-----|
| POST | `/snapshot` | Bearer WRITE_TOKEN | `snapshot:latest` |
| GET | `/snapshot` | `?token=READ_TOKEN` | read snapshot |
| POST | `/inbox` | Bearer WRITE_TOKEN | `inbox:item:{uuid}` + `inbox:index` |
| GET | `/inbox` | `?token=READ_TOKEN` | pending items only |
| POST | `/inbox/{id}/ack` | Bearer WRITE_TOKEN | mark applied/rejected |

**Inbox item shape:**

```json
{
  "id": "uuid",
  "receivedAt": "ISO-8601",
  "status": "pending",
  "payload": { }
}
```

---

## Key files

| Path | Contents |
|------|----------|
| [`CHATGPT.md`](CHATGPT.md) | Este archivo — punto de entrada |
| [`bridge/src/index.ts`](bridge/src/index.ts) | Worker: snapshot + inbox |
| [`bridge/sample-snapshot.json`](bridge/sample-snapshot.json) | Ejemplo snapshot H001 |
| [`bridge/sample-inbox-review.json`](bridge/sample-inbox-review.json) | Ejemplo trade-review |
| [`lib/bridge.ts`](lib/bridge.ts) | Bridge + validación propuestas |
| [`app/(trading)/inbox/`](app/(trading)/inbox/) | UI inbox trading |
| [`app/api/trading/inbox/route.ts`](app/api/trading/inbox/route.ts) | API local inbox |
| [`data/trades.json`](data/trades.json) | Trades estructurados (H001) |
| [`data/rules.json`](data/rules.json) | Límites ciclo, paths Obsidian |
| [`md/integrations/chatgpt-bridge.md`](md/integrations/chatgpt-bridge.md) | Roles and política de sync |
| [`md/argus/README.md`](md/argus/README.md) | **ARGUS doc index** — reading order, runtime truth, mobile QA |
| [`md/integrations/argus-architecture.md`](md/integrations/argus-architecture.md) | **ARGUS accepted architecture — constitution** |
| [`md/integrations/argus-design-principles.md`](md/integrations/argus-design-principles.md) | **ARGUS design principles — 10 rules** |
| [`md/argus/ai-charter.md`](md/argus/ai-charter.md) | **ARGUS AI Charter v1.0 — rule of construction for all AI** |
| [`md/argus/knowledge-model-v01.md`](md/argus/knowledge-model-v01.md) | ARGUS ontology — evidence graph, entities, linking |
| [`md/argus/v2-design-checklist.md`](md/argus/v2-design-checklist.md) | v2 UI QA checklist — update on every design change |
| [`md/argus/checklist-protocol.md`](md/argus/checklist-protocol.md) | How to maintain the v2 checklist |
| [`md/integrations/argus-chatgpt-handoff.md`](md/integrations/argus-chatgpt-handoff.md) | ARGUS Journal + Network + inbox for ChatGPT |
| [`md/integrations/vercel-argus-production-handoff.md`](md/integrations/vercel-argus-production-handoff.md) | Vercel + ARGUS production gap |
| [`app/api/argus/export/route.ts`](app/api/argus/export/route.ts) | Evidence Vault ZIP export (v1) |
| [`lib/argus/export/`](lib/argus/export/) | Export collector, manifest, ZIP writer |
| [`lib/argus/network.ts`](lib/argus/network.ts) | Network view (read-only) |

---

## App phases (roadmap)

| Phase | What | Status |
|-------|------|--------|
| 0 | H001 visible en app local + Vercel read-only | Done |
| 1 | Worker + snapshot GET/POST | Done |
| 1b | Worker + inbox GET/POST | Done |
| 1c | Learning loop (review, stats, mistakes) | Done |
| 2 | MatrixTrade Sync + inbox Apply + cloud QR | Done |
| 2b | Validación end-to-end con usuario + ChatGPT | **Current** |
| 3 | Auto-sync, MT-IMPORT, consultas avanzadas | Not started |
