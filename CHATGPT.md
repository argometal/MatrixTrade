# MatrixTrade — context for ChatGPT

**Read this file first** in every new conversation about MatrixTrade.

**Repo:** `github.com/argometal/MatrixTrade` (private)  
**Doc library:** [`md/README.md`](md/README.md)  
**Bridge detail:** [`md/integrations/cloudflare-worker-bridge.md`](md/integrations/cloudflare-worker-bridge.md)  
**Vercel + ARGUS production (OPEN):** [`md/integrations/vercel-argus-production-handoff.md`](md/integrations/vercel-argus-production-handoff.md)  
**ARGUS for ChatGPT:** [`md/integrations/argus-chatgpt-handoff.md`](md/integrations/argus-chatgpt-handoff.md)  
**ARGUS architecture (constitution):** [`md/integrations/argus-architecture.md`](md/integrations/argus-architecture.md) · [`md/integrations/argus-design-principles.md`](md/integrations/argus-design-principles.md)

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

## Current objective

| | |
|---|---|
| **Objective** | Validate inbox end-to-end: ChatGPT POST/GET `/inbox` in real use |
| **Phase** | Phase 1c — inbox on Worker deployed; workflow not closed yet |
| **Next action** | ChatGPT POST validated JSON to `/inbox`; confirm GET returns pending items |
| **Stop condition** | Both endpoints confirmed from ChatGPT browsing + user review of queued payload |
| **Do not start yet** | MatrixTrade Sync button, auto-sync, inbox processing in app, POST /trades |

**Parallel track (ARGUS):** Architecture frozen — **no UX implementation** until [`argus-architecture.md`](md/integrations/argus-architecture.md) + [`argus-design-principles.md`](md/integrations/argus-design-principles.md) are read. Operational handoff: [`argus-chatgpt-handoff.md`](md/integrations/argus-chatgpt-handoff.md).

---

## ARGUS (Journal + Network)

| | |
|---|---|
| **Architecture** | [`argus-architecture.md`](md/integrations/argus-architecture.md) · [`argus-design-principles.md`](md/integrations/argus-design-principles.md) — **read before any ARGUS UX work** |
| **Entry doc for ChatGPT** | [`md/integrations/argus-chatgpt-handoff.md`](md/integrations/argus-chatgpt-handoff.md) |
| **Routes** | `/argus/journal`, `/argus/network`, `/argus/inbox`, `/argus/search`, `/argus/new` |
| **Login** | `/argus/login` — `ARGUS_PASSWORD` |
| **Inbox API** | `POST /api/argus/inbox` — Bearer `ARGUS_INBOX_TOKEN` (write-only) |
| **Data** | `ARGUS_DATA_DIR` (see [`argus-storage.md`](md/integrations/argus-storage.md)) |
| **Model** | Entity · Log/Event/Follow-up · InboxItem · Attachment |
| **Rule** | Journal = source of truth; Network reads Journal only |
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
| MatrixTrade conectado al Worker | ✗ (app no publica snapshot ni lee inbox aún) |

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

### Flujo de escritura (futuro inmediato — inbox)

```text
User
  ↓ describe intención / trade propuesto
ChatGPT
  ↓ genera JSON validado
  ↓ POST /inbox  (Bearer WRITE_TOKEN)
Cloudflare Worker + KV   ← cola pending, NO escribe trades
  ↓
MatrixTrade (pendiente)  ← GET /inbox, revisión humana, luego guarda en data/trades.json + Obsidian
```

### Flujo de publicación (pendiente en app)

