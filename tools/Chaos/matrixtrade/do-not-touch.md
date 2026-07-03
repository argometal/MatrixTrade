# MatrixTrade — NO TOCAR (salvo petición explícita)

## ARGUS

- Rutas `/argus/*`
- `POST /api/argus/inbox`, `POST /api/argus/email-inbox`
- `data/argus/` o `ARGUS_DATA_DIR`
- Docs: `md/integrations/argus-*.md`
- Lógica Journal / Network / clasificación

El Worker bridge es **solo trading**.

---

## Reglas del experimento

- `data/rules.json` — `cycleLossLimit: -300`, `maxTrades: 30`
- No hardcodear cambios de límites en código
- IDs H001–H030

---

## Datos sensibles

- No commitear `data/trades.json` con PII real (si aplica)
- No tokens en Chaos ni en git
- Obsidian vault — no subir contenido a Chaos

---

## Refactors no solicitados

- No reestructurar repo completo
- No unificar ARGUS + Trading inbox
- No añadir brokers / import CSV masivo sin pedido

---

## Docs

- No crear duplicados de `md/research/trading-journal-product-research.md`
- Actualizar Chaos en lugar de nuevos archivos dispersos para handoff IA
