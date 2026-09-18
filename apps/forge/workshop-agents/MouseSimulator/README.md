# Mouse Simulator agent

Local HTTP server for ArgusForge **Workshop → Mouse** tab.

1. Export `mouse-profiles.json` from Forge (or edit the copy in this folder).
2. Run `start.bat` (port **4011**, override with `MOUSE_SIM_PORT`).
3. In Forge, **Run on agent** calls `POST /api/run-profile`.

Windows only (PowerShell + user32 mouse events).
