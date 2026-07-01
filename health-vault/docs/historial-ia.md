# Historial de sesiones IA — Health Vault

Registro de lo que hicieron distintas IAs. Actualizar cuando haya sesiones nuevas.

---

## Sesión A — Cursor Cloud (Network Vault) ❌ Incorrecto

**Rama:** `cursor/network-vault-dbc8`  
**PR:** #1 en GitHub

**Qué pidió el usuario (mal pegado / mal interpretado):**  
Un CRM de networking personal (contactos, conversaciones, follow-ups).

**Qué se construyó:**  
App “Network Vault” con rutas `/contacts`, `/followups`, etc. dentro del repo MatrixTrade.

**Por qué está mal:**  
El usuario en realidad quería documentación laboral con evidencias, no networking.

**Acción:** Ignorar esa rama/PR para Health Vault.

---

## Sesión B — Cursor Cloud (Evidence / Health Vault) — correcciones

**Rama:** `cursor/evidence-vault-dbc8` (local, no pusheada)  
Luego renombrado a **Health Vault**.

**Qué aclaró el usuario:**  
- Quejas, evidencias, correos, relaciones laborales  
- “Eres tan bueno como lo que puedes comprobar con evidencias”  
- **No** es trading  
- Proyecto aparte

**Qué se hizo bien:**  
- App en carpeta `health-vault/` separada del código de trading  
- Modelo: registros, evidencias, personas  
- Seed de ejemplo en español  
- `npm run build` pasa

**Qué se hizo mal:**  
- Instrucciones de iPhone con `npm run dev` (no aplica en teléfono)  
- Dijo que estaba en GitHub cuando solo era local  
- Intentó repo `HealthVault` separado sin permisos  
- Confundió deploy web con el flujo real del usuario

---

## Sesión C — Usuario define el modelo correcto

**Frase clave del usuario:**  
> “Que sea una rama secreta de MatrixTrade así puedo enviar cosas ahí y seguirá escondido — es profesional.”

**Entendimiento correcto:**

| MatrixTrade `main` | Health Vault rama |
|--------------------|-------------------|
| Trading, H001–H030 | Temas laborales |
| Visible como proyecto principal | Discreto, misma cuenta GitHub privada |
| Obsidian, bridge, trades | El usuario **mete** archivos y contenido |

**No es prioritario:** Vercel, app en Safari, PWA.

**Sí es prioritario:** Rama `cursor/health-vault-dbc8`, carpeta `health-vault/docs/` para que el usuario documente.

---

## Sesión D — Publicación en GitHub

**Commit:** `6e4ad8c` — `Add Health Vault as separate app in health-vault/`  
**Rama pusheada:** `cursor/health-vault-dbc8`  
**PR:** #2 (draft)

**Ubicación:**  
`github.com/argometal/MatrixTrade/tree/cursor/health-vault-dbc8/health-vault`

MatrixTrade en `main` sin cambios de Health Vault.

---

## Sesión E — Documentación para IAs (esta actualización)

**Pedido:**  
> “Que yo meta cosas. Encontrarás archivos .md… explica todo ahí, dale update.”

**Hecho:**  
- `CONTEXTO-IA.md` — handoff maestro  
- `docs/README.md` — dónde el usuario mete contenido  
- `docs/historial-ia.md` — este archivo  
- `README.md` actualizado

**Pendiente:**  
El usuario irá agregando `.md` en `docs/` con hechos reales y explicaciones de otras IAs. Las próximas sesiones deben leerlos y actualizar el índice.

---

## Cómo actualizar este archivo

Al final de cada sesión con IA, agregar una sección:

```markdown
## Sesión X — [fecha o agente]

**Pedido:** ...
**Hecho:** ...
**Errores a no repetir:** ...
```
