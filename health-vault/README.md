# Health Vault

Bitácora laboral privada — integrada en MatrixTrade (ruta `/health/*`).

## Uso rápido (inbox)

1. Abre `/health`
2. Escribe qué pasó
3. Opcional: tipo, fecha, persona, adjunto, secreto
4. **Guardar** — menos de 60 segundos

Campos: fecha, título (auto si vacío), tipo, persona, texto, adjunto, secreto.

## Acceso

| | |
|---|---|
| URL | `http://localhost:3000/health/login` |
| Usuario | Vic (único usuario) |
| Autenticación | Código TOTP de 6 dígitos (Google Authenticator, etc.) |
| Datos | `data/health-vault/` (gitignored, solo en tu PC) |
| Trading | `/login` — contraseña separada (`MATRIXTRADE_PASSWORD`) |

Copia `.env.local.example` → `.env.local` y define:

- `HEALTH_VAULT_TOTP_SECRET` — **obligatorio** (secreto base32 del Authenticator)
- `HEALTH_VAULT_RECOVERY_EMAIL_PRIMARY` — recuperación (solo referencia, sin envío aún)
- `HEALTH_VAULT_RECOVERY_EMAIL_SECONDARY` — recuperación secundaria
- `HEALTH_VAULT_SECRET` — opcional: PIN alternativo para desbloquear registros secretos
- `MATRIXTRADE_PASSWORD` — **obligatorio** para trading

Si falta `HEALTH_VAULT_TOTP_SECRET`, el login **falla** y se muestra error de configuración.

### Generar TOTP secret

```bash
npx otplib secret
```

Añade el secreto a `.env.local` y escanea el QR en tu app Authenticator (cuenta manual: Health Vault / Vic).

## Seguridad

- **Fail closed** si falta `HEALTH_VAULT_TOTP_SECRET`
- Máximo **5 intentos** fallidos → bloqueo **15 minutos**
- Cookies `hv-auth` / `hv-secret`: httpOnly, sameSite=lax, secure en producción, firmadas HMAC
- Sesión Health: **7 días** · desbloqueo secretos: **60 minutos**
- Registros secretos: requiere TOTP de nuevo o `HEALTH_VAULT_SECRET` si está configurado
- Adjuntos de registros secretos: requieren `hv-auth` **y** `hv-secret`

### Recuperación (placeholder)

Correos configurados para futura recuperación (sin envío implementado):

- `HEALTH_VAULT_RECOVERY_EMAIL_PRIMARY` (default: argometal@hotmail.com)
- `HEALTH_VAULT_RECOVERY_EMAIL_SECONDARY` (default: argometal@gmail.com)

## Almacenamiento local — advertencia

**El disco local es solo para pruebas en tu PC.**

Los datos viven en `data/health-vault/` (JSON + adjuntos). Eso es adecuado para desarrollo local.

> **No despliegues Health Vault en Vercel (ni otro hosting público) con datos laborales reales y confidenciales** hasta migrar a Supabase/Postgres + Storage. Un deploy remoto con almacenamiento en disco del servidor no es seguro ni persistente para información sensible.

## Funciones

- Registros por **fecha** (queja, incidente, comportamiento, correspondencia)
- **Personas** vinculadas
- **Evidencias** con texto + adjuntos (PDF, capturas, etc.)
- **Registros secretos** — ocultos hasta desbloquear

## Para IAs

Lee [`CONTEXTO-IA.md`](CONTEXTO-IA.md) y [`../CHATGPT.md`](../CHATGPT.md).

La app standalone en `health-vault/app/` quedó obsoleta — usar rutas `/health/*` en la app principal.
