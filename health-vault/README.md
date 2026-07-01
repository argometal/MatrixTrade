# Health Vault

Bitácora laboral privada — integrada en MatrixTrade.

## Acceso

| | |
|---|---|
| URL | `http://localhost:3000/health/login` |
| Datos | `data/health-vault/` (gitignored, solo en tu PC) |
| Trading | `/login` — contraseña separada |

Copia `.env.local.example` → `.env.local` y define:

- `HEALTH_VAULT_PASSWORD` — entrada a Health Vault
- `HEALTH_VAULT_SECRET` — PIN para registros secretos
- `MATRIXTRADE_PASSWORD` — entrada a trading

## Funciones

- Registros por **fecha** (queja, incidente, comportamiento, correspondencia)
- **Personas** vinculadas
- **Evidencias** con texto + adjuntos (PDF, capturas, etc.)
- **Registros secretos** — ocultos hasta desbloquear con PIN

## Para IAs

Lee [`CONTEXTO-IA.md`](CONTEXTO-IA.md) y [`../CHATGPT.md`](../CHATGPT.md).

La app standalone en `health-vault/app/` quedó obsoleta — usar rutas `/health/*` en la app principal.
