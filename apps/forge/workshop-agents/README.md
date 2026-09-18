# Workshop local agents

Sources of truth for **ArgusForge `/forge/workshop`** until GitHub repos are populated.

| Agent | Folder | Default port |
|-------|--------|--------------|
| TBCompanion (TBC) | `TBCompanion/` | 4010 |
| Mouse Simulator | `MouseSimulator/` | 4011 |

## TBCompanion

Populated by `scripts/sync-workshop-agents-from-tools.ps1` from `C:\Tools\...\TBCompanion-delivery` (or your clone).

Includes **Forge CORS** on `server.js` so Workshop can call `/health`, `/api/run`, `/api/config` from localhost Forge.

## Mouse Simulator

Minimal Node agent in `MouseSimulator/` — extend or replace when the full MouseSimulator repo is synced from GitHub.

## Publish to GitHub

```powershell
cd C:\Tools\MatrixTrade
powershell -ExecutionPolicy Bypass -File scripts\sync-workshop-agents-from-tools.ps1
powershell -ExecutionPolicy Bypass -File scripts\sync-workshop-agents-to-github.ps1
```

Requires git remotes `argometal/TBCompanion` and `argometal/MouseSimulator`.
