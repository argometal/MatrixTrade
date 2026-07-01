# Health Vault

Bitácora laboral privada — integrada en MatrixTrade (ruta `/health/*`).

## Acceso

| | |
|---|---|
| URL | `http://localhost:3000/health/login` |
| Datos | `data/health-vault/` (gitignored, solo en tu PC) |
| Trading | `/login` — contraseña separada (`MATRIXTRADE_PASSWORD`) |

Copia `.env.local.example` → `.env.local` y define:

- `HEALTH_VAULT_PASSWORD` — **obligatorio** para entrar a Health Vault
- `HEALTH_VAULT_SECRET` — PIN para registros secretos (opcional)
- `MATRIXTRADE_PASSWORD` — **obligatorio** para trading

Si falta `HEALTH_VAULT_PASSWORD` o `MATRIXTRADE_PASSWORD`, el login **falla** y se muestra un error de configuración. No hay acceso anónimo.

Las cookies de sesión (`hv-auth`, `hv-secret`, `mt-auth`) están firmadas con HMAC-SHA256 (no valores planos).

## Almacenamiento local — advertencia

**El disco local es solo para pruebas en tu PC.**

Los datos viven en `data/health-vault/` (JSON + adjuntos). Eso es adecuado para desarrollo local.

> **No despliegues Health Vault en Vercel (ni otro hosting público) con datos laborales reales y confidenciales** hasta migrar a Supabase/Postgres + Storage. Un deploy remoto con almacenamiento en disco del servidor no es seguro ni persistente para información sensible.

## Funciones

- Registros por **fecha** (queja, incidente, comportamiento, correspondencia)
- **Personas** vinculadas
- **Evidencias** con texto + adjuntos (PDF, capturas, etc.)
- **Registros secretos** — ocultos hasta desbloquear con PIN; los adjuntos de registros secretos requieren `hv-auth` **y** `hv-secret`

## Seguridad

- Login fail-closed si faltan variables de entorno
- Descarga de adjuntos: 401 sin sesión Health; 403 si el registro es secreto y no hay desbloqueo
- Sin enlaces a Health Vault en la UI de trading (`/login`)

## Para IAs

Lee [`CONTEXTO-IA.md`](CONTEXTO-IA.md) y [`../CHATGPT.md`](../CHATGPT.md).

La app standalone en `health-vault/app/` quedó obsoleta — usar rutas `/health/*` en la app principal.
