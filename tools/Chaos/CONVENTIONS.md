# Convenciones Chaos — para agentes

## Regla principal

> **MatrixTrade no siempre recibe push. Chaos siempre sí.**

Después de cada sesión de trabajo (aunque el código quede solo en local):

1. Actualizar `matrixtrade/STATUS.md` (objetivo, fase, siguiente paso).
2. Añadir entrada en `matrixtrade/CHANGELOG.md` si hubo cambios.
3. Crear o ampliar un archivo en `log/` con el detalle de la sesión.
4. `git add` → `git commit` → `git push origin main`.

El usuario usa Chaos para que **cualquier IA** retome contexto sin depender del push del producto.

---

## Formato de commits en Chaos

```text
log(matrixtrade): <resumen corto>
docs(matrixtrade): <actualización de STATUS>
```

Ejemplos:

- `log(matrixtrade): bridge inbox + cloud QR implementados`
- `docs(matrixtrade): fase 2 — validar ciclo ChatGPT end-to-end`

---

## Archivo `log/`

Un archivo por sesión relevante:

```text
log/2026-07-03-matrixtrade-bridge-inbox.md
```

Contenido mínimo:

- Fecha y agente (Cursor, ChatGPT, etc.)
- Qué se hizo
- Qué quedó pendiente
- Decisiones del usuario
- Referencias a commits MatrixTrade (si existen) sin pegar código largo

---

## Actualizar `STATUS.md`

Siempre incluir:

| Campo | Descripción |
|-------|-------------|
| **Phase** | Fase actual del roadmap |
| **Objective** | Meta inmediata |
| **Next action** | Un paso concreto para el usuario o la siguiente IA |
| **Stop condition** | Cuándo se considera cerrado el objetivo |
| **Do not start** | Límites explícitos |

---

## Visibilidad

Chaos es **público** — decisión del usuario para que las IAs lean handoffs sin repo privado. Si el chat se pierde, `github.com/argometal/Chaos` sigue siendo la fuente de verdad de coordinación.

## Qué NO va en Chaos

- Código fuente de MatrixTrade (va en su repo o queda local).
- Secrets (`BRIDGE_*`, `MATRIXTRADE_PASSWORD`, etc.).
- Duplicar docs largos — enlazar a rutas en MatrixTrade cuando existan en git.

---

## Handoff a ChatGPT

Pegar en conversación nueva:

```text
Contexto compartido: https://github.com/argometal/Chaos
Lee: README.md → matrixtrade/STATUS.md → último log/
Producto técnico (si hace falta): MatrixTrade CHATGPT.md en repo privado.
```

---

## Handoff a Cursor

El agente debe clonar o pull Chaos al inicio si trabaja en MatrixTrade, y push Chaos al final aunque MatrixTrade no se suba.
