# Health Vault

Bitácora laboral con evidencias. Rama discreta de MatrixTrade.

> *Eres tan bueno como lo que puedes comprobar con evidencias.*

---

## Para IAs — leer primero

**[`CONTEXTO-IA.md`](CONTEXTO-IA.md)** — handoff completo: qué es, qué no es, historial de sesiones, reglas.

**[`docs/`](docs/)** — aquí el usuario mete sus archivos `.md` (quejas, correos, notas, explicaciones de otras IAs).

---

## Ubicación

| | |
|---|---|
| Repo | `github.com/argometal/MatrixTrade` (privado) |
| Rama | `cursor/health-vault-dbc8` |
| Carpeta | `health-vault/` |
| Trading | rama `main` — **no tocar** |

---

## Flujo principal (acordado)

1. El usuario **mete cosas** en esta rama (archivos, textos, evidencias).
2. Queda **escondido** respecto a `main` — conveniente y profesional.
3. Cursor u otras IAs ayudan a organizar y documentar en `docs/`.

La app web en `app/` es **opcional** (ver abajo).

---

## App web (opcional)

Next.js + TypeScript + Tailwind + localStorage. Solo si se corre en PC:

```bash
cd health-vault
npm install
npm run dev
```

Registros, personas, evidencias. Datos en el navegador, no en GitHub.

---

## Documentación

| Archivo | Contenido |
|---------|-----------|
| [CONTEXTO-IA.md](CONTEXTO-IA.md) | Handoff para cualquier IA |
| [docs/README.md](docs/README.md) | Índice de documentos del usuario |
| [docs/historial-ia.md](docs/historial-ia.md) | Qué hizo cada sesión de IA |
