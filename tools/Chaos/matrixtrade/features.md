# MatrixTrade — features (rutas y componentes)

## Rutas trading

| Ruta | Función |
|------|---------|
| `/` | Dashboard: PnL ciclo, next action, needs attention, equity mini, Bridge sync, export ChatGPT |
| `/trades` | Lista trades |
| `/trades/new` | Alta manual + picker setup |
| `/trades/[id]` | Detalle trade |
| `/trades/[id]/review` | Wizard 5 pasos post-cierre |
| `/stats` | Win rate, equity curve, métricas ciclo |
| `/mistakes` | Tags de error + costo USD |
| `/connect` | QR cloud snapshot + QR WiFi local |
| `/inbox` | Cola propuestas AI |
| `/inbox/[id]` | Preview JSON → Apply / Reject |
| `/login` | Auth `MATRIXTRADE_PASSWORD` |

---

## APIs

| Endpoint | Auth | Uso |
|----------|------|-----|
| `POST /api/trading/inbox` | `MATRIXTRADE_INBOX_TOKEN` | Encolar propuesta en local |

Headers: `Authorization: Bearer` o `X-Matrixtrade-Inbox-Token`.

---

## Componentes clave (MatrixTrade repo)

| Archivo | Rol |
|---------|-----|
| `app/components/TradeReviewWizard.tsx` | Review guiado |
| `app/components/EquityCurve.tsx` | Curva equity |
| `app/components/ChatGptHandoff.tsx` | Export contexto v2 |
| `app/components/BridgeSyncPanel.tsx` | Botón Sync Worker |
| `app/components/BridgeConnectCard.tsx` | QR cloud |
| `app/components/ConnectPageContent.tsx` | QR WiFi LAN |
| `lib/review.ts` | Mistakes, stats, next action |
| `lib/setups.ts` / `lib/setup-types.ts` | Setups (types client-safe) |
| `lib/bridge.ts` | Bridge client/server |
| `lib/apply-trading-inbox.ts` | Lógica Apply |
| `lib/trading-inbox-storage.ts` | Cola local |

---

## Campos review en Trade (`lib/types.ts`)

- `mistakes: MistakeType[]` — fomo, chased, oversized, ignored_stop, ignored_htf, revenge, none
- `qualityEntry`, `qualityExit`, `qualityMgmt` — 1–5
- `reviewedAt`, `lesson`, `actionItem`, `setupId`

---

## Dashboard "Needs attention"

- Trades cerrados sin review
- Items pending en inbox (Worker + local)
- Budget warning si se acerca a -$300

---

## Cierre de trade

`closeTrade` en `app/actions.ts` → redirect a `/trades/[id]/review`.

---

## Env vars (`.env.local.example`)

```text
MATRIXTRADE_PASSWORD
MATRIXTRADE_INBOX_TOKEN
BRIDGE_WORKER_URL
BRIDGE_WRITE_TOKEN
BRIDGE_READ_TOKEN
```

Nunca commitear valores reales.
