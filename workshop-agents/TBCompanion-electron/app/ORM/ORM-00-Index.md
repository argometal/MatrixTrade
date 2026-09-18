# ORM-00 — Índice (Toolbox Companion)

**Estilo Alexandria:** verdad operativa para **config**, **SQLite de errores**, **Electron portable** y **API** del servidor local.

## Arranque (prioridad)

| Modo | Cómo |
|------|------|
| **Producción restrictiva** | `npm run build:portable` → `dist-build\TBCompanion-*-win-portable.exe` — doble clic, sin `.bat` / `.vbs` / `cmd` en runtime. Shell: `main.cjs` + `electron`. |
| **Desarrollo** | `npm start` (Electron) o `npm run server` (`node server.cjs`). |
| **ZIP + Node portable** | `npm run pack` / `pack:full` — incluye `lib/` (registro + SQLite), `packaging/`, `ENTREGA-EXE.txt`, `REGISTRO-Y-DIAGNOSTICO.txt` (generado al empaquetar); si existe `dist-build\TBCompanion-*-win-portable.exe`, se mete en el ZIP. |

## Datos

| Recurso | Rol |
|---------|-----|
| `tbc.config.json` | Tiles, páginas, macros, `port` — en Electron bajo `%AppData%\…\tb-companion\` (`TBC_DATA_ROOT`). |
| `data/tbc.db` | `error_log` (SQLite `node:sqlite`); ver `lib/db.js` |
| `logs/tb-companion.log` | Registro texto; `initLog(APP_ROOT)` en `server.cjs`. Fallback `%TEMP%\tb-companion.log`. |
| `packaging/default-tbc.config.json` | Plantilla si no existe config en datos (primera ejecución). |

## Código servidor

| Archivo | Rol |
|---------|-----|
| `main.cjs` | Electron: fija `TBC_DATA_ROOT`, `TBC_PUBLIC`, `TBC_DEFAULT_CONFIG`, `TBC_EXE_DIR`, `TBC_ELECTRON`; `require('./server.cjs').start`. |
| `server.cjs` | HTTP, `spawn(explorer.exe)` para abrir targets, persistencia config, `module.exports.start`. |
| `server.js` | Entrada fina: `require('./server.cjs').start` (compatibilidad con `node server.js`). |
| `lib/validate-config.js` | Validación de JSON de config |
| `lib/db.js` | SQLite; `TBC_DATA_ROOT`; `logError` duplica en `lib/app-log.js` |
| `lib/app-log.js` | Archivo de registro |

## UI estática

`public/` — empaquetada junto al servidor (ruta vía `TBC_PUBLIC` en Electron).

## API (resumen)

`GET/POST /api/config`, `POST /api/run`, `GET /api/run`, launcher, `/health`, `GET /api/diagnostic`, `GET /api/errors`, etc. (detalle en `server.cjs` y `README.md`).

## Historial

| Versión | Nota |
|---------|------|
| 1.0 | Creación ORM-00. |
| 1.1 | Electron portable (patrón sl-mouse-sim); datos en userData; `TBC_EXE_DIR` para macro `TBC_ROOT`. |
