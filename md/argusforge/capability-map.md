# ArgusForge capability map

**Status:** Living alignment doc (CHANGE 24-47 / 24-49)  
**Rule:** Draft/open PR → Pending · Merged+verified → Shipped · Supported but not promoted → Deprecated · Reference-only → Limited

| Capability | Visible surface | Canonical entity | Persistence | Status |
|------------|-----------------|------------------|-------------|--------|
| Classic Capture | Chaos Dumping · Chaos Deck | Fragment + Blocks | repo + IndexedDB assets | Pending (#113) |
| Structured Fragment | Builder | Fragment + Blocks | repo + assets | Active |
| Local image assets | Capture · Builder · Viewer | Block (image) | IndexedDB + asset meta | Pending (#113 / 24-2E) |
| Image URL | legacy body/viewer | reference string | repo | Deprecated |
| File reference | Deck secondary | stub Fragment | repo | Limited |
| PDF reference | Deck secondary | stub Fragment | repo | Limited |
| Fullscreen capture | Dump · Deck composer overlay | same draft state | React until Save | Active |
| Classic editor | `?legacy=1` | Fragment | repo | Active (mode) |
| Viewer | `/view` | Fragment | repo | Active (mode) |
| Knowledge Explorer | Home `/forge` | Realm · Folder · Deck · Fragment | repo | Active |
| Recent linkage | Argus Treemap | projection | graph + repo | Pending (#110 separate) |
| Vault preparation | `/forge/vault` | prep queue | vault localStorage | Active |

## Visible ontology (runtime)

```text
Realm (root folder)
└── Folder (nested folder, when present)
    └── Chaos Deck
        └── Fragment
            └── Block
```

Folders are real persisted `Af03Folder` records. Nested folders appear as Folder crumbs; root folders as Realm.

Avoid as competing primary entities: Note · Item · Content · Document · Collection · Section.

## Mode graph

```text
Explorer → Deck → Fragment modes: Viewer ⇄ Classic ⇄ Builder
Capture Fullscreen = overlay on Classic Capture draft (not a Fragment mode route)
```

## Capture invariant

Text + images = one logical capture. Report success only when assets, Fragment, Blocks, and references all persist.

## PR fold status

| PR | Role |
|----|------|
| #113 | Consolidation (24-47 + 24-49) — Pending |
| #108 | Folded into #113 — do not merge separately |
| #112 | Folded into #113 — do not merge separately |
| #110 | Separate Recent linkage — keep open |
