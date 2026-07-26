# CHANGE 24-27 — Realm molecular graph redesign

**Status:** Implemented  
**Route:** `/forge/realm/[realmId]`  
**Code:** `RealmDeckGraph.tsx`, `RealmDeckNode.tsx`, `ForgeExpandableSurface` (controlled expand)

## Goal

Cleaner mobile-first relational workspace. No architecture change, no React Flow replacement, no new engines / force physics / 3D / Alexandria.

## Delivered

1. **Compact header** — back, Realm title, metadata, overflow menu; compact `Local prototype · Details`
2. **Graph / List** segmented switch (same Deck data)
3. **Canvas-first** surface (~55–65dvh), fullscreen via `ForgeExpandableSurface`
4. **Nodes** — clamped diameter (~96–180px); title + fragment count + used label; no `m1.0` / `0f` / pulse
5. **Placement** — single node centered, MiniMap hidden, “No relations yet”; multi-node fitView + persisted positions
6. **Floating controls** — Controls / Search / Expand; + / Select / List; toggleable MiniMap
7. **Bottom sheets** — Controls · Filters · Legend; selection detail with Open / Connections / Move
8. **Focus mode** — dims non-neighborhood (filter only, not physics)
9. **Persistence** — node positions (`argusforge-realm-deck-layout-v1`) + graph prefs (`argusforge-realm-graph-prefs-v1`)

## Visual encoding

| Cue | Meaning |
|-----|---------|
| Green intensity | Recent use |
| Size | Mass |
| Purple edge | Relation |
| White ring | Selected |
| Dashed halo | Affinity (not confirmed edge) |