```text
MatrixTrade (local)
  ↓ POST /snapshot  (Bearer WRITE_TOKEN)
Cloudflare Worker + KV
  ↓
ChatGPT lee GET /snapshot
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
- ✓ **Inbox endpoints** — POST/GET `/inbox` en Worker (infra lista)

### Pendiente

- □ **Inbox en uso real** — ChatGPT envía JSON validado en conversación (workflow humano)
- □ **Escritura desde ChatGPT** — flujo acordado de propuestas → cola → aprobación
- □ **Integración MatrixTrade → Worker** — botón Sync `/snapshot` desde app local
- □ **Integración MatrixTrade ← Inbox** — app lee pending, preview, apply a `data/trades.json`
- □ **Consultas avanzadas** — patrones, setups, comparaciones históricas automatizadas

---

## 5. Próximo objetivo

**Validar completamente desde ChatGPT (sin tocar MatrixTrade app):**

1. **POST `/inbox`** — enviar JSON estructurado (ej. `bridge/sample-inbox.json`)
2. **GET `/inbox`** — confirmar item pending con `id`, `receivedAt`, `status`, `payload`

No avanzar a Sync en MatrixTrade ni procesamiento de inbox en app hasta cerrar esta validación.

**URLs base:** `https://matrixtrade-bridge.argometal.workers.dev`

| Acción | Método | Auth |
|--------|--------|------|
| Leer estado | GET `/snapshot?token=READ_TOKEN` | query |
| Encolar propuesta | POST `/inbox` | `Authorization: Bearer WRITE_TOKEN` |
| Ver cola | GET `/inbox?token=READ_TOKEN` | query |

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

## 8. Idea futura (NO implementar aún)

**Flujo objetivo cuando inbox esté validado:**

1. Usuario describe trade o ajuste en ChatGPT
2. ChatGPT genera JSON validado (tipo, proposal, thesis, etc.)
3. ChatGPT (o script) hace **POST `/inbox`** al Worker
4. MatrixTrade hace **GET `/inbox`**, muestra preview, usuario confirma
5. MatrixTrade escribe en `data/trades.json` + Obsidian — nunca el Worker directamente

**No implementar todavía:** POST `/trades`, escritura automática, procesamiento inbox en app.

Solo documentado como dirección evolutiva.

---

## Endpoints (referencia rápida)

| Method | Path | Auth | KV |
|--------|------|------|-----|
| POST | `/snapshot` | Bearer WRITE_TOKEN | `snapshot:latest` |
| GET | `/snapshot` | `?token=READ_TOKEN` | read snapshot |
| POST | `/inbox` | Bearer WRITE_TOKEN | `inbox:item:{uuid}` + `inbox:index` |
| GET | `/inbox` | `?token=READ_TOKEN` | pending items only |

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
| [`bridge/sample-inbox.json`](bridge/sample-inbox.json) | Ejemplo propuesta H002 |
| [`data/trades.json`](data/trades.json) | Trades estructurados (H001) |
| [`data/rules.json`](data/rules.json) | Límites ciclo, paths Obsidian |
| [`md/integrations/chatgpt-bridge.md`](md/integrations/chatgpt-bridge.md) | Roles and política de sync |
| [`md/integrations/argus-architecture.md`](md/integrations/argus-architecture.md) | **ARGUS accepted architecture — constitution** |
| [`md/integrations/argus-design-principles.md`](md/integrations/argus-design-principles.md) | **ARGUS design principles — 10 rules** |
| [`md/integrations/argus-chatgpt-handoff.md`](md/integrations/argus-chatgpt-handoff.md) | ARGUS Journal + Network + inbox for ChatGPT |
| [`md/integrations/vercel-argus-production-handoff.md`](md/integrations/vercel-argus-production-handoff.md) | Vercel + ARGUS production gap |
| [`app/api/argus/inbox/route.ts`](app/api/argus/inbox/route.ts) | Write-only ARGUS inbox API |
| [`lib/argus/network.ts`](lib/argus/network.ts) | Network view (read-only) |

---

## App phases (roadmap)

| Phase | What | Status |
|-------|------|--------|
| 0 | H001 visible en app local + Vercel read-only | Done |
| 1 | Worker + snapshot GET/POST | Done |
| 1b | Worker + inbox GET/POST | Done (infra) |
| 1c | ChatGPT valida inbox en conversación real | **Current** |
| 2 | MatrixTrade Sync → POST `/snapshot` | Not started |
| 3 | MatrixTrade lee `/inbox`, preview, apply | Not started |
| 4 | Consultas avanzadas / index / patrones | Not started |
