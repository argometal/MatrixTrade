# Chaos — canal de coordinación entre IAs

**Repo:** https://github.com/argometal/Chaos  
**Local (Windows):** `c:\Tools\Chaos`  
**Propósito:** Comunicación, handoffs y bitácora entre agentes (Cursor, ChatGPT, etc.) **sin** mezclar el código del producto.

---

## Para cualquier IA: empieza aquí

| Paso | Qué leer |
|------|----------|
| 1 | Este archivo (`README.md`) |
| 2 | [`CONVENTIONS.md`](CONVENTIONS.md) — reglas de uso y push |
| 3 | Proyecto activo → carpeta correspondiente (ej. [`matrixtrade/README.md`](matrixtrade/README.md)) |
| 4 | Último log en [`log/`](log/) |

**Ruta canónica para pasar a otras IAs:**

```text
https://github.com/argometal/Chaos/blob/main/README.md
```

O en una conversación nueva:

> Lee primero `github.com/argometal/Chaos` — README + `matrixtrade/STATUS.md` + el último archivo en `log/`.

---

## Repos del ecosistema

| Repo | Rol | Push de código |
|------|-----|----------------|
| **Chaos** (este) | Coordinación IA ↔ IA, decisiones, avance, comentarios | **Siempre** tras cada sesión |
| **MatrixTrade** | App trading + ARGUS (privado) | Solo cuando el usuario lo pida |
| Worker bridge | `matrixtrade-bridge.argometal.workers.dev` | Deploy separado (`bridge/deploy.bat`) |

---

## Estructura

```text
Chaos/
├── README.md              ← entrada global
├── CONVENTIONS.md         ← reglas para agentes
├── matrixtrade/           ← todo lo del experimento H001–H030
│   ├── README.md
│   ├── STATUS.md          ← estado actual (actualizar cada sesión)
│   ├── CHANGELOG.md
│   ├── architecture.md
│   ├── features.md
│   ├── workflow-ais.md
│   ├── decisions.md
│   └── do-not-touch.md
└── log/                   ← bitácora por sesión/fecha
    └── YYYY-MM-DD-*.md
```

---

## Visibilidad: público a propósito

Chaos es **público** para que cualquier IA (ChatGPT browsing, Cursor, etc.) lea el contexto **sin** acceso al repo privado MatrixTrade. Es el canal de coordinación; si falla el chat, el handoff sigue en GitHub.

## Seguridad

- **No** tokens, passwords, ni datos de trades reales.
- **No** contenido de Obsidian ni `data/trades.json`.
- Solo coordinación operativa y referencias a rutas/archivos del otro repo.

---

## Última actualización

**2026-07-03** — Handoff inicial MatrixTrade trading (learning loop + bridge + inbox + QR).
