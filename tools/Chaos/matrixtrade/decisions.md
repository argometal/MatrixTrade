# MatrixTrade — decisiones (no reabrir sin usuario)

| Fecha | Decisión | Razón |
|-------|----------|-------|
| 2026-07 | Experimento H001–H030 acotado | Disciplina; reglas en `data/rules.json` |
| 2026-07 | Worker + KV como bridge principal | Sin LAN/QR como arquitectura core; URL pública $0 |
| 2026-07 | Inbox con aprobación humana | Misma filosofía que ARGUS; evita corrupción automática |
| 2026-07 | ARGUS y Trading inbox separados | Productos distintos; APIs distintas |
| 2026-07 | Research en `md/research/` único | Usuario rechazó docs duplicados |
| 2026-07 | No copiar 600 stats de TradesViz | Nicho: conducta + ChatGPT, no broker sync |
| 2026-07 | Sync manual (no auto al cerrar trade) | Pendiente validación; usuario controla cuándo publica |
| 2026-07 | Dos QRs en `/connect` | WiFi = UI local; Cloud = JSON read-only anywhere |
| 2026-07 | Chaos repo **público** para IAs | Coordinación sin push del producto; fallback si falla comunicación en chat |
| 2026-07 | Mantener Chaos público (confirmado usuario) | Solo coordinación; nunca secrets ni trades reales |
| 2026-07 | MatrixTrade push opcional; Chaos push obligatorio | Usuario quiere bitácora IA aunque código quede local |

---

## Rechazado / descartado

- Supabase, Telegram, Gmail, Drive como bridge principal
- DataTransfer como flujo principal
- Duplicar research en `md/topics/`
- Auto-write trades desde Worker
- Modificar ARGUS al trabajar trading

---

## Pendiente de decisión usuario

- Auto-sync al cerrar trade (sí/no)
- MT-IMPORT:v1 texto vs solo JSON inbox
