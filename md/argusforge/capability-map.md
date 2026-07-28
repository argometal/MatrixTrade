# ArgusForge capability map

**Status:** Living alignment doc (CHANGE 24-47)  
**Rule:** Draft/open PR → Pending · Merged+verified → Shipped · Supported but not promoted → Deprecated · Reference-only → Limited

| Capability | Visible surface | Canonical entity | Persistence | Status |
|------------|-----------------|------------------|-------------|--------|
| Classic Capture | Chaos Dumping · Chaos Deck | Fragment + Blocks | repo + IndexedDB assets | Pending (24-47 / 24-2E / 24-39) |
| Structured Fragment | Builder | Fragment + Blocks | repo + assets | Active |
| Local image assets | Capture · Builder · Viewer | Block (image) | IndexedDB + asset meta | Pending (24-2E in 24-47) |
| Image URL | legacy viewers | reference in body | repo | Deprecated |
| File reference | Deck secondary | stub Fragment | repo | Limited |
| PDF reference | Deck secondary | stub Fragment | repo | Limited |
| Fullscreen editor | Dump · Deck capture | same draft | React state until Save | Active |
| Knowledge Explorer | Home `/forge` | Realm · Deck · Fragment | repo | Active |
| Classic editor | `?legacy=1` | Fragment | repo | Active (mode) |
| Viewer | `/view` | Fragment | repo | Active (mode) |
| Recent linkage | Argus Treemap | projection | graph + repo | Pending (#110) |
| Vault preparation | `/forge/vault` | prep queue | vault localStorage | Active |

## Visible ontology

```text
Realm
└── Folder
    └── Chaos Deck
        └── Fragment
            └── Block
```

Avoid as competing primary entities: Note · Item · Content · Document · Collection · Section.

## Capture invariant

Text + images = one logical capture. Report success only when assets, Fragment, Blocks, and references all persist.
