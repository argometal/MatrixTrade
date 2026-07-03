# MatrixTrade — STATUS (actualizar cada sesión)

**Última actualización:** 2026-07-03 (Cursor)

---

## Phase

**Phase 2** — App conectada al Worker + inbox con Apply/Reject. Falta validación en uso real con el usuario.

---

## Objective

Cerrar el loop completo:

```text
Sync (dashboard) → ChatGPT GET /snapshot → ChatGPT POST /inbox → usuario Apply en /inbox
```

---

## Next action (usuario)

1. Copiar tokens de `bridge/.dev.vars` a `.env.local`:
   - `BRIDGE_WRITE_TOKEN`
   - `BRIDGE_READ_TOKEN`
   - `MATRIXTRADE_INBOX_TOKEN` (nuevo, para API local)
2. Redeploy Worker si `/inbox/:id/ack` falla en producción: `bridge/deploy.bat`
3. En local: **Sync to Worker** → escanear QR cloud en `/connect` o pasar URL a ChatGPT
4. Probar un `trade-review` con `bridge/sample-inbox-review.json`

---

## Stop condition

- Propuesta visible en `/inbox`
- Apply actualiza `data/trades.json` o Obsidian (`analysis`)
- Item del Worker marcado applied (ack)

---

## Do not start yet

- Auto-sync al cerrar trade
- Parser MT-IMPORT:v1 (texto pegado)
- POST /trades escritura directa sin inbox
- Cambios a reglas H001–H030 en código (siguen en `data/rules.json`)
- UX ARGUS no solicitada

---

## Commits MatrixTrade relevantes (en `main`)

| Commit | Qué |
|--------|-----|
| `f13ed47` | Learning loop: review wizard, mistakes, stats, equity, setups |
| `8d5e8bc` | Bridge sync, trading inbox, cloud QR, ack endpoint |

*Nota: commits futuros pueden quedar solo en local; Chaos documenta el avance igualmente.*

---

## Bloqueadores conocidos

| Issue | Detalle |
|-------|---------|
| Vercel sin trades reales | `data/trades.json` no persiste en serverless |
| Worker ack | Código listo; puede requerir redeploy |
| Chaos público | No poner secrets aquí |

---

## QR en `/connect`

| QR | Valor | Cuándo usar |
|----|-------|-------------|
| **Cloud snapshot** | URL `GET /snapshot?token=READ_TOKEN` | Cualquier red; solo lectura JSON |
| **Local WiFi** | `http://192.168.x.x:3000` | Misma WiFi; UI completa |

El QR WiFi **no** incluye token. El QR cloud **sí** sirve para teléfono y ChatGPT tras Sync.
