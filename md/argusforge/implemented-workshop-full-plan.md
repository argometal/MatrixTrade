# Workshop full plan — implemented

**Date:** 2026-09-16  
**Route:** `/forge/workshop`

## Delivered

### ArgusForge (control plane)

- **Toolbox:** full page/tile/macros editor, import/export, run URL in browser
- **Agent status:** polls TBC `GET /health` every 8s
- **Sync config → agent:** `POST /api/config` when agent online (same PC)
- **Run local tiles:** `POST /api/run` via CORS when agent online
- **Mouse:** profiles with steps (delay/move/click), export/import `mouse-profiles.json`, run via mouse agent
- **Local agents tab:** GitHub links + monorepo paths + sync scripts

### TBCompanion agent

- **Forge CORS** on localhost origins (`server.js` in delivery + `workshop-agents/TBCompanion`)
- Copied into `MatrixTrade/workshop-agents/TBCompanion/` (excludes `runtime/node`)

### Mouse Simulator agent

- New minimal agent: `workshop-agents/MouseSimulator/` port **4011**
- `POST /api/run-profile` + PowerShell mouse execution (Windows)

### Repo sync scripts

```powershell
# Refresh TBCompanion tree from C:\Tools\... delivery
powershell -ExecutionPolicy Bypass -File scripts/sync-workshop-agents-from-tools.ps1

# Push to github.com/argometal/TBCompanion + MouseSimulator
powershell -ExecutionPolicy Bypass -File scripts/sync-workshop-agents-to-github.ps1
```

## How to use (daily)

1. Start Forge → **Workshop**
2. Start TBC: `workshop-agents\TBCompanion\start-hidden.vbs` (or your installed copy)
3. Edit tiles → **Sync config → agent**
4. Optional: start Mouse agent `workshop-agents\MouseSimulator\start.bat`, export profiles from Forge

## Verify

```bash
npx tsx tools/test-workshop-forge.ts
npx tsx tools/test-runbook-091601-091602.ts
```

## Not in scope (later)

- Cloud-hosted agents (always local Windows)
- ARGUS org-level macro sync (still env `TBC_MACRO_*` on PC)
- Full TBC Configure UI parity inside Forge (use import/export or sync)
