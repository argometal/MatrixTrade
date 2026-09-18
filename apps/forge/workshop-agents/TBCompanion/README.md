# TBC — Toolbox Companion

Tile-based launcher for portals, apps, folders, and multi-step actions. Runs independently of Bridge.

## Start

**Persistent server process** = `node server.js` (keeps running until you close it or log off, unless you install it as a service).

| File | Role |
|------|------|
| **`start.bat`** | Uses **`runtime\node\node.exe`** if present, else Node on **PATH**. **No PowerShell.** Shows a console (dev). |
| **`start-hidden.vbs`** | Same server, **no console** — prefers **`runtime\node\node.exe`**, then `C:\Tools\node\node.exe`, then `node` on PATH. |

### Portable Node.js (in this folder)

TBC ships with **`runtime/`** so you do not rely on a machine-wide Node install:

- **`runtime/node/node.exe`** — Windows x64 Node (plus DLLs). Created by:
  - **`runtime/install-node.bat`** (one-time; downloads a pinned version), or
  - manual unzip from [nodejs.org](https://nodejs.org) into **`runtime/node/`** (see **`runtime/README.txt`**).
- Copy the whole **TBCompanion** tree to another PC; **`runtime/node`** goes with it.

```bat
cd C:\Tools\TBCompanion
start.bat
```

Or from the folder: **`runtime\node\node.exe` server.js** (default port **4010**).

Open **http://127.0.0.1:4010** in the browser (from another PC on the LAN, use that machine’s IP and port 4010).

### Portable on any PC (macros and paths)

- **`TBC_ROOT`** in `tbc.config.json` is **overwritten at runtime** with the real install folder (`server.js` root), so the “TBC folder” tile always opens the copy you are running.
- **Per-machine paths** (e.g. `STARTUP_TOOLS`, `WELL_ROOT`) without editing JSON: set environment variables **`TBC_MACRO_<NAME>`** to the path string, e.g. `TBC_MACRO_STARTUP_TOOLS=D:\Startup_tools` (same names as keys under `macros` in JSON). Env wins over file values.
- **Port:** `TBC_PORT=4020` (or edit `port` in `tbc.config.json`).

### Start without a console window

Double-click **`start-hidden.vbs`**. After a couple of seconds it **opens the companion in your default browser** at `http://127.0.0.1:<port>/` (port from **`TBC_PORT`** or **`tbc.config.json`**, default **4010**). For auto-start at logon, Task Scheduler → action: `wscript.exe` with argument `C:\...\TBCompanion\start-hidden.vbs`.

## Persistence

- **Tiles and layout**: editable file **`tbc.config.json`** (no separate DB for tiles).
- **Error log (SQLite)**: **`data/tbc.db`** — server-side failures, bad runs, and startup issues with short **`code`** values for offline review on machines without dev tools. Read via **`GET /api/errors?limit=100`** or copy the DB file. **`GET /health`** returns **`sqliteDb`** path.

## Deploy to `C:\TBCompanion` (SLB)

1. Copy the whole `TBCompanion` folder to `C:\TBCompanion` (include **`runtime/node`** for a self-contained Node, or run **`runtime/install-node.bat`** once on that machine).
2. Edit **`tbc.config.json`** → **`macros`**:
   - **`STARTUP_TOOLS`**: usually `C:\Startup_tools` (not the dev path).
   - **`TBC_ROOT`**: `C:\TBCompanion`.
   - Set **`WELL_ROOT`**, **`SAC_ROOT`**, **`LOCI_ROOT`** to real paths on the machine.
3. **`start.bat`** and **`start-hidden.vbs`** use the folder they live in (`%~dp0`); no path edits needed when you move the tree.

## Configuration

- **In the app:** click **Configure** to edit pages, tiles, path macros, and app name. Changes are written to **`tbc.config.json`** on the machine where TBC runs.
- **Saving** is allowed only from **127.0.0.1** (the PC running the server). Remote browsers can use the launcher UI but cannot save config.
- **Advanced:** you can still edit **`tbc.config.json`** by hand if needed.
- **`macros`**: `{{NAME}}` in targets is replaced from the macro table.

## API

- `GET /api/config` — full config (for the UI).
- `POST /api/config` — save config (same JSON shape). Allowed from **127.0.0.1** only.
- `POST /api/run` — body `{ "id": "<tile id>" }` — runs the tile on the **server** (opens URLs in the default browser; launches apps/paths with `start`).
- `GET /api/run?id=<tile id>` — same as `POST /api/run` (for clients that only support GET).
- `GET /api/launcher` — JSON manifest: base URL, every tile with `runUrlGet` / `runPostBody`, and **`launcherGrid`** (`columns`, `rows`, `cells` with `tileId` or `null`). If **`launcherGrid`** is omitted from **`tbc.config.json`**, the server builds a default 5-column grid from all tiles in page order (auto layout).
- `POST /api/launcher/run` — body `{ "slot": <n> }` — runs the tile at that slot in the companion grid (same layout as **`GET /api/launcher`** → `launcherGrid`).
- `POST /launcher-open` — alias of **`/api/launcher/run`** (same JSON body).
- `GET /launcher` — browser preview page for the grid. **`GET /streamdeck`** redirects here; **`GET /api/streamdeck`** still returns the same manifest for older integrations.
- `GET /api/errors?limit=100` — recent rows from **`error_log`** (JSON) for support / debugging.
- `GET /health` — includes **`sqliteDb`** path.

### Companion grid (HTTP / hotkeys)

1. Keep **TBC** running on the PC (`start.bat` or `start-hidden.vbs`).
2. Optional: set **`launcherGrid`** in **`tbc.config.json`** (`columns`, `rows`, `cells` with `{ "tileId": "<id>" }` or `null`). If omitted, the server fills a default grid from tiles in page order.
3. Call **`GET http://127.0.0.1:4010/api/run?id=<tile_id>`** or **`POST /api/run`** with `{"id":"<tile_id>"}`. For **slot** buttons matching the preview on **`/launcher`**, **`POST /api/launcher/run`** or **`POST /launcher-open`** with `{"slot":0}` (0-based index).

## Updates

There is no built-in auto-updater yet. A practical pattern: ship a zip or git checkout; after user approval, replace the folder (keep **`tbc.config.json`** and **`data/`**) and restart. A future step could be a small “check version → download → replace → restart” helper signed for your environment.

## Bridge

Optional: Bridge can link to `http://127.0.0.1:4010`; TBC does not require Bridge.
