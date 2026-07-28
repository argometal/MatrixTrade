# CHANGE 24-47 — ArgusForge consolidation, trimming, and alignment

**Status:** Pending (PR #113; validation pass **24-49**)  
**Branch:** `cursor/af03-consolidation-24-47-c2fb`

## Branch strategy

Integration from `main`, folding draft **#108** (24-2E images) and **#112** (24-39 Deck).  
**#110** Recent linkage remains separate (Argus-only).

After #113 merges: close #108 and #112 as superseded; rebase #110 onto main separately.

## Runtime truth (validated)

### Visible hierarchy

Persisted folders are the nested container type (UI: **Realm** at root, **Folder** when nested):

```text
Explorer
└── Realm (folder, parentId null)
    └── Folder (nested folder, optional)
        └── Chaos Deck
            └── Fragment
                └── Block
```

Breadcrumbs only show real ancestors from `folderBreadcrumb` + Deck + Fragment.  
**Viewer / Classic / Builder / Fullscreen are modes, not ancestors.**

### Mode graph (actual)

```text
Knowledge Explorer → Chaos Deck → Fragment
                         ↓
              Viewer ⇄ Classic ⇄ Builder   (same fragmentId)
Chaos Dumping / Deck capture:
  Classic capture box ⇄ Fullscreen overlay  (same draft; not a route)
```

There is **no** direct Explorer → Classic Fragment shortcut without opening the Deck/Fragment.  
Fullscreen is a **state of the capture composer** (Dumping or Deck), not of Classic editor.

### Capture

Both `/forge/chaos` and `/forge/deck/[deckId]` call `persistChaosDumpCapture`.  
Transactional: assets → Fragment + Blocks; failure keeps draft (caller); cleans partial assets.

### Deprecated / limited

| Action | Status |
|--------|--------|
| Add text / link / image URL (primary) | Removed — Classic Capture |
| Image URL records | Deprecated — still readable |
| File / PDF reference | Limited stubs (secondary) |
| Structured Fragment | Active (Builder) |

## Docs

- `capability-map.md`
- Handoff: **Pending** until merge + production verification
