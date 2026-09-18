# Workshop — TBC + Mouse Simulator in ArgusForge

**Status:** Phases 1–3 scaffold **shipped** — see [implemented-workshop-full-plan.md](implemented-workshop-full-plan.md)  
**Route:** `/forge/workshop`

## Intent

Host **Toolbox Companion (TBC)** and **Mouse Simulator** inside ArgusForge with a **realistic split**:

| Layer | Where | What |
|-------|--------|------|
| **Control plane** | ArgusForge (online / browser) | Pages, tiles, macros template, mouse profiles, export/import |
| **Execution plane** | Windows agents (download) | Launch apps, folders, multi-step, mouse automation |

ArgusForge does **not** spawn `cmd.exe` on Vercel. Local agents do.

## Product placement

```text
ArgusForge
├── Explorer / Chaos / Vault  (existing)
└── Workshop                  ← TBC UI + Mouse config + Agent downloads
```

Workshop config is **local-first** (`localStorage` in Forge) with **TBC-compatible JSON** export (`tbc.config.json` shape) so the existing TBCompanion agent can consume it without rewrite.

## Phases

### Phase 1 (shipped scaffold)

- `/forge/workshop` with **Toolbox | Mouse | Local agents** tabs
- Import / export `tbc.config.json`
- URL tiles run in the browser; local tiles labeled **Requires agent**
- Agent tab: instructions + links to portable packages (TBCompanion zip, Mouse Simulator when repo available)

### Phase 2

- TBC agent: CORS + `GET /health` from Forge origin; optional **pairing token** and pull config from export URL
- Forge shows **Agent online** when `127.0.0.1:4010` responds
- **Run on PC** calls `GET /api/run?id=` via hidden iframe or agent WebSocket

### Phase 3

- Mouse Simulator profiles stored in Workshop; agent executes scripts
- Optional sync to ARGUS org (macros per machine via env `TBC_MACRO_*`)

## Security

- Never expose unauthenticated remote run endpoints on the public internet
- Pairing: one-time code, localhost-only execution, same LAN optional later

## Files (Phase 1)

- `apps/forge/lib/workshop/*` — types, store, run helpers
- `apps/forge/app/forge/workshop/*` — UI
