# Health Vault — lee esto primero (IAs)

**Rama:** `cursor/health-vault-dbc8`  
**Repo:** `github.com/argometal/MatrixTrade` (privado)  
**Carpeta:** `health-vault/`  
**No confundir con:** MatrixTrade en `main` (trading H001–H030)

---

## Qué es esto

**Health Vault** es una **rama discreta** dentro del mismo repo de MatrixTrade.

No es trading. Es un espacio profesional para documentar temas laborales:

- Quejas e incidentes
- Comportamientos (correctos e incorrectos)
- Correos y correspondencia
- Personas involucradas (jefes, RH, testigos, compañeros)
- Evidencias que respalden cada hecho

> **Principio:** *Eres tan bueno como lo que puedes comprobar con evidencias.*

---

## Cómo funciona en la práctica (lo importante)

| Quién | Qué hace |
|-------|----------|
| **El usuario** | Mete cosas: archivos `.md`, textos, correos pegados, notas. Usa Cursor u otra IA para organizar y commitear en esta rama. |
| **MatrixTrade `main`** | Sigue siendo trading. Quien solo mire `main` no ve Health Vault. |
| **Esta rama** | Queda “escondida” a propósito. Es conveniente y profesional: un solo repo privado, dos mundos separados. |
| **La app en `health-vault/app/`** | Existe (Next.js + localStorage). Es **opcional**. Sirve si alguien la corre en PC. **No** es el flujo principal que el usuario describió. |

**No asumir** que el usuario quiere Vercel, deploy ni `npm run dev` en el iPhone. El flujo acordado es: **él mete contenido al repo en esta rama.**

---

## Estructura de carpetas

```text
health-vault/
├── CONTEXTO-IA.md          ← este archivo (handoff para IAs)
├── README.md               ← resumen corto
├── docs/                   ← el usuario mete aquí sus .md y explicaciones
│   ├── README.md           ← índice de documentos del usuario
│   └── historial-ia.md     ← qué hizo cada sesión de IA
├── app/                    ← app web opcional (no mezclar con trading)
└── lib/health-vault/       ← lógica localStorage de la app
```

---

## Historial de confusiones (para no repetirlas)

### Sesión 1 — Cursor Cloud Agent: “Network Vault”
- **Pedido mal interpretado:** CRM de networking (contactos, follow-ups).
- **Resultado:** Rama `cursor/network-vault-dbc8`, PR #1 en GitHub.
- **Estado:** **Incorrecto.** Ignorar para Health Vault.

### Sesión 2 — Usuario aclara el objetivo real
- **Objetivo real:** Bitácora laboral — quejas, evidencias, correos, relaciones.
- **Nombre final acordado:** **Health Vault** (no “Evidence Vault” al inicio).

### Sesión 3 — Errores del agente
1. Intentó meter Health Vault **dentro** de la app MatrixTrade en `/`.
2. Dio instrucciones de iPhone con `npm run dev` (imposible en el teléfono).
3. Dijo que estaba en GitHub cuando **solo existía en la máquina del agente**.
4. Intentó crear repo `HealthVault` separado — sin permisos.

### Sesión 4 — Solución acordada con el usuario
- Dejar Health Vault en **rama secreta** de MatrixTrade: `cursor/health-vault-dbc8`.
- Carpeta `health-vault/`. PR #2 (draft).
- El usuario **mete las cosas**; no hace falta app desplegada para el propósito principal.
- MatrixTrade en `main` **no se toca**.

---

## Qué hay construido (app opcional)

Si alguien corre la app en PC:

```bash
cd health-vault
npm install
npm run dev
```

| Ruta | Función |
|------|---------|
| `/` | Inicio — resumen |
| `/records` | Registros (queja, incidente, comportamiento, correspondencia) |
| `/records/new` | Crear registro |
| `/records/[id]` | Detalle + evidencias |
| `/records/[id]/evidence/new` | Pegar correo / nota / testigo |
| `/people` | Personas involucradas |

Datos en **localStorage** del navegador (`health-vault-data`). Seed con 3 personas, 3 registros, 4 evidencias de ejemplo.

---

## Reglas para IAs que entren después

1. **Leer** `health-vault/docs/` — ahí el usuario deja sus archivos y lo que otras IAs explicaron.
2. **No mezclar** con `main`, trades, Obsidian, bridge Cloudflare.
3. **No renombrar** a “Evidence Vault” ni revivir “Network Vault”.
4. **No mergear** a `main` sin que el usuario lo pida.
5. **Trabajar en** rama `cursor/health-vault-dbc8` o ramas hijas.
6. **Prioridad:** ayudar al usuario a **organizar y commitear** contenido en `docs/`, no over-engineer apps.
7. **Idioma:** el usuario escribe en español; documentación en español.

---

## Enlaces GitHub

| Qué | URL |
|-----|-----|
| Rama con Health Vault | `github.com/argometal/MatrixTrade/tree/cursor/health-vault-dbc8/health-vault` |
| PR (draft) | PR #2 — Health Vault |
| PR equivocado | PR #1 — Network Vault (ignorar) |
| MatrixTrade real | rama `main` |

---

## Próximos pasos típicos (cuando el usuario pida)

- Leer nuevos `.md` que el usuario agregue en `health-vault/docs/`
- Actualizar índice en `docs/README.md`
- Estructurar evidencias en markdown si no quiere usar la app
- **No** insistir con deploy iPhone salvo que lo pida explícitamente
