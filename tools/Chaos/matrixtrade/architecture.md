# MatrixTrade — arquitectura (resumen)

## Fuente de verdad

| Dato | Ubicación |
|------|-----------|
| Trades numéricos | `data/trades.json` (local) |
| Reglas ciclo | `data/rules.json` — loss limit -300, max 30 trades |
| Notas largas | Obsidian vault `vault/Trades/` |
| Setups | `data/setups.json` |
| Inbox local | `data/trading-inbox.json` (gitignored) |

Vercel **no** es fuente de verdad para trades.

---

## Diagrama general

```text
                    ┌─────────────────┐
                    │   Usuario       │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ MatrixTrade    │  │ ChatGPT        │  │ Teléfono       │
│ localhost:3000 │  │ (browsing)     │  │ QR /connect    │
└───────┬────────┘  └───────┬────────┘  └───────┬────────┘
        │                   │                   │
        │ POST /snapshot    │ GET /snapshot     │ GET /snapshot
        │ GET /inbox        │ POST /inbox       │
        ▼                   ▼                   ▼
        └───────────────────┼───────────────────┘
                            ▼
              ┌─────────────────────────┐
              │ Cloudflare Worker + KV    │
              │ matrixtrade-bridge...     │
              └─────────────────────────┘
```

---

## Flujos

### Lectura (estado del ciclo)

1. Usuario pulsa **Sync to Worker** (dashboard).
2. App hace `POST /snapshot` con Bearer `BRIDGE_WRITE_TOKEN`.
3. ChatGPT o teléfono: `GET /snapshot?token=READ_TOKEN`.
4. QR cloud en `/connect` codifica esa misma URL (solo lectura).

### Escritura (propuestas — nunca automática)

1. ChatGPT genera JSON validado (`type` + `proposal`).
2. `POST /inbox` al Worker (WRITE_TOKEN) **o** `POST /api/trading/inbox` local (MATRIXTRADE_INBOX_TOKEN).
3. Usuario abre `/inbox` → preview → **Apply** o **Reject**.
4. Apply usa misma validación que entrada manual (`createTrade`, `closeTrade`, `saveTradeReview`, Obsidian append).
5. Worker: `POST /inbox/{id}/ack` con `applied` o `rejected`.

---

## Tipos de propuesta inbox

| type | Efecto al Apply |
|------|-----------------|
| `trade-proposal` | Crea trade pending |
| `trade-close` | Cierra con exit |
| `trade-review` | Guarda review + mistakes |
| `analysis` | Append secciones en nota Obsidian |

Ejemplos: `bridge/sample-inbox.json`, `bridge/sample-inbox-review.json` (en repo MatrixTrade).

---

## Worker endpoints

| Método | Path | Auth |
|--------|------|------|
| POST | `/snapshot` | Bearer WRITE |
| GET | `/snapshot` | `?token=READ` |
| POST | `/inbox` | Bearer WRITE |
| GET | `/inbox` | `?token=READ` |
| POST | `/inbox/{id}/ack` | Bearer WRITE |

URL: `https://matrixtrade-bridge.argometal.workers.dev`

---

## Chaos vs MatrixTrade

| Chaos | MatrixTrade |
|-------|-------------|
| Coordinación IAs, STATUS, logs | Código y datos |
| Siempre push | Push opcional / local |
| Público, sin secrets | Privado |
