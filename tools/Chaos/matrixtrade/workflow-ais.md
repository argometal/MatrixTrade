# MatrixTrade — workflow para IAs

## Roles

| Actor | Hace |
|-------|------|
| **Usuario** | Opera trades, aprueba inbox, Sync manual |
| **ChatGPT** | Lee snapshot, analiza, propone JSON, POST inbox |
| **Cursor** | Implementa app, actualiza Chaos, push Chaos siempre |
| **Worker** | Puente stateless KV — no escribe trades |

---

## Onboarding ChatGPT (pegar en chat nuevo)

```text
1. Lee https://github.com/argometal/Chaos — matrixtrade/STATUS.md
2. Si tienes acceso al repo privado, lee MatrixTrade/CHATGPT.md
3. Pide al usuario que haga Sync en dashboard (o confirma snapshot reciente)
4. GET https://matrixtrade-bridge.argometal.workers.dev/snapshot?token=READ_TOKEN
   (el usuario te pasa READ_TOKEN o URL completa — nunca guardar en Chaos)
5. Para proponer cambios: POST /inbox con JSON validado (ver tipos abajo)
6. El usuario aplica en http://localhost:3000/inbox
```

---

## Onboarding Cursor

```text
1. git pull https://github.com/argometal/Chaos
2. Leer matrixtrade/STATUS.md + último log/
3. Trabajar MatrixTrade local (código puede no ir a GitHub)
4. Al terminar: actualizar STATUS, CHANGELOG, log/ → git push Chaos
```

---

## JSON propuesta (mínimo)

```json
{
  "type": "trade-review",
  "source": "chatgpt",
  "proposal": {
    "id": "H001",
    "mistakes": ["fomo", "chased"],
    "qualityEntry": 2,
    "qualityExit": 3,
    "qualityMgmt": 4,
    "lesson": "...",
    "actionItem": "..."
  }
}
```

Tipos: `trade-proposal` | `trade-close` | `trade-review` | `analysis`

---

## curl Worker inbox

```bash
curl -X POST "https://matrixtrade-bridge.argometal.workers.dev/inbox" \
  -H "Authorization: Bearer WRITE_TOKEN" \
  -H "Content-Type: application/json" \
  -d @sample-inbox-review.json
```

## curl API local

```bash
curl -X POST "http://localhost:3000/api/trading/inbox" \
  -H "Authorization: Bearer MATRIXTRADE_INBOX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"trade-review","source":"api","proposal":{...}}'
```

---

## Reglas de conducta IA

- No auto-aplicar trades — siempre inbox + clic usuario
- No asumir snapshot fresco sin Sync reciente
- No proponer LAN/QR como arquitectura principal (ya resuelto con Worker)
- No tocar ARGUS / reglas del ciclo sin pedido explícito
- Documentar avance en **Chaos**, no solo en chat

---

## Bucle de producto (objetivo UX)

```text
Capture → Analyze → Learn → Improve
```

Implementado parcialmente:

- **Capture:** manual + inbox propuestas
- **Analyze:** stats, export ChatGPT, snapshot Worker
- **Learn:** review wizard, mistakes, lesson
- **Improve:** action items, dashboard next action
